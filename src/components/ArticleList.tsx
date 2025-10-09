import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { noop } from '@/lib/utils'

import { getArticleList } from '@/api/article'
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
  const [currCate, setCurrCate] = useState<Category | null>(null)
  const { siteFrontId, categoryFrontId } = useParams()

  const submitPath = useMemo(
    () =>
      categoryFrontId && currCate
        ? `/${siteFrontId}/submit?category_id=` + currCate.id
        : `/${siteFrontId}/submit`,
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
        submitPath={submitPath}
        onLoad={onLoad}
        onReady={noop}
        onPageStateChange={handlePageStateChange}
      />
    </div>
  )
}

export const ArticleListItemSkeleton = () => (
  <Skeleton className="p-3 my-2 h-[107px]"></Skeleton>
)

export default ArticleList
