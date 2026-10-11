import { useEffect } from 'react'

import { Toaster } from './components/ui/sonner.tsx'

import BLoader from './components/base/BLoader.tsx'

import { useTheme } from './components/theme-provider.ts'

import ModalRoutesWrapper from './ModalRoutesWrapper'
import {
  DEFAULT_THEME,
  LEFT_SIDEBAR_DEFAULT_OPEN,
  LEFT_SIDEBAR_STATE_KEY,
  RIGHT_SIDEBAR_SETTINGS_TYPE_KEY,
  RIGHT_SIDEBAR_STATE_KEY,
} from './constants/constants.ts'
import { useAppInitialization } from './hooks/use-app-initialization'
import { useIsMobile } from './hooks/use-mobile.tsx'
import './i18n'
import { setFaviconBadge } from './lib/favicon.ts'
import { setRootFontSize } from './lib/utils.ts'
import {
  getLocalUserUISettings,
  useDefaultFontSizeStore,
  useForceUpdate,
  useNotificationStore,
  useRightSidebarStore,
  useSidebarStore,
  useUserUIStore,
} from './state/global.ts'
import { SettingsType } from './types/types.ts'

const DESKTOP_FONT_SIZE = '16'
const MOBILE_FONT_SIZE = '14'

const App = () => {
  const initialized = useAppInitialization()

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
  const forceState = useForceUpdate((state) => state.forceState)

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
        duration={5000}
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
