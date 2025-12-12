import { useParams } from '@/lib/router'

import { useSiteFrontId } from '@/hooks/use-site-front-id'

export const useSiteParams = <
  T extends Record<string, string | undefined> = Record<
    string,
    string | undefined
  >,
>(): T & { siteFrontId?: string } => {
  const params = (useParams() as T & { siteFrontId?: string }) || {}
  const fallbackSiteFrontId = useSiteFrontId()

  return {
    ...params,
    siteFrontId: params.siteFrontId || fallbackSiteFrontId,
  } as T & { siteFrontId?: string }
}
