import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { Skeleton } from './components/ui/skeleton'

import BContainer from './components/base/BContainer'

import ArticleList, { ArticleListItemSkeleton } from './components/ArticleList'
import { ChatCardSkeleton } from './components/ChatCard'

import ChatPage from './ChatPage'
import { getCategoryWithFrontId } from './api/category'
import { DEFAULT_INNER_CONTENT_WIDTH, NAV_HEIGHT } from './constants/constants'
import { toSync } from './lib/fire-and-forget'
import { useUserUIStore } from './state/global'
import { Category } from './types/types'

export default function BankuaiPage() {
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [serverCate, setServerCate] = useState<Category | null>(null)
  const [initialized, setInitialized] = useState(false)

  const { state, pathname } = useLocation() as {
    state: Category | undefined
    pathname: string
  }

  const currCate = useMemo(() => state || serverCate, [state, serverCate])
  const { siteFrontId, categoryFrontId } = useParams()
  const { t } = useTranslation()

  const isAllPage = useMemo(
    () => pathname === '/all' || pathname === `/${siteFrontId}/all`,
    [pathname, siteFrontId]
  )

  const isChat = useMemo(
    () => currCate?.contentForm?.frontId == 'chat',
    [currCate]
  )

  // const { innerContentWidth } = useUserUIStore(
  //   useShallow(({ innerContentWidth }) => ({
  //     innerContentWidth: innerContentWidth || DEFAULT_INNER_CONTENT_WIDTH,
  //   }))
  // )

  // Clear state immediately when route params change
  useEffect(() => {
    setServerCate(null)
    setInitialized(false)
  }, [siteFrontId, categoryFrontId])

  useEffect(() => {
    if (!currCate && siteFrontId && categoryFrontId) {
      toSync(getCategoryWithFrontId, (data) => {
        if (!data.code) {
          setServerCate(data.data)
          setInitialized(true)
        }
      })(categoryFrontId, { siteFrontId })
    } else {
      setInitialized(true)
    }

    /* return () => {
     *   setShowSkeleton(true)
     * } */
  }, [currCate, categoryFrontId, siteFrontId])

  return (
    <BContainer
      category={{
        isFront: false,
        siteFrontId,
        frontId: isAllPage ? 'all' : currCate?.frontId || 'bankuai',
        name: isAllPage ? t('allPosts') : currCate?.name || '',
        describe: isAllPage
          ? siteFrontId
            ? t('siteAllPostsDescription')
            : t('allPostsDescription')
          : currCate?.describe || '',
      }}
    >
      {showSkeleton && (
        <div
          className="absolute top-0 left-0 w-full z-10 bg-background"
          style={{ height: `calc(100vh - ${NAV_HEIGHT}px)` }}
        >
          <div
            className="mx-auto"
            // style={{ maxWidth: `${innerContentWidth}px` }}
          >
            {!(currCate && isChat) && (
              <div className="flex justify-between items-center my-4">
                <Skeleton className="w-[180px] h-[44px]" />
                <Skeleton className="w-[75px] h-[44px]" />
              </div>
            )}
            {Array(3)
              .fill('')
              .map((_, idx) =>
                currCate && isChat ? (
                  <ChatCardSkeleton key={idx} />
                ) : (
                  <ArticleListItemSkeleton key={idx} />
                )
              )}
          </div>
        </div>
      )}

      {initialized &&
        (currCate && isChat ? (
          <ChatPage
            currCate={currCate}
            onLoad={() => setShowSkeleton(false)}
            onReady={() => setShowSkeleton(true)}
          />
        ) : (
          <ArticleList
            onLoad={() => setShowSkeleton(false)}
            onReady={() => setShowSkeleton(true)}
          />
        ))}
    </BContainer>
  )
}
