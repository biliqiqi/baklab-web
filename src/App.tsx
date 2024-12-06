import { Router } from '@remix-run/router'
import { useEffect, useState } from 'react'
import {
  RouterProvider,
  createBrowserRouter,
  redirect,
  replace,
} from 'react-router-dom'

import { Toaster } from './components/ui/sonner.tsx'

import BLoader from './components/base/BLoader.tsx'

import ArticleListPage from './ArticleListPage.tsx'
import ArticlePage from './ArticlePage.tsx'
import NotFoundPage from './NotFoundPage.tsx'
import SigninPage from './SigninPage.tsx'
import SignupPage from './SignupPage.tsx'
import SubmitPage from './SubmitPage.tsx'
import UserPage from './UserPage.tsx'
import { useAuth } from './hooks/use-auth.ts'
import { toSync } from './lib/fire-and-forget.ts'
import { refreshAuthState } from './lib/request.ts'
import { noop } from './lib/utils.ts'
import { isLogined, useAuthedUserStore, useToastStore } from './state/global.ts'

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

const routes = [
  {
    path: '/',
    Component: ArticleListPage,
  },
  {
    path: '/articles/:articleID',
    Component: ArticlePage,
  },
  {
    path: '/categories/:category',
    Component: ArticleListPage,
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
    path: '/users/:username',
    Component: UserPage,
  },
  {
    path: '*',
    Component: NotFoundPage,
  },
]

const App = () => {
  const [initialized, setInitialized] = useState(false)
  const [router, setRouter] = useState<Router | null>(null)
  const updateToastState = useToastStore((state) => state.update)
  const authed = useAuth()

  useEffect(() => {
    if (!authed) {
      updateToastState(true)
      toSync(refreshAuthState, noop, () => {
        setInitialized(true)
        setRouter(createBrowserRouter(routes))
        setTimeout(() => {
          updateToastState(false)
        }, 0)
      })()
    }
  }, [authed])

  {/* prettier-ignore */}
  return (
    <>
      {initialized && router ? (
        <RouterProvider router={router} />
      ) : (
        <div className="flex justify-center py-4">
          <BLoader />
        </div>
      )}
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
