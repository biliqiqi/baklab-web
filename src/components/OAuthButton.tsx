import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { postOAuthAuthorize, postOAuthCallback } from '@/api'
import { OAUTH_PROVIDER, OAuthProvider } from '@/types/types'
import { useAuthedUserStore } from '@/state/global'

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
  const updateAuthState = useAuthedUserStore((state) => state.update)
  const { t } = useTranslation()

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

      // Listen for OAuth callback
      const handleMessage = (event: MessageEvent) => {
        // Verify origin for security
        if (event.origin !== window.location.origin) return

        const { type, code, error } = event.data as {
          type?: string
          code?: string
          error?: string
        }

        if (type === 'oauth_callback') {
          popup.close()
          window.removeEventListener('message', handleMessage)

          if (error) {
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
                  : 'OAuth login failed'
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

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', handleMessage)
          setLoading(false)
        }
      }, 1000)

    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'OAuth initialization failed'
      onError?.(errorMessage)
      setLoading(false)
    }
  }

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
        t('continueWith', { provider: getProviderName(provider) })
      )}
    </Button>
  )
}

export default OAuthButton