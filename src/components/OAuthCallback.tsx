import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    console.log('OAuth callback:', { hasCode: !!code, error })

    // Send message to parent window
    if (window.opener && 'postMessage' in window.opener) {
      const message = {
        type: 'oauth_callback',
        code,
        error: error || errorDescription,
      }

      const opener = window.opener as Window
      opener.postMessage(message, window.location.origin)
      window.close()
    } else {
      // Fallback if not in popup
      console.error('OAuth callback: No parent window found')
      window.location.href = '/'
    }
  }, [searchParams])

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
