import { useEffect } from 'react'

import { PLATFORM_NAME } from '@/constants/constants'
import { useSiteStore } from '@/state/global'

export default function useDocumentTitle(title: string) {
  const siteState = useSiteStore.getState()
  useEffect(() => {
    let siteName = PLATFORM_NAME
    if (siteState.site) {
      siteName = siteState.site.name
    }
    const prevTitle = document.title
    document.title = title ? `${title} - ${siteName}` : siteName

    return () => {
      document.title = prevTitle
    }
  }, [title, siteState])
}
