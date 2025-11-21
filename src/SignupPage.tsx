import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import SignupForm from './components/SignupForm'

import SITE_LOGO_IMAGE from './assets/logo.png'
import {
  PLATFORM_NAME,
  SIGNIN_RETURN_SESSION_KEY,
  SINGUP_RETURN_COOKIE_NAME,
} from './constants/constants'
import useDocumentTitle from './hooks/use-page-title'
import { deleteCookie, getCookie, isInnerURL } from './lib/utils'

export default function SignupPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const returnURL = searchParams.get('return')
  const isPopup = searchParams.get('popup') === '1' || Boolean(window.opener)

  useDocumentTitle(t('signup'))

  const onSignupSuccess = useCallback(() => {
    const sessionReturn = sessionStorage.getItem(SIGNIN_RETURN_SESSION_KEY)
    const returnUrl = decodeURIComponent(
      getCookie(SINGUP_RETURN_COOKIE_NAME) || ''
    )

    if (isPopup && window.opener) {
      window.opener.postMessage(
        { type: 'baklab_signin_success', source: window.location.origin },
        '*'
      )
      sessionStorage.removeItem(SIGNIN_RETURN_SESSION_KEY)
      deleteCookie(SINGUP_RETURN_COOKIE_NAME)
      window.close()
      return
    }

    if (sessionReturn && isInnerURL(sessionReturn)) {
      sessionStorage.removeItem(SIGNIN_RETURN_SESSION_KEY)
      location.href = sessionReturn
      deleteCookie(SINGUP_RETURN_COOKIE_NAME)
      return
    }

    if (returnUrl && returnUrl.trim() && isInnerURL(returnUrl)) {
      location.href = returnUrl
      deleteCookie(SINGUP_RETURN_COOKIE_NAME)
    } else {
      navigate('/')
    }
  }, [isPopup, navigate])

  useEffect(() => {
    if (returnURL && isInnerURL(returnURL)) {
      sessionStorage.setItem(SIGNIN_RETURN_SESSION_KEY, returnURL)
    }
  }, [returnURL])

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
      <SignupForm onSuccess={onSignupSuccess} />
    </div>
  )
}
