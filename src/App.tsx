import { RouterProvider } from 'react-router-dom'

import { createBrowserRouter, redirect } from 'react-router-dom'
import {
  AUTHED_USER_LOCAL_STORE_NAME,
  AuthedUserData,
  useAuthedUserStore,
} from './state/global.ts'

import { useEffect } from 'react'
import { Toaster } from './components/ui/sonner.tsx'
import HomePage from './HomePage.tsx'
import { useAuth } from './hooks/use-auth.ts'
import NotFoundPage from './NotFoundPage.tsx'
import SigninPage from './SigninPage.tsx'
import SignupPage from './SignupPage.tsx'
import SubmitPage from './SubmitPage.tsx'

const createRouter = (authed: boolean) => {
  const notAtAuthed = async () => {
    /* console.log('authed in router: ', authed) */
    if (authed) return redirect('/')
    return null
  }

  return createBrowserRouter([
    {
      path: '/',
      Component: HomePage,
    },
    {
      path: '/signup',
      Component: SignupPage,
      loader: notAtAuthed,
    },
    {
      path: '/signin',
      Component: SigninPage,
      loader: notAtAuthed,
    },
    {
      path: '/submit',
      Component: SubmitPage,
    },
    {
      path: '*',
      Component: NotFoundPage,
    },
  ])
}

const App = () => {
  const updateAuthState = useAuthedUserStore((state) => state.update)
  const authed = useAuth()

  const router = createRouter(authed)

  useEffect(() => {
    const stateStr = localStorage.getItem(AUTHED_USER_LOCAL_STORE_NAME)
    if (stateStr) {
      try {
        const data: AuthedUserData = JSON.parse(stateStr)
        /* console.log('auth state from localStorage: ', data) */

        const { authToken, username, email } = data
        updateAuthState(authToken, username, email)
      } catch (e) {
        console.error('parse authe state local storage error: ', e)
      }
    }
  }, [updateAuthState])

  {/* prettier-ignore */}
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        theme="system"
        position="top-center"
        invert
        visibleToasts={1}
        toastOptions={{
          classNames: {
            error: 'bg-red-400',
            success: 'text-green-400',
            warning: 'text-yellow-400',
            info: 'bg-blue-400',
          },
        }}
      />
    </>
  )
}

export default App
