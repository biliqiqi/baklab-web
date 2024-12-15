import { Router } from '@remix-run/router'
import { Children, useCallback, useEffect, useState } from 'react'
import {
  RouteObject,
  RouterProvider,
  createBrowserRouter,
  redirect,
  replace,
} from 'react-router-dom'

import { Toaster } from './components/ui/sonner.tsx'

import BLoader from './components/base/BLoader.tsx'

import ActivityPage from './ActivityPage.tsx'
import ArticleListPage from './ArticleListPage.tsx'
import ArticlePage from './ArticlePage.tsx'
import EditPage from './EditPage.tsx'
import NotFoundPage from './NotFoundPage.tsx'
import SigninPage from './SigninPage.tsx'
import SignupPage from './SignupPage.tsx'
import SubmitPage from './SubmitPage.tsx'
import TrashPage from './TrashPage.tsx'
import UserPage from './UserPage.tsx'
import { getCategoryList } from './api/main.ts'
import { PermissionAction, PermissionModule } from './constants/types.ts'
import { useAuth } from './hooks/use-auth.ts'
import { toSync } from './lib/fire-and-forget.ts'
import { refreshAuthState } from './lib/request.ts'
import { noop } from './lib/utils.ts'
import {
  isLogined,
  useAuthedUserStore,
  useCategoryStore,
  useToastStore,
} from './state/global.ts'

const notAtAuthed = () => {
  const data = useAuthedUserStore.getState()
  const authed = !!data && isLogined(data)
  if (authed) return redirect('/')
  return null
}

const redirectToSignin = (returnUrl?: string) => {
  if (location.pathname == '/signin' || !returnUrl) {
    return replace(location.href.replace(location.origin, ''))
  } else {
    return redirect(`/signin?return=${encodeURIComponent(returnUrl)}`)
  }
}

const mustAuthed = ({ request }: { request: Request }) => {
  const data = useAuthedUserStore.getState()
  const authed = !!data && isLogined(data)

  if (!authed) {
    return redirectToSignin(request.url)
  }
  return null
}

const needPermission =
  <T extends PermissionModule>(module: T, action: PermissionAction<T>) =>
  ({ request }: { request: Request }) => {
    const authState = useAuthedUserStore.getState()

    if (!authState.isLogined()) {
      return redirectToSignin(request.url)
    }

    if (!authState.permit(module, action)) {
      return redirect('/')
    }

    return null
  }

const routes: RouteObject[] = [
  {
    path: '/',
    Component: ArticleListPage,
  },
  {
    path: '/articles/:articleID',
    Component: ArticlePage,
  },
  {
    path: '/articles/:articleID/edit',
    Component: EditPage,
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
    path: '/manage',
    loader: needPermission('manage', 'access'),
    children: [
      {
        path: '',
        loader: () => redirect('/manage/activities'),
      },
      {
        path: 'activities',
        Component: ActivityPage,
        loader: needPermission('activity', 'access'),
      },
      {
        path: 'trash',
        Component: TrashPage,
      },
    ],
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
  const { updateCategories: setCateList } = useCategoryStore()

  /* console.log('render app!') */

  const fetchCateList = toSync(
    useCallback(async () => {
      try {
        /* setLoading(true) */
        const data = await getCategoryList()
        if (!data.code) {
          setCateList([...data.data])
        }
      } catch (err) {
        console.error('fetch category list error: ', err)
      } finally {
        /* setLoading(false) */
      }
    }, [])
  )

  useEffect(() => {
    fetchCateList()
  }, [])

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
      {/* <div>
        {(
          [
            'error',
            'success',
            'warning',
            'info',
            'default',
            'loading',
          ] as ToastT['type'][]
        ).map((tt = 'normal') => (
          <Button onClick={() => toast[tt](tt)}>{tt}</Button>
        ))}
      </div> */}
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
            success: 'bg-green-400',
            warning: 'bg-yellow-400',
            info: 'bg-blue-400',
            loading: 'bg-blue-400',
            icon: 'text-white',
            content: 'text-white',
            closeButton: 'absolute left-auto right-[-10px] text-black',
          },
        }}
      />
    </>
  )
}

export default App
