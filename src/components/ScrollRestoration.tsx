import { useEffect, useRef } from 'react'
import { useRouterState } from '@tanstack/react-router'

const STORAGE_PREFIX = '__scroll_position__'
const RESTORE_TIMEOUT = 10000

const getLocationKey = (location: {
  pathname: string
  searchStr: string
  hash: string
}) => `${STORAGE_PREFIX}:${location.pathname}${location.searchStr}${location.hash}`

const getScrollPosition = () =>
  window.scrollY ?? window.pageYOffset ?? document.documentElement.scrollTop ?? 0

const getMaxScrollable = () => {
  const doc = document.documentElement
  const body = document.body
  const fullHeight = Math.max(
    doc?.scrollHeight ?? 0,
    body?.scrollHeight ?? 0,
    doc?.offsetHeight ?? 0,
    body?.offsetHeight ?? 0
  )
  return Math.max(fullHeight - window.innerHeight, 0)
}

export const ScrollRestoration = () => {
  const location = useRouterState({
    select: (state) => state.location,
  })

  const locationKey = getLocationKey(location)

  const currentKeyRef = useRef(locationKey)
  const disableSaveRef = useRef(false)
  const saveRafRef = useRef<number | null>(null)
  const restoreRafRef = useRef<number | null>(null)

  useEffect(() => {
    currentKeyRef.current = locationKey
  }, [locationKey])

  useEffect(() => {
    const handleScroll = () => {
      if (disableSaveRef.current) {
        return
      }
      if (saveRafRef.current != null) {
        cancelAnimationFrame(saveRafRef.current)
      }
      saveRafRef.current = window.requestAnimationFrame(() => {
        sessionStorage.setItem(
          currentKeyRef.current,
          String(getScrollPosition())
        )
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (saveRafRef.current != null) {
        cancelAnimationFrame(saveRafRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const persistScrollPosition = () => {
      sessionStorage.setItem(
        currentKeyRef.current,
        String(getScrollPosition())
      )
    }

    window.addEventListener('beforeunload', persistScrollPosition)
    window.addEventListener('pagehide', persistScrollPosition)
    document.addEventListener('visibilitychange', persistScrollPosition)

    return () => {
      window.removeEventListener('beforeunload', persistScrollPosition)
      window.removeEventListener('pagehide', persistScrollPosition)
      document.removeEventListener('visibilitychange', persistScrollPosition)
    }
  }, [])

  useEffect(() => {
    disableSaveRef.current = true

    if (restoreRafRef.current != null) {
      cancelAnimationFrame(restoreRafRef.current)
      restoreRafRef.current = null
    }

    const savedPosition = sessionStorage.getItem(locationKey)
    const target = savedPosition ? Number(savedPosition) : 0
    const normalizedTarget = Number.isFinite(target) ? target : 0
    const startTime = performance.now()

    const restore = () => {
      const maxScrollable = getMaxScrollable()
      if (
        normalizedTarget > maxScrollable &&
        performance.now() - startTime < RESTORE_TIMEOUT
      ) {
        restoreRafRef.current = window.requestAnimationFrame(restore)
        return
      }

      const finalTarget =
        maxScrollable > 0
          ? Math.min(normalizedTarget, maxScrollable)
          : 0

      window.scrollTo({
        top: finalTarget,
        left: 0,
        behavior: 'auto',
      })

      const currentPos = getScrollPosition()
      if (
        Math.abs(currentPos - finalTarget) <= 1 ||
        performance.now() - startTime >= RESTORE_TIMEOUT
      ) {
        disableSaveRef.current = false
        restoreRafRef.current = null
        return
      }

      restoreRafRef.current = window.requestAnimationFrame(restore)
    }

    restore()

    return () => {
      if (restoreRafRef.current != null) {
        cancelAnimationFrame(restoreRafRef.current)
        restoreRafRef.current = null
      }
    }
  }, [locationKey])

  return null
}
