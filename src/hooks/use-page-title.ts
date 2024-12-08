import { useEffect } from 'react'

import { SITE_NAME_CN } from '@/constants/constants'

export default function useDocumentTitle(title: string) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title ? `${title} - ${SITE_NAME_CN}` : SITE_NAME_CN
    return () => {
      document.title = prevTitle
    }
  }, [title])
}
