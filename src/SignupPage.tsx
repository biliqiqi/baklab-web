import { Link, useNavigate } from 'react-router-dom'

import SignupForm from './components/SignupForm'

import { SITE_NAME_CN } from './constants/constants'
import useDocumentTitle from './hooks/use-page-title'

export default function SignupPage() {
  const navigate = useNavigate()
  useDocumentTitle('注册')
  return (
    <>
      <div className="flex justify-center py-8 text-xl font-bold text-primary">
        <Link to="/">{SITE_NAME_CN}</Link>
      </div>
      <SignupForm onSuccess={() => navigate('/')} />
    </>
  )
}
