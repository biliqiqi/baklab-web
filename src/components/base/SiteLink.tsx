import { forwardRef, useCallback } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

import { buildRoutePath } from '@/hooks/use-route-match'
import { useSiteFrontId } from '@/hooks/use-site-front-id'
import { useSidebarStore } from '@/state/global'

export type SiteLinkProps = Omit<LinkProps, 'to'> & {
  to: string
  siteFrontId?: string | null
  useFallbackSiteFrontId?: boolean
  closeSidebarOnClick?: boolean
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

    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = useCallback(
      (event) => {
        if (closeSidebarOnClick) {
          closeMobileSidebar()
        }
        onClick?.(event)
      },
      [closeSidebarOnClick, closeMobileSidebar, onClick]
    )

    return <Link ref={ref} to={resolvedTo} onClick={handleClick} {...rest} />
  }
)

SiteLink.displayName = 'SiteLink'

export default SiteLink
