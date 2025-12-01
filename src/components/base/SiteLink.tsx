import { forwardRef } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

import { buildRoutePath } from '@/hooks/use-route-match'
import { useSiteFrontId } from '@/hooks/use-site-front-id'

export type SiteLinkProps = Omit<LinkProps, 'to'> & {
  to: string
  siteFrontId?: string | null
  useFallbackSiteFrontId?: boolean
}

const SiteLink = forwardRef<HTMLAnchorElement, SiteLinkProps>(
  ({ to, siteFrontId, useFallbackSiteFrontId = true, ...rest }, ref) => {
    const currentSiteFrontId = useSiteFrontId()
    const fallbackSiteFrontId = useFallbackSiteFrontId
      ? currentSiteFrontId
      : undefined
    const finalSiteFrontId =
      siteFrontId !== undefined ? siteFrontId : fallbackSiteFrontId
    const resolvedTo = buildRoutePath(to, finalSiteFrontId ?? undefined)

    return <Link ref={ref} to={resolvedTo} {...rest} />
  }
)

SiteLink.displayName = 'SiteLink'

export default SiteLink
