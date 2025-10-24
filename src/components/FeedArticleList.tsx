import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import { noop } from '@/lib/utils'

import { getFeedList } from '@/api/article'
import { useUserUIStore } from '@/state/global'

import BaseArticleList, {
  FetchArticlesParams,
  FetchArticlesResponse,
} from './BaseArticleList'

interface FeedArticleLisProps {
  onLoad?: () => void
  onReady?: () => void
}

const FeedArticleLis: React.FC<FeedArticleLisProps> = ({
  onLoad = noop,
  onReady = noop,
}) => {
  const articleListMode = useUserUIStore((state) => state.articleListMode)
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [listLength, setListLength] = useState(0)
  const [params] = useSearchParams()
  const { siteFrontId } = useParams()

  const submitPath = useMemo(
    () => (siteFrontId ? `/z/${siteFrontId}/submit` : `/submit`),
    [siteFrontId]
  )

  const fetchArticles = useCallback(
    async (
      fetchParams: FetchArticlesParams
    ): Promise<FetchArticlesResponse> => {
      const keywords = params.get('keywords') || ''
      const resp = await getFeedList(
        fetchParams.page,
        fetchParams.pageSize,
        fetchParams.sort,
        keywords,
        { siteFrontId }
      )
      const { category, ...rest } = resp.data
      return {
        ...resp,
        data: {
          ...rest,
          category: category
            ? {
                frontId: category.frontId,
                name: category.name,
                describe: category.describe,
                siteFrontId: category.siteFrontId,
                isFront: true,
              }
            : undefined,
        },
      }
    },
    [siteFrontId, params]
  )

  const handleLoad = useCallback(() => {
    if (isFirstLoad) {
      setIsFirstLoad(false)
    }
    onLoad()
  }, [isFirstLoad, onLoad])

  useEffect(() => {
    if (isFirstLoad) {
      onReady()
    }
  }, [isFirstLoad])

  return (
    <BaseArticleList
      fetchArticles={fetchArticles}
      siteFrontId={siteFrontId}
      submitPath={submitPath}
      showTabsCondition={listLength > 0}
      onLoad={handleLoad}
      onReady={noop}
      onPageStateChange={(pageState) => {
        setListLength(pageState.total)
      }}
      mode={articleListMode}
    />
  )
}

export default FeedArticleLis
