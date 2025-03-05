import { Router } from '@remix-run/router'
import { useCallback, useEffect, useState } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { SIDEBAR_COOKIE_NAME } from './components/ui/sidebar.tsx'
import { Toaster } from './components/ui/sonner.tsx'

import BLoader from './components/base/BLoader.tsx'

import { API_HOST, API_PATH_PREFIX } from './constants/constants.ts'
import { useIsMobile } from './hooks/use-mobile.tsx'
import { toSync } from './lib/fire-and-forget.ts'
import { refreshAuthState, refreshToken } from './lib/request.ts'
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

const EVENT_URL = `${API_HOST}${API_PATH_PREFIX}events`

const connectEvents = () => {
  const eventSource = new EventSource(EVENT_URL, {
    withCredentials: true,
  })

  eventSource.addEventListener('ping', (_event: MessageEvent<string>) => {
    try {
      /* const data = JSON.parse(atob(event.data)) as PingData */
      /* console.log('event data: ', data) */
    } catch (err) {
      console.error('parse event data error: ', err)
    }
  })

  eventSource.addEventListener('updaterole', (_event: MessageEvent<string>) => {
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

  eventSource.onerror = (err) => {
    console.error('event source error: ', err)
  }

  return eventSource
}

const App = () => {
  const [initialized, setInitialized] = useState(false)
  const [router, setRouter] = useState<Router | null>(null)

  /* const updateToastState = useToastStore((state) => state.update) */
  const { currUsername, isLogined, updateBaseData, updateUserData } =
    useAuthedUserStore(
      useShallow(({ username, isLogined, updateBaseData, updateUserData }) => ({
        currUsername: username,
        isLogined,
        updateBaseData,
        updateUserData,
      }))
    )

  const { fetchSiteList } = useSiteStore(
    useShallow(({ fetchSiteList }) => ({
      fetchSiteList,
    }))
  )

  const { setOpen: setSidebarOpen } = useSidebarStore()
  const { update: setShowTopDrawer } = useTopDrawerStore()
  const isMobile = useIsMobile()
  const { forceState } = useForceUpdate()

  const refreshTokenSync = toSync(
    useCallback(
      async (refreshUser: boolean) => {
        const {
          data: { token, username, userID, user },
          code,
        } = await refreshToken(refreshUser)

        if (!code) {
          updateBaseData(token, username, userID)
          if (refreshUser) {
            updateUserData(user)
          }
        }
      },
      [updateBaseData, updateUserData]
    )
  )

  const routes = useRoutesStore(useShallow((state) => state.routes))

  useEffect(() => {
    const eventSource = connectEvents()

    return () => {
      eventSource.close()
    }
  }, [currUsername])

  useEffect(() => {
    window.onfocus = () => {
      refreshTokenSync(true)
      fetchNotiCount()
    }
    return () => {
      window.onfocus = null
    }
  }, [refreshTokenSync])

  useEffect(() => {
    if (!isLogined()) {
      refreshTokenSync(true)
    }

    setRouter(createBrowserRouter(routes))
    fetchNotiCount()
    toSync(fetchSiteList)()
    setInitialized(true)
  }, [isLogined, routes, fetchSiteList])

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    } else {
      const state = getCookie(SIDEBAR_COOKIE_NAME)
      setSidebarOpen(state == 'true')
    }
  }, [isMobile, setSidebarOpen])

  useEffect(() => {
    const showDock = getCookie('top_drawer:state') == 'true'
    setShowTopDrawer(showDock)
  }, [setShowTopDrawer])

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
