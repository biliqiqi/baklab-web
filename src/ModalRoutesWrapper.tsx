import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useRoutes } from 'react-router-dom'

import { routes } from './routes'

export default function ModalRoutesWrapper() {
  const location = useLocation()

  const state = location.state as {
    backgroundLocation?: {
      pathname: string
      search?: string
      hash?: string
    }
  }

  const backgroundLocation = state?.backgroundLocation

  const effectiveLocation = useMemo(() => {
    if (backgroundLocation) {
      return {
        pathname: backgroundLocation.pathname,
        search: backgroundLocation.search || '',
        hash: backgroundLocation.hash || '',
        state: null,
        key: 'background',
      }
    }
    return location
  }, [backgroundLocation, location])

  const routesElement = useRoutes(routes, effectiveLocation)
  const modalRoutesElement = useRoutes(routes, location)
  const [frozenRoutesElement, setFrozenRoutesElement] = useState(routesElement)

  useEffect(() => {
    if (!backgroundLocation) {
      setFrozenRoutesElement(routesElement)
    }
  }, [backgroundLocation, routesElement])

  const modalContent =
    backgroundLocation && modalRoutesElement
      ? typeof document !== 'undefined'
        ? createPortal(modalRoutesElement, document.body)
        : modalRoutesElement
      : null

  return (
    <>
      {backgroundLocation ? frozenRoutesElement : routesElement}
      {modalContent}
    </>
  )
}
