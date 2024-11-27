import { redirect, replace, RouterProvider } from 'react-router-dom'

import { createBrowserRouter } from 'react-router-dom'
import { isLogined, useAuthedUserStore } from './state/global.ts'

import { useEffect } from 'react'
import ArticlePage from './ArticlePage.tsx'
import { Toaster } from './components/ui/sonner.tsx'
import HomePage from './HomePage.tsx'
import { useAuth } from './hooks/use-auth.ts'
import { toSync } from './lib/fire-and-forget.ts'
import { refreshAuthState } from './lib/request.ts'
import NotFoundPage from './NotFoundPage.tsx'
import SigninPage from './SigninPage.tsx'
import SignupPage from './SignupPage.tsx'
import SubmitPage from './SubmitPage.tsx'

const notAtAuthed = () => {
  const data = useAuthedUserStore.getState()
  const authed = !!data && isLogined(data)
  if (authed) return redirect('/')
  return null
}

const mustAuthed = ({ request }: { request: Request }) => {
  const data = useAuthedUserStore.getState()
  const authed = !!data && isLogined(data)
  /* console.log('authed: ', authed) */
  if (!authed) {
    if (location.pathname == '/signin') {
      return replace(location.href.replace(location.origin, ''))
    } else {
      return redirect(`/signin?return=${encodeURIComponent(request.url)}`)
    }
  }
  return null
}

const router = createBrowserRouter([
  {
    path: '/',
    Component: HomePage,
  },
  {
    path: '/articles/:articleID',
    Component: ArticlePage,
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
    loader: mustAuthed,
  },
  {
    path: '*',
    Component: NotFoundPage,
  },
])

const App = () => {
  const authed = useAuth()

  useEffect(() => {
    if (!authed) {
      toSync(refreshAuthState)()
    }
  }, [authed])

  {/* prettier-ignore */}
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        theme="system"
        position="top-center"
        invert
        visibleToasts={1}
        closeButton
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
