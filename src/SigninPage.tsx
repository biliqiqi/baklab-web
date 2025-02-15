import { useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import SigninForm from './components/SigninForm'

import { SITE_NAME_CN } from './constants/constants'
import useDocumentTitle from './hooks/use-page-title'

const isInnerURL = (url: string) => new URL(url).origin == location.origin

export default function SigninPage() {
  const [searchParams, _setSearchParams] = useSearchParams()
  const returnURL = searchParams.get('return')

  const navigate = useNavigate()

  const onSiginSuccess = useCallback(() => {
    if (returnURL && isInnerURL(returnURL)) {
      location.href = returnURL
    } else {
      navigate(0)
    }
  }, [returnURL, navigate])

  useDocumentTitle('登录')

  return (
    <>
      <div className="flex justify-center py-8 text-xl font-bold text-primary">
        <Link to="/">{SITE_NAME_CN}</Link>
      </div>
      <SigninForm onSuccess={onSiginSuccess} />
    </>
  )
}
