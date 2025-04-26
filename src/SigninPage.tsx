import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import SigninForm from './components/SigninForm'

import { PLATFORM_NAME } from './constants/constants'
import useDocumentTitle from './hooks/use-page-title'
import { isInnerURL } from './lib/utils'

export default function SigninPage() {
  const [searchParams, _setSearchParams] = useSearchParams()
  const returnURL = searchParams.get('return')

  const navigate = useNavigate()

  const { t } = useTranslation()

  const onSiginSuccess = useCallback(() => {
    if (returnURL && isInnerURL(returnURL)) {
      location.href = returnURL
    } else {
      navigate(0)
    }
  }, [returnURL, navigate])

  useDocumentTitle(t('signin'))

  return (
    <>
      <div className="flex justify-center py-8 text-xl font-bold text-primary">
        <Link to="/">{PLATFORM_NAME}</Link>
      </div>
      <SigninForm onSuccess={onSiginSuccess} />
    </>
  )
}
