import { SquareArrowOutUpRightIcon } from 'lucide-react'
import React, {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Skeleton } from './components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'
import { Card } from '@/components/ui/card'

import ArticleControls from './components/ArticleControls'
import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'

import { getArticleList } from './api/article'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { defaultPageState } from './constants/defaults'
import { toSync } from './lib/fire-and-forget'
import {
  extractDomain,
  genArticlePath,
  getArticleStatusName,
  noop,
  renderMD,
} from './lib/utils'
import { isLogined, useAuthedUserStore, useLoading } from './state/global'
import {
  Article,
  ArticleListSort,
  ArticleListState,
  Category,
  FrontCategory,
} from './types/types'

/* const articleList = mockArticleList as Article[] */

interface ArticleListPageProps {
  onLoad?: () => void
  onReady?: () => void
}

const ArticleListPage: React.FC<ArticleListPageProps> = ({
  onLoad = noop,
  onReady = noop,
}) => {
  const [showSummary] = useState(false)
  const [currCate, setCurrCate] = useState<Category | null>(null)
  const [list, updateList] = useState<Article[]>([])
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [pageState, setPageState] = useState<ArticleListState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const isMySelf = useAuthedUserStore((state) => state.isMySelf)
  const checkPermit = useAuthedUserStore((state) => state.permit)
  const loginWithDialog = useAuthedUserStore((state) => state.loginWithDialog)
  const checkIsLogined = useAuthedUserStore((state) => state.isLogined)

  const [params, setParams] = useSearchParams()
  const { siteFrontId, categoryFrontId } = useParams()

  const navigate = useNavigate()
  /* const siteStore = useSiteStore() */
  const { t } = useTranslation()

  const sort = (params.get('sort') as ArticleListSort | null) || 'best'

  const submitPath = useMemo(
    () =>
      categoryFrontId && currCate
        ? `/${siteFrontId}/submit?category_id=` + currCate.id
        : `/${siteFrontId}/submit`,
    [currCate, siteFrontId, categoryFrontId]
  )

  const { setLoading } = useLoading()

  const fetchArticles = useCallback(
    async (showLoading = true) => {
      try {
        const page = Number(params.get('page')) || 1
        const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE
        const sort = (params.get('sort') as ArticleListSort | null) || 'best'

        if (showLoading) {
          setLoading(true)
        }

        /* if (!siteFrontId) return */

        const resp = await getArticleList(
          page,
          pageSize,
          sort,
          categoryFrontId,
          '',
          undefined,
          '',
          undefined,
          { siteFrontId }
        )
        if (!resp.code) {
          const { data } = resp
          let category: FrontCategory | undefined
          if (data.category) {
            const { frontId, name, describe, siteFrontId } = data.category
            setCurrCate({ ...data.category })
            category = { frontId, name, describe, siteFrontId } as FrontCategory
          } else {
            setCurrCate(null)
          }

          if (data.articles) {
            updateList([...data.articles])
            setPageState({
              currPage: data.currPage,
              pageSize: data.pageSize,
              total: data.articleTotal,
              totalPage: data.totalPage,
              category,
              prevCursor: data.prevCursor,
              nextCursor: data.nextCursor,
            })
          } else {
            updateList([])
            setPageState({
              currPage: 1,
              pageSize: data.pageSize,
              total: data.articleTotal,
              totalPage: data.totalPage,
              category,
              prevCursor: data.prevCursor,
              nextCursor: data.nextCursor,
            })
          }
        }
      } catch (e) {
        console.error('get article list error: ', e)
      } finally {
        setLoading(false)
      }
    },
    [params, siteFrontId, categoryFrontId, setLoading, setCurrCate]
  )

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
        /* console.log('authData success', authData) */
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

  /* console.log('list: ', list) */
  useEffect(() => {
    if (isFirstLoad) {
      onReady()
    }
    toSync(fetchArticles, () => {
      setTimeout(() => {
        if (isFirstLoad) {
          setIsFirstLoad(false)
        }
        onLoad()
      }, 0)
    })()
    return () => {
      updateList([])
      setPageState({
        ...defaultPageState,
      })
    }
  }, [params, siteFrontId, categoryFrontId, location])

  return (
    <>
      <div className="flex justify-between items-center">
        <div>
          {list.length > 0 && (
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
      <div className="mt-4" key={categoryFrontId}>
        {list.length == 0 ? (
          <Empty />
        ) : (
          list.map((item) => (
            <Card
              key={item.id}
              className="p-3 my-2 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <div className="mb-3">
                <div className="mb-1 ">
                  <Link className="mr-2" to={genArticlePath(item)}>
                    {item.title}
                  </Link>
                  {item.link && (
                    <span className="text-sm">
                      (<span className="text-gray-500">{t('source')}</span>
                      &nbsp;
                      <a
                        href={item.link}
                        target="_blank"
                        title={item.link}
                        className="break-all"
                      >
                        <SquareArrowOutUpRightIcon
                          size={14}
                          className="inline"
                        />
                        &nbsp;
                        {extractDomain(item.link)}...
                      </a>
                      )
                    </span>
                  )}
                </div>
                <div>{isMySelf(item.authorId)}</div>
                {(isMySelf(item.authorId) ||
                  checkPermit('article', 'manage')) &&
                  item.status != 'published' && (
                    <div className="py-1">
                      <Badge variant={'secondary'}>
                        {getArticleStatusName(item.status)}
                      </Badge>
                    </div>
                  )}
                {showSummary && (
                  <div
                    className="mb-1 break-words"
                    dangerouslySetInnerHTML={{ __html: renderMD(item.summary) }}
                  ></div>
                )}
                {item.picURL && (
                  <div className="w-[120px] h-[120px] rounded mr-4 bg-gray-200 shrink-0 overflow-hidden">
                    <a href="#">
                      <img
                        alt={item.title}
                        src={item.picURL}
                        className="max-w-full"
                      />
                    </a>
                  </div>
                )}
              </div>
              <ArticleControls
                article={item}
                ctype="list"
                bookmark={false}
                notify={false}
                history={false}
                onSuccess={() => fetchArticles(false)}
              />
            </Card>
          ))
        )}
      </div>

      {pageState.totalPage > 1 && (
        <ListPagination pageState={pageState} autoScrollTop />
      )}
    </>
  )
}

export const ArticleListItemSkeleton = () => (
  <Skeleton className="p-3 my-2 h-[107px]"></Skeleton>
)

export default ArticleListPage
