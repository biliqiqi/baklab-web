import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import BContainer from './components/base/BContainer'

import ArticleList from './components/ArticleList'

import { useSiteParams } from '@/hooks/use-site-params'

export default function TagPage() {
  const { t } = useTranslation()
  const { siteFrontId, tagName } = useSiteParams()

  const decodedTagName = useMemo(() => {
    if (!tagName) return ''
    return decodeURIComponent(tagName)
  }, [tagName])

  return (
    <BContainer
      category={{
        isFront: true,
        siteFrontId,
        frontId: 'tag',
        name: decodedTagName,
        describe: t('tagPageDescribe', { tagName: decodedTagName }),
      }}
    >
      <ArticleList key={decodedTagName} tagName={decodedTagName} />
    </BContainer>
  )
}
