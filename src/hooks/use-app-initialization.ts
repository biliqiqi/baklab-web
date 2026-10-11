import { useEffect, useRef, useState } from 'react'

import { toSync } from '@/lib/fire-and-forget'
import { refreshAuthState } from '@/lib/request'

import {
  useAuthedUserStore,
  useContextStore,
  useNotificationStore,
  useSiteStore,
} from '@/state/global'

export const useAppInitialization = () => {
  const [initialized, setInitialized] = useState(false)
  const initialization = useRef<Promise<void> | null>(null)
  const userID = useAuthedUserStore((state) =>
    state.isLogined() ? state.userID : ''
  )

  useEffect(() => {
    let active = true

    initialization.current ??= (async () => {
      await useContextStore.getState().fetchContext()
      if (!useAuthedUserStore.getState().isLogined()) {
        await refreshAuthState(true)
      }
    })()

    void initialization.current
      .catch((error) => console.error('Failed to initialize app:', error))
      .finally(() => {
        if (active) setInitialized(true)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!initialized) return

    if (userID) {
      toSync(useNotificationStore.getState().fetchUnread)()
      toSync(useSiteStore.getState().fetchSiteList)()
    } else {
      useNotificationStore.getState().setUnreadCount(0)
      useSiteStore.getState().updateSiteList([])
    }
  }, [initialized, userID])

  return initialized
}
