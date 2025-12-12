import { useLocation } from '@tanstack/react-router'
import { useMemo } from 'react'

export const useLocationKey = () => {
  const location = useLocation()
  const searchString = useMemo(
    () => JSON.stringify(location.search ?? {}),
    [location.search]
  )
  const locationKey = useMemo(() => {
    const hash =
      typeof location.hash === 'string' ? location.hash : ''
    return `${location.pathname}${searchString}${hash}`
  }, [location.pathname, searchString, location.hash])

  return { location, locationKey }
}
