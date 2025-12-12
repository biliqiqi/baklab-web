import { useQuery } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import React, {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import { Link, useNavigate, useSearch } from '@/lib/router'
import { updateSearchParams, withSearchUpdater } from '@/lib/search'
import { noop } from '@/lib/utils'

import { DEFAULT_PAGE_SIZE } from '@/constants/constants'
import { buildRoutePath } from '@/hooks/use-route-match'
import { isLogined, useAuthedUserStore, useLoading } from '@/state/global'
import {
  ARTICLE_LIST_MODE,
  Article,
  ArticleListMode,
  ArticleListSort,
  ArticleListState,
  FrontCategory,
} from '@/types/types'

import { ArticleListItemSkeleton } from './ArticleList'
import ArticleListItem from './ArticleListItem'
import { Empty } from './Empty'
import { ListPagination } from './ListPagination'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'

export interface FetchArticlesParams {
  page: number
  pageSize: number
  sort: ArticleListSort
}

export interface FetchArticlesData {
  articles: Article[] | null
  currPage: number
  pageSize: number
  articleTotal: number
  totalPage: number
  prevCursor?: string
  nextCursor?: string
  category?: FrontCategory
}

export interface FetchArticlesResponse {
  code: number
  data: FetchArticlesData
}

interface BaseArticleListProps {
  fetchArticles: (params: FetchArticlesParams) => Promise<FetchArticlesResponse>
  siteFrontId?: string
  categoryFrontId?: string
  isFeedList?: boolean
  submitPath?: string
  showTabsCondition?: boolean
  onLoad?: () => void
  onReady?: () => void
  onPageStateChange?: (pageState: ArticleListState) => void
  mode?: ArticleListMode
}

const BaseArticleList: React.FC<BaseArticleListProps> = ({
  fetchArticles,
  siteFrontId,
  categoryFrontId,
  isFeedList = false,
  submitPath: customSubmitPath,
  showTabsCondition = true,
  onLoad = noop,
  onPageStateChange,
  mode = ARTICLE_LIST_MODE.Compact,
}) => {
  const [pageState, setPageState] = useState<ArticleListState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const checkPermit = useAuthedUserStore((state) => state.permit)
  const loginWithDialog = useAuthedUserStore((state) => state.loginWithDialog)
  const checkIsLogined = useAuthedUserStore((state) => state.isLogined)

  const search = useSearch()

  const navigate = useNavigate()
  const { t } = useTranslation()

  const page = Number(search.page) || 1
  const pageSize = Number(search.page_size) || DEFAULT_PAGE_SIZE
  const sort = (search.sort as ArticleListSort | null) || 'best'

  const prevSiteFrontIdRef = useRef(siteFrontId)
  const prevCategoryFrontIdRef = useRef(categoryFrontId)

  const siteOrCategoryChanged =
    prevSiteFrontIdRef.current !== siteFrontId ||
    prevCategoryFrontIdRef.current !== categoryFrontId

  useEffect(() => {
    prevSiteFrontIdRef.current = siteFrontId
    prevCategoryFrontIdRef.current = categoryFrontId
  }, [siteFrontId, categoryFrontId])

  const {
    data: queryData,
    isLoading,
    isFetching,
    isPlaceholderData,
  } = useQuery({
    queryKey: [
      'articles',
      categoryFrontId,
      siteFrontId,
      isFeedList,
      page,
      pageSize,
      sort,
    ],
    queryFn: () => fetchArticles({ page, pageSize, sort }),
    staleTime: 1000 * 60 * 5,
    placeholderData: siteOrCategoryChanged
      ? undefined
      : (previousData) => previousData,
  })

  const list = queryData?.data.articles || []
  const showSkeleton = isLoading && !isPlaceholderData

  const location = useLocation()
  const scrollRestoredRef = useRef(false)
  const prevScrollKeyRef = useRef('')
  const isPaginationClickRef = useRef(false)

  const scrollKey = useMemo(
    () =>
      `scroll-${location.pathname}-${siteFrontId || 'platform'}-${categoryFrontId || 'all'}-${page}-${sort}`,
    [location.pathname, siteFrontId, categoryFrontId, page, sort]
  )

  useEffect(() => {
    if (prevScrollKeyRef.current !== scrollKey) {
      scrollRestoredRef.current = false
      prevScrollKeyRef.current = scrollKey
    }
  }, [scrollKey])

  const submitPath = useMemo(() => {
    const targetPath = customSubmitPath || '/submit'
    return buildRoutePath(targetPath, siteFrontId)
  }, [customSubmitPath, siteFrontId])

  const { setLoading } = useLoading()

  const onPageStateChangeRef = React.useRef(onPageStateChange)
  const onLoadRef = React.useRef(onLoad)

  React.useEffect(() => {
    onPageStateChangeRef.current = onPageStateChange
    onLoadRef.current = onLoad
  })

  const onSwitchTab = (tab: string) => {
    navigate({
      search: withSearchUpdater((prev) =>
        updateSearchParams(prev, { sort: tab })
      ),
    })
  }

  const onSubmitClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()

      if (checkIsLogined()) {
        navigate({ to: submitPath })
        return
      }

      try {
        const authData = await loginWithDialog()
        if (isLogined(authData)) {
          setTimeout(() => {
            navigate({ to: submitPath })
          }, 0)
        }
      } catch (err) {
        console.error('submit click error: ', err)
      }
    },
    [submitPath, navigate, checkIsLogined, loginWithDialog]
  )

  const handleArticleUpdate = useCallback((articleId: string) => {
    return (updatedArticle: Article) => {
      // Note: With TanStack Query, direct list updates are handled differently
      // Consider using query invalidation or optimistic updates
      console.log('Article update:', articleId, updatedArticle)
    }
  }, [])

  useEffect(() => {
    setLoading(isFetching)
  }, [isFetching, setLoading])

  useEffect(() => {
    if (queryData && !queryData.code) {
      const { data } = queryData
      const newPageState: ArticleListState = {
        currPage: data.articles ? data.currPage : 1,
        pageSize: data.pageSize,
        total: data.articleTotal,
        totalPage: data.totalPage,
        prevCursor: data.prevCursor,
        nextCursor: data.nextCursor,
        category: data.category,
      }

      setPageState(newPageState)

      if (onPageStateChangeRef.current) {
        onPageStateChangeRef.current(newPageState)
      }

      if (!isFetching && onLoadRef.current) {
        onLoadRef.current()
      }
    }
  }, [queryData, isFetching])

  useEffect(() => {
    const isPaginationClick =
      sessionStorage.getItem('__pagination_click__') === 'true'

    if (isPaginationClick && !isFetching && !scrollRestoredRef.current) {
      sessionStorage.removeItem('__pagination_click__')
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(() => {
          window.scrollTo({
            top: 0,
            behavior: 'smooth',
          })
          scrollRestoredRef.current = true
        })
      }, 50)

      return () => clearTimeout(timeoutId)
    }

    if (!showSkeleton && !isFetching && !scrollRestoredRef.current) {
      const savedScrollPosition = sessionStorage.getItem(scrollKey)
      if (savedScrollPosition) {
        const timeoutId = setTimeout(() => {
          requestAnimationFrame(() => {
            const targetScroll = parseInt(savedScrollPosition, 10)
            window.scrollTo({
              top: targetScroll,
              behavior: 'instant',
            })
            scrollRestoredRef.current = true
          })
        }, 50)

        return () => clearTimeout(timeoutId)
      } else {
        scrollRestoredRef.current = true
      }
    }
  }, [showSkeleton, isFetching, scrollKey])

  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(scrollKey, String(window.scrollY))
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [scrollKey])

  return (
    <>
      <div className="flex justify-between items-center">
        <div>
          {showTabsCondition && (
            <Tabs defaultValue="best" value={sort} onValueChange={onSwitchTab}>
              <TabsList>
                <TabsTrigger value="best">{t('best')}</TabsTrigger>
                <TabsTrigger value="latest">{t('latest')}</TabsTrigger>
                <TabsTrigger value="list_hot">{t('hot')}</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
        <div>
          {siteFrontId && checkPermit('article', 'create') && (
            <Button variant="outline" size="sm" asChild onClick={onSubmitClick}>
              <Link to={submitPath}>+ {t('submit')}</Link>
            </Button>
          )}
        </div>
      </div>
      <div className="mt-4">
        {showSkeleton ? (
          mode == ARTICLE_LIST_MODE.Compact ? (
            <Card>
              {Array(8)
                .fill('')
                .map((_, idx) => (
                  <ArticleListItemSkeleton key={idx} mode="compact" />
                ))}
            </Card>
          ) : (
            <>
              {Array(8)
                .fill('')
                .map((_, idx) => (
                  <Card className="mb-3" key={idx}>
                    <ArticleListItemSkeleton mode="preview" />
                  </Card>
                ))}
            </>
          )
        ) : list.length == 0 ? (
          <Empty />
        ) : mode == ARTICLE_LIST_MODE.Compact ? (
          <Card>
            {list.map((item) => (
              <ArticleListItem
                key={item.id}
                article={item}
                siteFrontId={siteFrontId}
                categoryFrontId={categoryFrontId}
                isFeedList={isFeedList}
                onUpdate={handleArticleUpdate(item.id)}
                mode={mode}
              />
            ))}
          </Card>
        ) : (
          <>
            {list.map((item) => (
              <Card className="mb-3" key={item.id}>
                <ArticleListItem
                  article={item}
                  siteFrontId={siteFrontId}
                  categoryFrontId={categoryFrontId}
                  isFeedList={isFeedList}
                  onUpdate={handleArticleUpdate(item.id)}
                  mode={mode}
                />
              </Card>
            ))}
          </>
        )}
      </div>

      {pageState.totalPage > 1 && (
        <ListPagination pageState={pageState} autoScrollTop />
      )}
    </>
  )
}

export default BaseArticleList
