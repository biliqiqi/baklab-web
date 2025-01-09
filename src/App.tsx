import { Router } from '@remix-run/router'
import { useCallback, useEffect, useState } from 'react'
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
import BannedUserListPage from './BannedUserListPage.tsx'
import EditPage from './EditPage.tsx'
import MessagePage from './MessagePage.tsx'
import NotFoundPage from './NotFoundPage.tsx'
import RoleManagePage from './RoleManagePage.tsx'
import SigninPage from './SigninPage.tsx'
import SignupPage from './SignupPage.tsx'
import SubmitPage from './SubmitPage.tsx'
import TrashPage from './TrashPage.tsx'
import UserListPage from './UserListPage.tsx'
import UserPage from './UserPage.tsx'
import { getCategoryList } from './api/category.ts'
import { getNotificationUnreadCount } from './api/message.ts'
import { API_HOST, API_PATH_PREFIX } from './constants/constants.ts'
import { PermissionAction, PermissionModule } from './constants/types.ts'
import { useAuth } from './hooks/use-auth.ts'
import { toSync } from './lib/fire-and-forget.ts'
import { refreshAuthState } from './lib/request.ts'
import { noop } from './lib/utils.ts'
import {
  isLogined,
  useAuthedUserStore,
  useCategoryStore,
  useNotificationStore,
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
    path: '/messages',
    Component: MessagePage,
    loader: mustAuthed,
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
      {
        path: 'users',
        Component: UserListPage,
        loader: needPermission('user', 'manage'),
      },
      {
        path: 'banned_users',
        Component: BannedUserListPage,
        loader: needPermission('user', 'manage'),
      },
      {
        path: 'roles',
        Component: RoleManagePage,
        loader: needPermission('role', 'access'),
      },
    ],
  },
  {
    path: '*',
    Component: NotFoundPage,
  },
]

const fetchNotiCount = toSync(async () => {
  const notiState = useNotificationStore.getState()
  const authState = useAuthedUserStore.getState()

  if (authState.isLogined()) {
    await notiState.fetchUnread()
  }
})

/* interface PingData {
 *   clientID: string
 * } */

/* const EVENT_CLIENT_KEY = 'event_client' */
const EVENT_URL = `${API_HOST}${API_PATH_PREFIX}events`

const connectEvents = () => {
  const eventSource = new EventSource(EVENT_URL, {
    withCredentials: true,
  })

  eventSource.addEventListener('ping', (_event: MessageEvent<string>) => {
    /* console.log('ping event: ', event) */
    try {
      /* const data = JSON.parse(atob(event.data)) as PingData */
      /* console.log('event data: ', data) */
    } catch (err) {
      console.error('parse event data error: ', err)
    }
  })

  eventSource.addEventListener('updaterole', (_event: MessageEvent<string>) => {
    /* const data = JSON.parse(atob(event.data)) as UserData */
    /* console.log('unban user data: ', data) */

    toSync(refreshAuthState)(true)
  })

  eventSource.addEventListener('updatenoties', (_ev) => {
    /* console.log('updatenoties:', ev) */
    fetchNotiCount()
  })

  eventSource.addEventListener('close', (_ev) => {
    /* console.log('close:', ev) */
    eventSource.close()
  })

  /* eventSource.onmessage = (event) => {
   *   console.log('on message: ', event.data)
   * } */

  eventSource.onerror = (err) => {
    console.error('event source error: ', err)
    /* eventSource.close() */
  }

  return eventSource
}

const App = () => {
  const [initialized, setInitialized] = useState(false)
  const [router, setRouter] = useState<Router | null>(null)

  const updateToastState = useToastStore((state) => state.update)
  const authStore = useAuthedUserStore()
  const authed = useAuth()
  const { updateCategories: setCateList } = useCategoryStore()

  /* console.log('render app!') */

  const fetchCateList = toSync(
    useCallback(async () => {
      const data = await getCategoryList()
      if (!data.code) {
        setCateList([...data.data])
      }
    }, [])
  )

  const refreshTokenSync = toSync(useCallback(refreshAuthState, [authStore]))

  /* const refreshCurrUser = toSync(
   *   useCallback(async () => {
   *     try {
   *       console.log('authStore: ', authStore)
   *       if (authStore.isLogined() && authStore.username != '') {
   *         const resp = await getUser(authStore.username)
   *         if (!resp.code) {
   *           const { data } = resp
   *           authStore.updateObj((state) => ({
   *             ...state,
   *             role: data.roleFrontId as Role,
   *           }))
   *         }
   *       }
   *     } catch (err) {
   *       console.error('refresh curent user error: ', err)
   *     }
   *   }, [authStore])
   * ) */

  useEffect(() => {
    const eventSource = connectEvents()

    return () => {
      eventSource.close()
    }
  }, [authStore.username])

  useEffect(() => {
    fetchCateList()

    window.onfocus = () => {
      fetchCateList()
      refreshTokenSync(true)
      fetchNotiCount()
    }
  }, [authStore])

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
    } else {
      refreshTokenSync(true)
      fetchNotiCount()
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
