import { useLocation } from '@tanstack/react-router'

import { useSiteFrontId } from '@/hooks/use-site-front-id'
import { useContextStore } from '@/state/global'

interface RouteMatchOptions {
  exact?: boolean
  caseSensitive?: boolean
}

/**
 * Unified route matching hook that automatically handles both platform-wide and site-specific paths
 *
 * @param path - Path pattern, e.g., '/all', '/feed', '/bankuai'
 * @param options - Matching options
 * @returns Whether the current path matches
 */
export function useRouteMatch(path: string, options: RouteMatchOptions = {}) {
  const location = useLocation()
  const siteFrontId = useSiteFrontId()
  const { exact = true, caseSensitive = false } = options

  const currentPath = caseSensitive
    ? location.pathname
    : location.pathname.toLowerCase()
  const normalizedPath = caseSensitive ? path : path.toLowerCase()

  // Build possible path patterns
  const patterns = []

  // Platform-wide path
  patterns.push(normalizedPath)

  // Site-specific path (support both /zhandian and /z prefixes)
  if (siteFrontId) {
    const sitePath = normalizedPath === '/' ? '' : normalizedPath
    patterns.push(`/zhandian/${siteFrontId}${sitePath}`)
    patterns.push(`/z/${siteFrontId}${sitePath}`)
  }

  // Check for matches
  if (exact) {
    return patterns.includes(currentPath)
  } else {
    return patterns.some((pattern) => currentPath.startsWith(pattern))
  }
}

/**
 * Build route path, automatically handling platform-wide and site-specific modes
 *
 * @param path - Path pattern, e.g., '/all', '/feed', '/bankuai'
 * @param siteFrontId - Site front ID
 * @returns Built complete path
 */
export function buildRoutePath(path: string, siteFrontId?: string) {
  const contextState = useContextStore.getState()
  if (contextState.isSingleSite) {
    return path
  }

  if (siteFrontId) {
    const sitePath = path === '/' ? '' : path
    return `/z/${siteFrontId}${sitePath}`
  }

  return path
}

/**
 * Menu item configuration interface
 */
export interface MenuItemConfig {
  id: string
  path: string
  name: string
  icon: JSX.Element
  exact?: boolean
  caseSensitive?: boolean
  title?: string
  visible?: boolean
}

/**
 * Hook for using menu configuration
 * Note: This approach is not ideal due to React Hook rules.
 * Better to call useRouteMatch directly in component for each menu item.
 *
 * @param menuItems - Menu item configurations
 * @returns Menu items with matching status and paths
 */
export function useMenuItems(menuItems: MenuItemConfig[]) {
  const siteFrontId = useSiteFrontId()

  return menuItems.map((item) => ({
    ...item,
    // Note: Cannot call useRouteMatch here due to Hook rules
    // Must be called in the component instead
    href: buildRoutePath(item.path, siteFrontId),
    visible: item.visible !== false,
  }))
}
