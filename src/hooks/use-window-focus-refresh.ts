import { useEffect } from 'react'

import { toSync } from '@/lib/fire-and-forget'
import { refreshAuthState } from '@/lib/request'

import { useAuthedUserStore, useNotificationStore } from '@/state/global'

export const useWindowFocusRefresh = (reconnectEventSource: () => void) => {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let refreshing = false
    let active = true

    const refresh = toSync(async () => {
      if (refreshing) return
      refreshing = true
      try {
        reconnectEventSource()
        if (!useAuthedUserStore.getState().isLogined()) return

        const refreshed = await refreshAuthState(true)
        if (active && refreshed && useAuthedUserStore.getState().isLogined()) {
          await useNotificationStore.getState().fetchUnread()
        }
      } finally {
        refreshing = false
      }
    })

    const handleFocus = () => {
      clearTimeout(timer)
      timer = setTimeout(refresh, 1000)
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      active = false
      window.removeEventListener('focus', handleFocus)
      clearTimeout(timer)
    }
  }, [reconnectEventSource])
}
