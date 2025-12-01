import { useParams } from 'react-router-dom'

import { useContextStore, useSiteStore } from '@/state/global'

export const useSiteFrontId = (): string | undefined => {
  const { siteFrontId } = useParams<{ siteFrontId?: string }>()
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
