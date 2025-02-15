import { Router } from '@remix-run/router'
import { useCallback, useEffect, useState } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { SIDEBAR_COOKIE_NAME } from './components/ui/sidebar.tsx'
import { Toaster } from './components/ui/sonner.tsx'

import BLoader from './components/base/BLoader.tsx'

import { API_HOST, API_PATH_PREFIX } from './constants/constants.ts'
import { useAuth } from './hooks/use-auth.ts'
import { useIsMobile } from './hooks/use-mobile.tsx'
import { toSync } from './lib/fire-and-forget.ts'
import { refreshAuthState } from './lib/request.ts'
import { getCookie, noop } from './lib/utils.ts'
import {
  useAuthedUserStore,
  useForceUpdate,
  useNotificationStore,
  useSidebarStore,
  useSiteStore,
  useToastStore,
  useTopDrawerStore,
} from './state/global.ts'
import { useRoutesStore } from './state/routes.ts'

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
    const siteState = useSiteStore.getState()
    if (siteState.site) {
      toSync(siteState.fetchSiteData)(siteState.site.frontId)
    }
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
  const siteStore = useSiteStore()

  const { setOpen: setSidebarOpen } = useSidebarStore()
  const { update: setShowTopDrawer } = useTopDrawerStore()
  const isMobile = useIsMobile()
  const { forceState } = useForceUpdate()

  const refreshTokenSync = toSync(useCallback(refreshAuthState, [authStore]))
  const routes = useRoutesStore(useShallow((state) => state.routes))

  useEffect(() => {
    const eventSource = connectEvents()

    return () => {
      eventSource.close()
    }
  }, [authStore.username])

  useEffect(() => {
    window.onfocus = () => {
      refreshTokenSync(true)
      fetchNotiCount()
    }
    return () => {
      window.onfocus = null
    }
  }, [authStore])

  useEffect(() => {
    if (!authed) {
      updateToastState(true)
      toSync(refreshAuthState, noop, () => {
        setRouter(createBrowserRouter(routes))
        setInitialized(true)
        setTimeout(() => {
          updateToastState(false)
        }, 0)
      })()
    } else {
      refreshTokenSync(true)
      fetchNotiCount()
      /* console.log('fetch site list!') */
      toSync(siteStore.fetchSiteList)()
    }
  }, [authed])

  useEffect(() => {
    /* console.log('routes: ', routes) */
    if (authed) {
      setRouter(createBrowserRouter(routes))
    }
  }, [authed, routes])

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
      /* document.cookie = `${SIDEBAR_COOKIE_NAME}=false; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}` */
    } else {
      const state = getCookie(SIDEBAR_COOKIE_NAME)
      setSidebarOpen(state == 'true')
    }
  }, [isMobile])

  useEffect(() => {
    const showDock = getCookie('top_drawer:state') == 'true'
    setShowTopDrawer(showDock)
  }, [])

  {/* prettier-ignore */}
  return (
    <>
      {initialized && router ? (
        <RouterProvider router={router} key={forceState} />
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
