import { RouteObject } from 'react-router-dom'
import { create } from 'zustand'

import { routes } from '@/routes'

interface RoutesState {
  routes: RouteObject[]
  setRoutes: (routes: RouteObject[]) => void
}

export const useRoutesStore = create<RoutesState>((set) => ({
  routes: routes,
  setRoutes(routes) {
    set((state) => ({ ...state, routes: [...routes] }))
  },
}))
