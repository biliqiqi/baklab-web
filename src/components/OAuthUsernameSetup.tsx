import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { postOAuthCompleteRegistration } from '@/api'
import { OAuthProvider } from '@/types/types'
import { useAuthedUserStore } from '@/state/global'

import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'

interface OAuthUsernameSetupProps {
  email: string
  provider: OAuthProvider
  suggestedName: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export const OAuthUsernameSetup: React.FC<OAuthUsernameSetupProps> = ({
  email,
  provider,
  suggestedName,
  onSuccess,
  onError,
}) => {
  const [username, setUsername] = useState(suggestedName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const updateAuthState = useAuthedUserStore((state) => state.update)
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim()) {
      setError(t('inputTip', { field: t('username') }))
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await postOAuthCompleteRegistration(provider, email, username.trim())

      if (response.data) {
        const { token, userID, username: finalUsername, user } = response.data
        updateAuthState(token, finalUsername, userID, user)
        onSuccess?.()
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Registration failed'
      // setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getProviderName = (provider: OAuthProvider) => {
    switch (provider) {
      case 'google':
        return 'Google'
      case 'github':
        return 'GitHub'
      default:
        return provider
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">
          {t('continueWith', { provider: getProviderName(provider) })}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('email')}: {email}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('settingTip', { name: t('username') })}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">{t('username')}</Label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('inputTip', { field: t('username') })}
            disabled={loading}
            autoFocus
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !username.trim()}
        >
          {loading ? t('loading') : t('confirm')}
        </Button>
      </form>
    </div>
  )
}

export default OAuthUsernameSetup
