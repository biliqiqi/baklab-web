import { useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import SignupForm from './components/SignupForm'

import { SINGUP_RETURN_COOKIE_NAME, SITE_NAME_CN } from './constants/constants'
import useDocumentTitle from './hooks/use-page-title'
import { deleteCookie, getCookie } from './lib/utils'

export default function SignupPage() {
  const navigate = useNavigate()
  useDocumentTitle('注册')

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
        <Link to="/">{SITE_NAME_CN}</Link>
      </div>
      <SignupForm onSuccess={onSignupSuccess} />
    </>
  )
}
