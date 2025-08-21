import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { postOAuthAuthorize, postOAuthCallback } from '@/api'
import { OAUTH_PROVIDER, OAuthProvider } from '@/types/types'
import { useAuthedUserStore } from '@/state/global'
import { useTheme } from './theme-provider'

import { Button } from './ui/button'

interface OAuthButtonProps {
  provider: OAuthProvider
  onSuccess?: () => void
  onError?: (error: string) => void
  onUsernameRequired?: (email: string, provider: OAuthProvider, suggestedName: string) => void
  disabled?: boolean
}

export const OAuthButton: React.FC<OAuthButtonProps> = ({
  provider,
  onSuccess,
  onError,
  onUsernameRequired,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const updateAuthState = useAuthedUserStore((state) => state.update)
  const { t } = useTranslation()
  const { theme } = useTheme()

  // Check current actual theme (considering system preference)
  useEffect(() => {
    const checkTheme = () => {
      if (theme === 'system') {
        setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
      } else {
        setIsDark(theme === 'dark')
      }
    }

    checkTheme()
    
    // Listen for system theme changes when using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', checkTheme)
      return () => mediaQuery.removeEventListener('change', checkTheme)
    }
  }, [theme])

  const getProviderName = (provider: OAuthProvider) => {
    switch (provider) {
      case OAUTH_PROVIDER.GOOGLE:
        return 'Google'
      case OAUTH_PROVIDER.GITHUB:
        return 'GitHub'
      default:
        return provider
    }
  }

  const getProviderIcon = (provider: OAuthProvider) => {
    switch (provider) {
      case OAUTH_PROVIDER.GOOGLE:
        return '/google.webp'
      case OAUTH_PROVIDER.GITHUB:
        return isDark ? '/github-mark-white.png' : '/github-mark.png'
      default:
        return null
    }
  }

  const handleOAuthLogin = async () => {
    if (loading || disabled) return

    setLoading(true)
    try {
      // Get authorization URL
      const authResponse = await postOAuthAuthorize(provider)
      if (!authResponse.data.authUrl) {
        throw new Error('Failed to get authorization URL')
      }

      // Create popup window for OAuth flow
      const popup = window.open(
        authResponse.data.authUrl,
        'oauth_popup',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      // Track if OAuth flow completed successfully
      let oauthCompleted = false

      // Listen for OAuth callback
      const handleMessage = (event: MessageEvent) => {
        // Verify origin for security
        if (event.origin !== window.location.origin) {
          console.warn('OAuth message from different origin:', event.origin)
          return
        }

        const { type, code, error } = event.data as {
          type?: string
          code?: string
          error?: string
        }

        if (type === 'oauth_callback') {
          console.log('OAuth callback received:', { hasCode: !!code, error })
          oauthCompleted = true // Mark as completed
          popup.close()
          window.removeEventListener('message', handleMessage)

          if (error) {
            console.error('OAuth error:', error)
            toast.error(error)
            onError?.(error)
            setLoading(false)
            return
          }

          if (code) {
            void (async () => {
              try {
                // Exchange code for user data
                const callbackResponse = await postOAuthCallback(provider, code)
                
                if (callbackResponse.data) {
                  const { needsUsername, email, provider: oauthProvider, suggestedName } = callbackResponse.data
                  
                  if (needsUsername) {
                    // User needs to set username
                    onUsernameRequired?.(email, oauthProvider, suggestedName)
                  } else {
                    // Regular login flow
                    const { token, userID, username, user } = callbackResponse.data
                    updateAuthState(token, username, userID, user)
                    onSuccess?.()
                  }
                }
              } catch (callbackError: unknown) {
                const errorMessage = callbackError instanceof Error 
                  ? callbackError.message 
                  : t('oauthLoginFailed')
                console.error('OAuth callback error:', callbackError)
                toast.error(errorMessage)
                onError?.(errorMessage)
              }
              setLoading(false)
            })()
          } else {
            setLoading(false)
          }
        }
      }

      window.addEventListener('message', handleMessage)

      // Check if popup was closed manually (not by OAuth completion)
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', handleMessage)
          
          // Only show cancellation message if OAuth didn't complete successfully
          if (!oauthCompleted) {
            console.log('Popup closed without OAuth completion')
            setLoading(false)
            toast.info(t('oauthCancelled'))
          }
        }
      }, 1000)

    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : t('oauthLoginFailed')
      toast.error(errorMessage)
      onError?.(errorMessage)
      setLoading(false)
    }
  }

  const providerIcon = getProviderIcon(provider)

  return (
    <Button
      variant="outline"
      onClick={handleOAuthLogin}
      disabled={loading || disabled}
      className="w-full"
    >
      {loading ? (
        t('loading')
      ) : (
        <div className="flex items-center justify-center gap-2">
          {providerIcon && (
            <img 
              src={providerIcon} 
              alt={`${getProviderName(provider)} icon`}
              className="w-5 h-5"
            />
          )}
          <span>{t('continueWith', { provider: getProviderName(provider) })}</span>
        </div>
      )}
    </Button>
  )
}

export default OAuthButton