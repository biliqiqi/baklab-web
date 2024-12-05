import { useNavigate } from 'react-router-dom'

import SignupForm from './components/SignupForm'

import useDocumentTitle from './hooks/use-page-title'

export default function SignupPage() {
  const navigate = useNavigate()
  useDocumentTitle('注册')
  return (
    <>
      <SignupForm onSuccess={() => navigate('/')} />
    </>
  )
}
