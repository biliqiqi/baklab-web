import { useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import SigninForm from './components/SigninForm'

import useDocumentTitle from './hooks/use-page-title'

const isInnerURL = (url: string) => new URL(url).origin == location.origin

export default function SigninPage() {
  const [searchParams, _setSearchParams] = useSearchParams()
  const returnURL = searchParams.get('return')
  /* console.log('account: ', account) */
  /* console.log('return url: ', returnURL) */

  const navigate = useNavigate()

  const onSiginSuccess = useCallback(() => {
    let targetURL = '/'
    if (returnURL && isInnerURL(returnURL)) {
      targetURL = returnURL.replace(location.origin, '')
      console.log('to return url: ', targetURL)
    }

    console.log('targetURL: ', targetURL)
    navigate(targetURL)
  }, [returnURL])

  useDocumentTitle('登录')

  /* console.log('render signin page') */

  return (
    <>
      <SigninForm onSuccess={onSiginSuccess} />
    </>
  )
}
