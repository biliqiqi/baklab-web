import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import SignupForm from './components/SignupForm'

import { PLATFORM_NAME, SINGUP_RETURN_COOKIE_NAME } from './constants/constants'
import useDocumentTitle from './hooks/use-page-title'
import { deleteCookie, getCookie } from './lib/utils'

export default function SignupPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  useDocumentTitle(t('signup'))

  const onSignupSuccess = useCallback(() => {
    const returnUrl = decodeURIComponent(
      getCookie(SINGUP_RETURN_COOKIE_NAME) || ''
    )

    if (returnUrl && returnUrl.trim()) {
      location.href = returnUrl
      deleteCookie(SINGUP_RETURN_COOKIE_NAME)
    } else {
      navigate('/')
    }
  }, [navigate])

  return (
    <>
      <div className="flex justify-center py-8 text-xl font-bold text-primary">
        <Link to="/">{PLATFORM_NAME}</Link>
      </div>
      <SignupForm onSuccess={onSignupSuccess} />
    </>
  )
}
