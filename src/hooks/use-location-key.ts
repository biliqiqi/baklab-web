import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

export const useLocationKey = () => {
  const location = useLocation()
  const locationKey = useMemo(
    () => `${location.pathname}${location.search}${location.hash}`,
    [location.pathname, location.search, location.hash]
  )

  return { location, locationKey }
}
