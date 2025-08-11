import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import SigninForm from './components/SigninForm'

import { PLATFORM_NAME } from './constants/constants'
import useDocumentTitle from './hooks/use-page-title'
import { isInnerURL } from './lib/utils'
import { useAuthedUserStore } from './state/global'

export default function SigninPage() {
  const [searchParams, _setSearchParams] = useSearchParams()
  const returnURL = searchParams.get('return')

  const navigate = useNavigate()
  const isLogined = useAuthedUserStore((state) => state.isLogined())

  const { t } = useTranslation()

  const onSiginSuccess = useCallback(() => {
    if (returnURL && isInnerURL(returnURL)) {
      location.href = returnURL
    } else {
      navigate('/', { replace: true })
    }
  }, [returnURL, navigate])

  useDocumentTitle(t('signin'))

  // Redirect to home page if user is already logged in
  useEffect(() => {
    if (isLogined) {
      if (returnURL && isInnerURL(returnURL)) {
        location.href = returnURL
      } else {
        navigate('/', { replace: true })
      }
    }
  }, [isLogined, returnURL, navigate])

  return (
    <>
      <div className="flex justify-center py-8 text-xl font-bold text-primary">
        <Link to="/">{PLATFORM_NAME}</Link>
      </div>
      <SigninForm onSuccess={onSiginSuccess} />
    </>
  )
}
