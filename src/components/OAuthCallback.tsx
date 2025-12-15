import { useEffect } from 'react'

import { useSearch } from '@/lib/router'

const hasPostMessage = (
  target: unknown
): target is Window & { postMessage: typeof window.postMessage } => {
  if (!target || typeof target !== 'object') {
    return false
  }

  return (
    'postMessage' in target &&
    typeof (target as Window).postMessage === 'function'
  )
}

const OAuthCallback: React.FC = () => {
  const search = useSearch()

  useEffect(() => {
    const code = search.code
    const error = search.error
    const errorDescription = search.error_description

    // Send message to parent window
    if (hasPostMessage(window.opener)) {
      const message = {
        type: 'oauth_callback',
        code,
        error: error || errorDescription,
      }

      window.opener.postMessage(message, window.location.origin)
      window.close()
    } else {
      // Fallback if not in popup
      console.error('OAuth callback: No parent window found')
      window.location.href = '/'
    }
  }, [search])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">
          Processing OAuth login...
        </h2>
        <p className="text-sm text-muted-foreground">
          This window will close automatically.
        </p>
      </div>
    </div>
  )
}

export default OAuthCallback
