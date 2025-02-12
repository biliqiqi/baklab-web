import { useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import SigninForm from './components/SigninForm'

import { SITE_NAME_CN } from './constants/constants'
import useDocumentTitle from './hooks/use-page-title'
import { useForceUpdate } from './state/global'

const isInnerURL = (url: string) => new URL(url).origin == location.origin

export default function SigninPage() {
  const [searchParams, _setSearchParams] = useSearchParams()
  const returnURL = searchParams.get('return')
  const { forceUpdate } = useForceUpdate()
  /* console.log('account: ', account) */

  /* console.log('return url: ', returnURL)
   * console.log('is inner url: ', isInnerURL(returnURL || '')) */

  const navigate = useNavigate()

  const onSiginSuccess = useCallback(() => {
    let targetURL = '/'
    if (returnURL && isInnerURL(returnURL)) {
      targetURL = returnURL.replace(location.origin, '')
      /* console.log('to return url: ', targetURL) */
    }

    /* console.log('navigate to targetURL: ', targetURL) */
    navigate(targetURL, { replace: true })
    forceUpdate()
  }, [returnURL, navigate, forceUpdate])

  useDocumentTitle('登录')

  /* console.log('render signin page') */

  return (
    <>
      <div className="flex justify-center py-8 text-xl font-bold text-primary">
        <Link to="/">{SITE_NAME_CN}</Link>
      </div>
      <SigninForm onSuccess={onSiginSuccess} />
    </>
  )
}
