import { useQueryClient } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { type MouseEventHandler, forwardRef, useCallback } from 'react'

import { Link, type LinkProps } from '@/lib/router'

import { buildRoutePath } from '@/hooks/use-route-match'
import { useSiteFrontId } from '@/hooks/use-site-front-id'
import { useSidebarStore } from '@/state/global'

export type SiteLinkProps = Omit<LinkProps, 'to' | 'onClick'> & {
  to: string
  siteFrontId?: string | null
  useFallbackSiteFrontId?: boolean
  closeSidebarOnClick?: boolean
  onClick?: MouseEventHandler<HTMLAnchorElement>
}

const SiteLink = forwardRef<HTMLAnchorElement, SiteLinkProps>(
  (
    {
      to,
      siteFrontId,
      useFallbackSiteFrontId = true,
      closeSidebarOnClick = false,
      onClick,
      ...rest
    },
    ref
  ) => {
    const currentSiteFrontId = useSiteFrontId()
    const fallbackSiteFrontId = useFallbackSiteFrontId
      ? currentSiteFrontId
      : undefined
    const finalSiteFrontId =
      siteFrontId !== undefined ? siteFrontId : fallbackSiteFrontId
    const resolvedTo = buildRoutePath(to, finalSiteFrontId ?? undefined)
    const closeMobileSidebar = useSidebarStore(
      (state) => state.closeMobileSidebar
    )
    const location = useLocation()
    const queryClient = useQueryClient()

    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = useCallback(
      (event) => {
        const currentPath = location.pathname
        const currentSearch = location.search

        const targetUrl = new URL(resolvedTo, window.location.origin)
        const targetPath = targetUrl.pathname
        const targetSearch = targetUrl.search

        const normalizeSearch = (search: string | Record<string, unknown>) => {
          if (typeof search === 'string') {
            return search
          }
          if (typeof search === 'object' && Object.keys(search).length === 0) {
            return ''
          }
          return new URLSearchParams(
            search as Record<string, string>
          ).toString()
        }

        const normalizedCurrentSearch = normalizeSearch(currentSearch)
        const normalizedTargetSearch = normalizeSearch(targetSearch)

        const isCurrentPage =
          currentPath === targetPath &&
          normalizedCurrentSearch === normalizedTargetSearch

        if (isCurrentPage) {
          event.preventDefault()

          const scrollKeys = Object.keys(sessionStorage).filter((key) =>
            key.startsWith('scroll-')
          )
          scrollKeys.forEach((key) => sessionStorage.removeItem(key))

          void queryClient.refetchQueries({
            queryKey: ['articles'],
            type: 'active',
          })

          requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          })
        }

        if (closeSidebarOnClick) {
          closeMobileSidebar()
        }
        onClick?.(event)
      },
      [
        closeSidebarOnClick,
        closeMobileSidebar,
        onClick,
        location,
        resolvedTo,
        queryClient,
      ]
    )

    return <Link ref={ref} to={resolvedTo} onClick={handleClick} {...rest} />
  }
)

SiteLink.displayName = 'SiteLink'

export default SiteLink
