import { startTransition, useCallback, useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { Toaster } from './components/ui/sonner.tsx'

import BLoader from './components/base/BLoader.tsx'

import { useTheme } from './components/theme-provider.ts'

import '@/state/chat-db.ts'
import { deleteIDBMessage, saveIDBMessage } from '@/state/chat-db.ts'

import ModalRoutesWrapper from './ModalRoutesWrapper'
import {
  API_HOST,
  API_PATH_PREFIX,
  DEFAULT_THEME,
  LEFT_SIDEBAR_DEFAULT_OPEN,
  LEFT_SIDEBAR_STATE_KEY,
  RIGHT_SIDEBAR_SETTINGS_TYPE_KEY,
  RIGHT_SIDEBAR_STATE_KEY,
} from './constants/constants.ts'
import { useIsMobile } from './hooks/use-mobile.tsx'
import './i18n'
import { setFaviconBadge } from './lib/favicon.ts'
import { toSync } from './lib/fire-and-forget.ts'
import { refreshAuthState, refreshToken } from './lib/request.ts'
import { setRootFontSize } from './lib/utils.ts'
import {
  getLocalUserUISettings,
  useAuthedUserStore,
  useContextStore,
  useDefaultFontSizeStore,
  useEventSourceStore,
  useForceUpdate,
  useNotificationStore,
  useRightSidebarStore,
  useSidebarStore,
  useSiteStore,
  useUserUIStore,
} from './state/global.ts'
import { useRoutesStore } from './state/routes.ts'
import { Article, SSE_EVENT, SettingsType } from './types/types.ts'

const DESKTOP_FONT_SIZE = '16'
const MOBILE_FONT_SIZE = '14'

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
        if (!ev.data || ev.data === 'undefined') {
          return
        }
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
  const setRightSidebarOpen = useRightSidebarStore((state) => state.setOpen)
  const setSettingsType = useRightSidebarStore((state) => state.setSettingsType)

  const setUserUIState = useUserUIStore((state) => state.setState)
  const unreadCount = useNotificationStore((state) => state.unreadCount)

  const isMobile = useIsMobile()
  const setDefaultFontSize = useDefaultFontSizeStore(
    (state) => state.setDefaultFontSize
  )
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
    // Check if connection is still alive before reconnecting
    if (eventSource && eventSource.readyState === EventSource.OPEN) {
      return
    }

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
    let debounceTimer: NodeJS.Timeout

    window.onfocus = () => {
      // Debounce to avoid frequent reconnections
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        // Use startTransition to mark these updates as low priority
        // This prevents them from interrupting route navigation
        startTransition(() => {
          reconnectEventSource()
          refreshTokenSync(true)
          fetchNotiCount()
        })
      }, 1000) // 1 second debounce
    }

    return () => {
      window.onfocus = null
      clearTimeout(debounceTimer)
    }
  }, [refreshTokenSync, reconnectEventSource])

  const fetchContext = useContextStore((state) => state.fetchContext)

  useEffect(() => {
    const initializeApp = async () => {
      await fetchContext()

      let isLoggedIn = false

      if (!authToken) {
        try {
          const {
            data: { token, username, userID, user },
            code,
          } = await refreshToken(true)

          if (!code) {
            updateBaseData(token, username, userID)
            updateUserData(user)
            isLoggedIn = true
          }
        } catch (error) {
          console.error('Failed to refresh token:', error)
          // Continue initialization even if token refresh fails
        }
      } else {
        isLoggedIn = true
      }

      // Only fetch authenticated data if user is logged in
      if (isLoggedIn) {
        fetchNotiCount()
        toSync(fetchSiteList)()
      }

      setInitialized(true)
    }

    void initializeApp()
  }, [
    authToken,
    routes,
    fetchSiteList,
    fetchContext,
    forceUpdate,
    updateBaseData,
    updateUserData,
  ])

  useEffect(() => {
    const defaultFontSize = isMobile ? MOBILE_FONT_SIZE : DESKTOP_FONT_SIZE
    setDefaultFontSize(defaultFontSize)

    const leftSidebarState = localStorage.getItem(LEFT_SIDEBAR_STATE_KEY)
    const rightSidebarState = localStorage.getItem(RIGHT_SIDEBAR_STATE_KEY)
    const rightSidebarSettingsType = localStorage.getItem(
      RIGHT_SIDEBAR_SETTINGS_TYPE_KEY
    ) as SettingsType | null

    const userUISettings = getLocalUserUISettings()

    if (userUISettings) {
      setUserUIState(userUISettings)
      setTheme(userUISettings.theme || DEFAULT_THEME)
      setRootFontSize(String(userUISettings.fontSize) || defaultFontSize)
    } else {
      setRootFontSize(defaultFontSize)
    }

    if (rightSidebarSettingsType) {
      setSettingsType(rightSidebarSettingsType)
    }

    if (isMobile) {
      setSidebarOpen(false)
    } else {
      setSidebarOpen(
        leftSidebarState
          ? leftSidebarState == 'true'
          : LEFT_SIDEBAR_DEFAULT_OPEN
      )
      setRightSidebarOpen(rightSidebarState == 'true')
    }
  }, [
    isMobile,
    setSidebarOpen,
    setRightSidebarOpen,
    setSettingsType,
    setUserUIState,
    setTheme,
    setDefaultFontSize,
  ])

  useEffect(() => {
    setFaviconBadge(unreadCount).catch(console.error)
  }, [unreadCount])

  /* console.log('initialized: ', initialized)
   * console.log('authToken: ', authToken) */
  {/* prettier-ignore */}
  return (
    <>
      {initialized ? (
        <ModalRoutesWrapper key={forceState} />
      ) : (
        <div className="flex h-screen items-center justify-center">
          <BLoader className="-mt-8" />
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
