import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import SigninForm from './components/SigninForm'

import SITE_LOGO_IMAGE from './assets/logo.png'
import { PLATFORM_NAME, SIGNIN_RETURN_SESSION_KEY } from './constants/constants'
import useDocumentTitle from './hooks/use-page-title'
import { isInnerURL } from './lib/utils'
import { useAuthedUserStore } from './state/global'

export default function SigninPage() {
  const [searchParams, _setSearchParams] = useSearchParams()
  const returnURL = searchParams.get('return')
  const isPopup = searchParams.get('popup') === '1' || Boolean(window.opener)

  const navigate = useNavigate()
  const isLogined = useAuthedUserStore((state) => state.isLogined())

  const { t } = useTranslation()

  const setSessionReturnUrl = useCallback((url?: string | null) => {
    if (url && isInnerURL(url)) {
      sessionStorage.setItem(SIGNIN_RETURN_SESSION_KEY, url)
    }
  }, [])

  const consumeSessionReturnUrl = useCallback(() => {
    const url = sessionStorage.getItem(SIGNIN_RETURN_SESSION_KEY)
    if (url && isInnerURL(url)) {
      sessionStorage.removeItem(SIGNIN_RETURN_SESSION_KEY)
      return url
    }
    return null
  }, [])

  const onSiginSuccess = useCallback(() => {
    const storedReturn = consumeSessionReturnUrl()

    const openerWindow = window.opener as Window | null

    if (isPopup && openerWindow) {
      openerWindow.postMessage(
        { type: 'baklab_signin_success', source: window.location.origin },
        '*'
      )
      window.close()
      return
    }

    if (storedReturn) {
      location.href = storedReturn
      return
    }

    if (returnURL && isInnerURL(returnURL)) {
      location.href = returnURL
    } else {
      navigate('/', { replace: true })
    }
  }, [consumeSessionReturnUrl, isPopup, navigate, returnURL])

  useDocumentTitle(t('signin'))

  // Redirect to home page if user is already logged in
  useEffect(() => {
    setSessionReturnUrl(returnURL)

    if (isLogined) {
      const openerWindow = window.opener as Window | null
      if (isPopup && openerWindow) {
        openerWindow.postMessage(
          { type: 'baklab_signin_success', source: window.location.origin },
          '*'
        )
        window.close()
        return
      }

      const storedReturn = consumeSessionReturnUrl()
      if (storedReturn) {
        location.href = storedReturn
      } else if (returnURL && isInnerURL(returnURL)) {
        location.href = returnURL
      } else {
        navigate('/', { replace: true })
      }
    }
  }, [
    isLogined,
    isPopup,
    returnURL,
    navigate,
    setSessionReturnUrl,
    consumeSessionReturnUrl,
  ])

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6">
      <div className="flex justify-center py-8">
        <Link
          to="/"
          className="flex items-center gap-2 text-xl font-bold text-primary"
        >
          <img
            src={SITE_LOGO_IMAGE}
            alt={PLATFORM_NAME}
            className="h-9 w-9 overflow-hidden rounded-full"
          />
          <span>{PLATFORM_NAME}</span>
        </Link>
      </div>
      <SigninForm onSuccess={onSiginSuccess} />
    </div>
  )
}
