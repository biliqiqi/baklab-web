import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { noop } from '@/lib/utils'

import { getFeedList } from '@/api/article'
import { useSiteParams } from '@/hooks/use-site-params'
import { useSiteUIStore, useUserUIStore } from '@/state/global'

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
  const userArticleListMode = useUserUIStore((state) => state.articleListMode)
  const siteArticleListMode = useSiteUIStore((state) => state.articleListMode)
  const isSiteUIPreview = useSiteUIStore((state) => state.isSiteUIPreview)

  const articleListMode = isSiteUIPreview
    ? siteArticleListMode
    : userArticleListMode !== undefined
      ? userArticleListMode
      : siteArticleListMode

  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [listLength, setListLength] = useState(0)
  const [params] = useSearchParams()
  const { siteFrontId } = useSiteParams()

  const submitPath = useMemo(() => `/submit`, [])

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
  }, [isFirstLoad, onReady])

  return (
    <BaseArticleList
      fetchArticles={fetchArticles}
      siteFrontId={siteFrontId}
      isFeedList={true}
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
