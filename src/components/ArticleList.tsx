import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { noop } from '@/lib/utils'

import { getArticleList } from '@/api/article'
import { useSiteUIStore, useUserUIStore } from '@/state/global'
import { ArticleListState, Category } from '@/types/types'

import BaseArticleList, {
  FetchArticlesParams,
  FetchArticlesResponse,
} from './BaseArticleList'
import { Skeleton } from './ui/skeleton'

interface ArticleListProps {
  onLoad?: () => void
  onReady?: () => void
}

const ArticleList: React.FC<ArticleListProps> = ({
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

  const [currCate, setCurrCate] = useState<Category | null>(null)
  const { siteFrontId, categoryFrontId } = useParams()

  const submitPath = useMemo(
    () =>
      categoryFrontId && currCate
        ? `/z/${siteFrontId}/submit?category_id=` + currCate.id
        : `/z/${siteFrontId}/submit`,
    [currCate, siteFrontId, categoryFrontId]
  )

  const fetchArticles = useCallback(
    async (params: FetchArticlesParams): Promise<FetchArticlesResponse> => {
      const resp = await getArticleList(
        params.page,
        params.pageSize,
        params.sort,
        categoryFrontId,
        '',
        undefined,
        '',
        undefined,
        { siteFrontId }
      )
      const { category, ...rest } = resp.data
      return {
        ...resp,
        data: {
          ...rest,
          category: category
            ? {
                id: category.id,
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
    [siteFrontId, categoryFrontId]
  )

  const handlePageStateChange = useCallback((pageState: ArticleListState) => {
    if (pageState.category) {
      setCurrCate({ ...pageState.category } as unknown as Category)
    } else {
      setCurrCate(null)
    }
  }, [])

  useEffect(() => {
    onReady()
  }, [siteFrontId, categoryFrontId])

  return (
    <div key={categoryFrontId}>
      <BaseArticleList
        fetchArticles={fetchArticles}
        siteFrontId={siteFrontId}
        categoryFrontId={categoryFrontId}
        submitPath={submitPath}
        onLoad={onLoad}
        onReady={noop}
        onPageStateChange={handlePageStateChange}
        mode={articleListMode}
      />
    </div>
  )
}

export const ArticleListItemSkeleton = () => (
  <div className="p-3 border-b-[1px]">
    <div className="mb-3">
      <Skeleton className="w-3/4 h-[24px] mb-2" />
      <Skeleton className="w-1/2 h-[16px]" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="w-[60px] h-[24px]" />
      <Skeleton className="w-[60px] h-[24px]" />
      <Skeleton className="w-[80px] h-[24px]" />
    </div>
  </div>
)

export default ArticleList
