import { SquareArrowOutUpRightIcon } from 'lucide-react'
import { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react'

/* import mockArticleList from '@/mock/articles.json' */
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Button } from './components/ui/button'
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'
import { Card } from '@/components/ui/card'

import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'

import ArticleControls from './components/ArticleControls'
import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'

import { DEFAULT_PAGE_SIZE } from '@/constants/constants'

import { getArticleList } from './api/article'
import { getCategoryList, getCategoryWithFrontId } from './api/category'
import { toSync } from './lib/fire-and-forget'
import { extractDomain, genArticlePath, renderMD } from './lib/utils'
import { isLogined, useAuthedUserStore, useForceUpdate } from './state/global'
import {
  Article,
  ArticleListSort,
  ArticleListState,
  Category,
  FrontCategory,
} from './types/types'

/* const articleList = mockArticleList as Article[] */

export default function ArticleListPage() {
  const [loading, setLoading] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [currCate, setCurrCate] = useState<Category | null>(null)

  const [list, updateList] = useState<Article[]>([])
  const [pageState, setPageState] = useState<ArticleListState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const { forceState } = useForceUpdate()

  const authStore = useAuthedUserStore()
  /* const isMyself = useCallback(
   *   (authorID: string) => authStore.isMySelf(authorID),
   *   [authStore]
   * ) */

  const [params, setParams] = useSearchParams()
  const { siteFrontId, categoryFrontId } = useParams()

  const navigate = useNavigate()
  /* const siteStore = useSiteStore() */

  const sort = (params.get('sort') as ArticleListSort | null) || 'best'

  const submitPath = useMemo(
    () =>
      categoryFrontId && currCate
        ? `/${siteFrontId}/submit?category_id=` + currCate.id
        : `/${siteFrontId}/submit`,
    [currCate, siteFrontId, categoryFrontId]
  )

  const fetchArticles = toSync(
    useCallback(async () => {
      try {
        const page = Number(params.get('page')) || 1
        const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE
        const sort = (params.get('sort') as ArticleListSort | null) || 'best'

        if (list.length == 0) {
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
          { siteFrontId }
        )
        if (!resp.code) {
          /* console.log('article list: ', resp.data) */
          const { data } = resp
          let category: FrontCategory | undefined
          if (data.category) {
            const { frontId, name, describe, siteFrontId } = data.category
            category = { frontId, name, describe, siteFrontId } as FrontCategory
          }

          if (data.articles) {
            updateList([...data.articles])
            setPageState({
              currPage: data.currPage,
              pageSize: data.pageSize,
              total: data.articleTotal,
              totalPage: data.totalPage,
              category,
            })
          } else {
            updateList([])
            setPageState({
              currPage: 1,
              pageSize: data.pageSize,
              total: data.articleTotal,
              totalPage: data.totalPage,
              category,
            })
          }
        }
      } catch (e) {
        console.error('get article list error: ', e)
      } finally {
        setLoading(false)
      }
    }, [params, list, siteFrontId, categoryFrontId])
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

      if (authStore.isLogined()) {
        navigate(submitPath)
        return
      }

      try {
        const authData = await authStore.loginWithDialog()
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
    [authStore, submitPath, navigate]
  )

  const fetchCategory = toSync(
    useCallback(async () => {
      if (!categoryFrontId) return

      const { code, data } = await getCategoryWithFrontId(categoryFrontId, {
        siteFrontId,
      })

      if (!code) {
        setCurrCate({ ...data })
      } else {
        setCurrCate(null)
      }
    }, [categoryFrontId])
  )

  /* console.log('article list siteFrontId: ', siteFrontId) */

  useEffect(() => {
    if (categoryFrontId) {
      fetchCategory()
    }

    fetchArticles()
  }, [params, siteFrontId, categoryFrontId, forceState])

  return (
    <BContainer category={pageState.category} loading={loading}>
      <div className="flex justify-between items-center">
        <div>
          {list.length > 0 && (
            <Tabs defaultValue="best" value={sort} onValueChange={onSwitchTab}>
              <TabsList>
                <TabsTrigger value="best">最佳</TabsTrigger>
                <TabsTrigger value="latest">最新</TabsTrigger>
                <TabsTrigger value="list_hot">热门</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
        <div>
          {siteFrontId && authStore.permit('article', 'create') && (
            <Button variant="outline" size="sm" asChild onClick={onSubmitClick}>
              <Link to={submitPath}>+ 提交</Link>
            </Button>
          )}
        </div>
      </div>
      <div className="py-4" key={categoryFrontId}>
        {loading ? (
          <div className="flex justify-center">
            <BLoader />
          </div>
        ) : list.length == 0 ? (
          <Empty />
        ) : (
          list.map((item) => (
            <Card key={item.id} className="p-3 my-2 hover:bg-slate-50">
              <div className="mb-3">
                <div className="mb-1 ">
                  <Link className="mr-2" to={genArticlePath(item)}>
                    {item.title}
                  </Link>
                  {item.link && (
                    <span className="text-gray-500 text-sm">
                      (来源&nbsp;
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
                onSuccess={() => fetchArticles()}
              />
            </Card>
          ))
        )}
      </div>

      {pageState.totalPage > 1 && (
        <ListPagination pageState={pageState} autoScrollTop />
      )}
    </BContainer>
  )
}
