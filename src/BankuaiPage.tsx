import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { Skeleton } from './components/ui/skeleton'

import BContainer from './components/base/BContainer'

import { ChatCardSkeleton } from './components/ChatCard'

import ArticleListPage, { ArticleListItemSkeleton } from './ArticleListPage'
import ChatPage from './ChatPage'
import { getCategoryWithFrontId } from './api/category'
import { DEFAULT_INNER_CONTENT_WIDTH, NAV_HEIGHT } from './constants/constants'
import { toSync } from './lib/fire-and-forget'
import { useUserUIStore } from './state/global'
import { Category } from './types/types'

export default function BankuaiPage() {
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [serverCate, setServerCate] = useState<Category | null>(null)
  const { state } = useLocation() as { state: Category | undefined }

  const currCate = useMemo(() => state || serverCate, [state, serverCate])
  const { siteFrontId, categoryFrontId } = useParams()

  const isChat = useMemo(
    () => currCate?.contentForm?.frontId == 'chat',
    [currCate]
  )

  const { innerContentWidth } = useUserUIStore(
    useShallow(({ innerContentWidth }) => ({
      innerContentWidth: innerContentWidth || DEFAULT_INNER_CONTENT_WIDTH,
    }))
  )

  useEffect(() => {
    if (!currCate && categoryFrontId) {
      toSync(getCategoryWithFrontId, (data) => {
        if (!data.code) {
          setServerCate(data.data)
        }
      })(categoryFrontId, { siteFrontId })
    }

    return () => {
      setShowSkeleton(true)
    }
  }, [currCate, categoryFrontId, siteFrontId])

  return (
    <BContainer
      category={{
        isFront: false,
        siteFrontId,
        frontId: currCate?.frontId || 'bankuai',
        name: currCate?.name || '',
        describe: currCate?.describe || '',
      }}
    >
      {showSkeleton && (
        <div
          className="absolute top-0 left-0 w-full z-10 bg-background"
          style={{ height: `calc(100vh - ${NAV_HEIGHT}px)` }}
        >
          <div
            className="mx-auto"
            style={{ maxWidth: `${innerContentWidth}px` }}
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

      {currCate && isChat ? (
        <ChatPage
          currCate={currCate}
          key={`chat_list_${siteFrontId}_${currCate?.frontId}`}
          onLoad={() => setShowSkeleton(false)}
        />
      ) : (
        <ArticleListPage onLoad={() => setShowSkeleton(false)} />
      )}
    </BContainer>
  )
}
