import { useParams } from '@/lib/router'

import { useContextStore, useSiteStore } from '@/state/global'

export const useSiteFrontId = (): string | undefined => {
  const params = useParams()
  const siteFrontId = 'siteFrontId' in params ? params.siteFrontId : undefined
  const contextSiteFrontId = useContextStore((state) => state.site?.frontId)
  const isSingleSite = useContextStore((state) => state.isSingleSite)
  const storedSiteFrontId = useSiteStore((state) => state.site?.frontId)

  if (siteFrontId) {
    return siteFrontId
  }

  if (isSingleSite) {
    return contextSiteFrontId || storedSiteFrontId
  }

  return undefined
}
