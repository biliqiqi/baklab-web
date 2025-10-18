import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

import BContainer from './components/base/BContainer'

import FeedArticleList from './components/FeedArticleList'

export default function FeedPage() {
  const [initialized, setInitialized] = useState(false)

  const { siteFrontId } = useParams()
  const { t } = useTranslation()

  const feedTitle = siteFrontId ? t('siteFeed') : t('feed')
  const feedDescription = siteFrontId
    ? t('siteFeedDescription')
    : t('feedDescription')

  // Clear state immediately when route params change
  useEffect(() => {
    setInitialized(false)
  }, [siteFrontId])

  useEffect(() => {
    setInitialized(true)
  }, [siteFrontId])

  return (
    <BContainer
      category={{
        isFront: true,
        siteFrontId,
        frontId: 'feed',
        name: feedTitle,
        describe: feedDescription,
      }}
    >
      {initialized && (
        <FeedArticleList key={`feed-${siteFrontId || 'global'}`} />
      )}
    </BContainer>
  )
}
