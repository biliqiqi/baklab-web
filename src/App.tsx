import { Router } from '@remix-run/router'
import { useCallback, useEffect, useState } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { Toaster } from './components/ui/sonner.tsx'

import BLoader from './components/base/BLoader.tsx'

import { useTheme } from './components/theme-provider.ts'

import '@/state/chat-db.ts'
import { deleteIDBMessage, saveIDBMessage } from '@/state/chat-db.ts'

import {
  API_HOST,
  API_PATH_PREFIX,
  DEFAULT_FONT_SIZE,
  DEFAULT_THEME,
  LEFT_SIDEBAR_DEFAULT_OPEN,
  LEFT_SIDEBAR_STATE_KEY,
  RIGHT_SIDEBAR_SETTINGS_TYPE_KEY,
  RIGHT_SIDEBAR_STATE_KEY,
  TOP_DRAWER_STATE_KEY,
} from './constants/constants.ts'
import { useIsMobile } from './hooks/use-mobile.tsx'
import './i18n'
import { toSync } from './lib/fire-and-forget.ts'
import { refreshAuthState, refreshToken } from './lib/request.ts'
import { setRootFontSize } from './lib/utils.ts'
import {
  getLocalUserUISettings,
  useAuthedUserStore,
  useEventSourceStore,
  useForceUpdate,
  useNotificationStore,
  useRightSidebarStore,
  useSidebarStore,
  useSiteStore,
  useTopDrawerStore,
  useUserUIStore,
} from './state/global.ts'
import { useRoutesStore } from './state/routes.ts'
import { Article, SSE_EVENT, SettingsType } from './types/types.ts'

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

  eventSource.addEventListener(
    SSE_EVENT.Ping,
    (_event: MessageEvent<string>) => {
      try {
        /* const data = JSON.parse(event.data) as PingData */
        /* console.log('event data: ', data) */
      } catch (err) {
        console.error('parse event data error: ', err)
      }
    }
  )

  eventSource.addEventListener(
    SSE_EVENT.UpdateRole,
    (_event: MessageEvent<string>) => {
      toSync(refreshAuthState)(true)
      const siteState = useSiteStore.getState()
      if (siteState.site) {
        toSync(siteState.fetchSiteData)(siteState.site.frontId)
      }
    }
  )

  eventSource.addEventListener(SSE_EVENT.UpdateNoties, (_ev) => {
    /* console.log('updatenoties:', ev) */
    fetchNotiCount()
  })

  eventSource.addEventListener(SSE_EVENT.Close, (_ev) => {
    /* console.log('close:', ev) */
    eventSource.close()
  })

  eventSource.addEventListener(
    SSE_EVENT.NewMessage,
    (ev: MessageEvent<string>) => {
      try {
        /* console.log('new message data str: ', ev.data) */
        const item = JSON.parse(ev.data) as Article
        /* console.log('new message data: ', item) */
        if (item) {
          toSync(saveIDBMessage)(item.siteFrontId, item.categoryFrontId, item)
        }
      } catch (err) {
        console.error('parse event data error in newmessage event: ', err)
      }
    }
  )

  eventSource.addEventListener(
    SSE_EVENT.DeleteMessage,
    (ev: MessageEvent<string>) => {
      try {
        /* console.log('delete message data str: ', ev.data) */
        if (ev.data) {
          toSync(deleteIDBMessage)(ev.data)
        }
      } catch (err) {
        console.error('parse event data error in deletemessage event: ', err)
      }
    }
  )

  eventSource.onerror = (err) => {
    console.error('event source error: ', err)
  }

  return eventSource
}

const App = () => {
  const [initialized, setInitialized] = useState(false)
  const [router, setRouter] = useState<Router | null>(null)

  /* const updateToastState = useToastStore((state) => state.update) */
  const { currUsername, authToken, updateBaseData, updateUserData } =
    useAuthedUserStore(
      useShallow(
        ({
          username,
          authToken,
          isLogined,
          updateBaseData,
          updateUserData,
        }) => ({
          currUsername: username,
          authToken,
          isLogined,
          updateBaseData,
          updateUserData,
        })
      )
    )

  const setEventSource = useEventSourceStore((state) => state.setEventSource)
  const eventSource = useEventSourceStore((state) => state.eventSource)

  const { fetchSiteList } = useSiteStore(
    useShallow(({ fetchSiteList }) => ({
      fetchSiteList,
    }))
  )

  const { theme, setTheme } = useTheme()

  const setSidebarOpen = useSidebarStore((state) => state.setOpen)
  const setShowTopDrawer = useTopDrawerStore((state) => state.update)
  const setRightSidebarOpen = useRightSidebarStore((state) => state.setOpen)
  const setSettingsType = useRightSidebarStore((state) => state.setSettingsType)

  const setUserUIState = useUserUIStore((state) => state.setState)

  const isMobile = useIsMobile()
  const { forceState, forceUpdate } = useForceUpdate(
    useShallow(({ forceState, forceUpdate }) => ({ forceState, forceUpdate }))
  )

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

  const reconnectEventSource = useCallback(() => {
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
    }

    const ev = connectEvents()
    setEventSource(ev)
  }, [eventSource, setEventSource])

  useEffect(() => {
    const ev = connectEvents()
    setEventSource(ev)

    return () => {
      setEventSource(null)
      ev.close()
    }
  }, [currUsername, setEventSource])

  useEffect(() => {
    window.onfocus = () => {
      reconnectEventSource()
      refreshTokenSync(true)
      fetchNotiCount()
    }
    return () => {
      window.onfocus = null
    }
  }, [refreshTokenSync, reconnectEventSource])

  useEffect(() => {
    if (!authToken) {
      refreshTokenSync(true)
    } else {
      fetchNotiCount()
      toSync(fetchSiteList)()
    }

    setRouter(createBrowserRouter(routes))
    setInitialized(true)
  }, [authToken, routes, fetchSiteList, forceUpdate])

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    } else {
      const leftSidebarState = localStorage.getItem(LEFT_SIDEBAR_STATE_KEY)
      const rightSidebarState = localStorage.getItem(RIGHT_SIDEBAR_STATE_KEY)
      const rightSidebarSettingsType = localStorage.getItem(
        RIGHT_SIDEBAR_SETTINGS_TYPE_KEY
      ) as SettingsType | null

      const userUISettings = getLocalUserUISettings()

      /* console.log('local ui settings: ', userUISettings) */

      if (userUISettings) {
        setUserUIState(userUISettings)
        setTheme(userUISettings.theme || DEFAULT_THEME)
        setRootFontSize(String(userUISettings.fontSize) || DEFAULT_FONT_SIZE)
      }

      if (rightSidebarSettingsType) {
        setSettingsType(rightSidebarSettingsType)
      }

      setSidebarOpen(leftSidebarState ? leftSidebarState == 'true' : LEFT_SIDEBAR_DEFAULT_OPEN)
      setRightSidebarOpen(rightSidebarState == 'true')
    }
  }, [
    isMobile,
    setSidebarOpen,
    setRightSidebarOpen,
    setSettingsType,
    setUserUIState,
  ])

  useEffect(() => {
    const showDock = localStorage.getItem(TOP_DRAWER_STATE_KEY) == 'true'
    setShowTopDrawer(showDock)
  }, [setShowTopDrawer])

  /* console.log('initialized: ', initialized)
   * console.log('authToken: ', authToken) */

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
        theme={theme}
        position="top-center"
        visibleToasts={1}
        closeButton
        toastOptions={{
          classNames: {
            error: 'bg-red-400 dark:bg-red-900',
            success: 'bg-green-400 dark:bg-green-900',
            warning: 'bg-yellow-400 dark:bg-yellow-900',
            info: 'bg-blue-400 dark:bg-blue-900',
            loading: 'bg-blue-400 dark:bg-blue-900',
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
