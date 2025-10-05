import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

import { Skeleton } from './components/ui/skeleton'

import BContainer from './components/base/BContainer'

import { ArticleListItemSkeleton } from './components/ArticleList'
import FeedArticleList from './components/FeedArticleList'

import { NAV_HEIGHT } from './constants/constants'

export default function FeedPage() {
  const [showSkeleton, setShowSkeleton] = useState(false)
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
        isFront: false,
        siteFrontId,
        frontId: 'feed',
        name: feedTitle,
        describe: feedDescription,
      }}
    >
      {showSkeleton && (
        <div
          className="absolute top-0 left-0 w-full z-10 bg-background"
          style={{ height: `calc(100vh - ${NAV_HEIGHT}px)` }}
        >
          <div className="mx-auto container p-4">
            <div className="flex justify-between items-center my-4">
              <Skeleton className="w-[180px] h-[44px]" />
              <Skeleton className="w-[75px] h-[44px]" />
            </div>
            {Array(3)
              .fill('')
              .map((_, idx) => (
                <ArticleListItemSkeleton key={idx} />
              ))}
          </div>
        </div>
      )}

      {initialized && (
        <FeedArticleList
          key={`feed-${siteFrontId || 'global'}`}
          onLoad={() => setShowSkeleton(false)}
          onReady={() => setShowSkeleton(true)}
        />
      )}
    </BContainer>
  )
}
