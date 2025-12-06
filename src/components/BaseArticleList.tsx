import React, {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { noop } from '@/lib/utils'

import { DEFAULT_PAGE_SIZE } from '@/constants/constants'
import { buildRoutePath } from '@/hooks/use-route-match'
import { useDelayedVisibility } from '@/hooks/useDelayedVisibility'
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
  const [list, updateList] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [pageState, setPageState] = useState<ArticleListState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })
  const showSkeleton = useDelayedVisibility(isLoading && isInitialLoad, 200)

  const checkPermit = useAuthedUserStore((state) => state.permit)
  const loginWithDialog = useAuthedUserStore((state) => state.loginWithDialog)
  const checkIsLogined = useAuthedUserStore((state) => state.isLogined)

  const [params, setParams] = useSearchParams()

  const navigate = useNavigate()
  const { t } = useTranslation()

  const sort = (params.get('sort') as ArticleListSort | null) || 'best'

  const submitPath = useMemo(() => {
    const targetPath = customSubmitPath || '/submit'
    return buildRoutePath(targetPath, siteFrontId)
  }, [customSubmitPath, siteFrontId])

  const { setLoading } = useLoading()

  const fetchArticlesRef = React.useRef(fetchArticles)
  const onPageStateChangeRef = React.useRef(onPageStateChange)
  const onLoadRef = React.useRef(onLoad)

  React.useEffect(() => {
    fetchArticlesRef.current = fetchArticles
    onPageStateChangeRef.current = onPageStateChange
    onLoadRef.current = onLoad
  })

  const onSwitchTab = (tab: string) => {
    setParams((prevParams) => {
      prevParams.set('sort', tab)
      return prevParams
    })
  }

  const onSubmitClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()

      if (checkIsLogined()) {
        navigate(submitPath)
        return
      }

      try {
        const authData = await loginWithDialog()
        if (isLogined(authData)) {
          setTimeout(() => {
            navigate(submitPath)
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
      updateList((prevList) =>
        prevList.map((article) =>
          article.id === articleId ? updatedArticle : article
        )
      )
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const page = Number(params.get('page')) || 1
        const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE
        const sort = (params.get('sort') as ArticleListSort | null) || 'best'

        setLoading(true)
        setIsLoading(true)

        const resp = await fetchArticlesRef.current({ page, pageSize, sort })

        if (cancelled) return

        if (!resp.code) {
          const { data } = resp
          const newPageState: ArticleListState = {
            currPage: data.articles ? data.currPage : 1,
            pageSize: data.pageSize,
            total: data.articleTotal,
            totalPage: data.totalPage,
            prevCursor: data.prevCursor,
            nextCursor: data.nextCursor,
            category: data.category,
          }

          updateList(data.articles ? [...data.articles] : [])
          setPageState(newPageState)

          if (onPageStateChangeRef.current) {
            onPageStateChangeRef.current(newPageState)
          }
        }

        if (!cancelled && onLoadRef.current) {
          onLoadRef.current()
        }
      } catch (e) {
        console.error('get article list error: ', e)
      } finally {
        if (!cancelled) {
          setLoading(false)
          setIsLoading(false)
          setIsInitialLoad(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [params, categoryFrontId, siteFrontId, setLoading])

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
