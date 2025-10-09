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
import { defaultPageState } from '@/constants/defaults'
import { isLogined, useAuthedUserStore, useLoading } from '@/state/global'
import {
  Article,
  ArticleListSort,
  ArticleListState,
  FrontCategory,
} from '@/types/types'

import ArticleListItem from './ArticleListItem'
import { Empty } from './Empty'
import { ListPagination } from './ListPagination'
import { Button } from './ui/button'
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
  submitPath?: string
  showTabsCondition?: boolean
  onLoad?: () => void
  onReady?: () => void
  onPageStateChange?: (pageState: ArticleListState) => void
}

const BaseArticleList: React.FC<BaseArticleListProps> = ({
  fetchArticles,
  siteFrontId,
  submitPath: customSubmitPath,
  showTabsCondition = true,
  onLoad = noop,
  onPageStateChange,
}) => {
  const [showSummary] = useState(false)
  const [list, updateList] = useState<Article[]>([])
  const [pageState, setPageState] = useState<ArticleListState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const checkPermit = useAuthedUserStore((state) => state.permit)
  const loginWithDialog = useAuthedUserStore((state) => state.loginWithDialog)
  const checkIsLogined = useAuthedUserStore((state) => state.isLogined)

  const [params, setParams] = useSearchParams()

  const navigate = useNavigate()
  const { t } = useTranslation()

  const sort = (params.get('sort') as ArticleListSort | null) || 'best'

  const submitPath = useMemo(
    () =>
      customSubmitPath || (siteFrontId ? `/${siteFrontId}/submit` : `/submit`),
    [customSubmitPath, siteFrontId]
  )

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
        }
      }
    }

    void load()

    return () => {
      cancelled = true
      updateList([])
      setPageState({
        ...defaultPageState,
      })
    }
  }, [params, setLoading, fetchArticles])

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
            <Button size="sm" asChild onClick={onSubmitClick}>
              <Link to={submitPath}>+ {t('submit')}</Link>
            </Button>
          )}
        </div>
      </div>
      <div className="mt-4">
        {list.length == 0 ? (
          <Empty />
        ) : (
          list.map((item) => (
            <ArticleListItem
              key={item.id}
              article={item}
              showSummary={showSummary}
              siteFrontId={siteFrontId}
              onUpdate={handleArticleUpdate(item.id)}
            />
          ))
        )}
      </div>

      {pageState.totalPage > 1 && (
        <ListPagination pageState={pageState} autoScrollTop />
      )}
    </>
  )
}

export default BaseArticleList
