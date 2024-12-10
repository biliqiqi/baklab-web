import {
  MouseEvent,
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

/* import mockArticleList from '@/mock/articles.json' */
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'
import { Card } from '@/components/ui/card'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'

import ArticleControls from './components/ArticleControls'

import { DEFAULT_PAGE_SIZE } from '@/constants/constants'

import { getArticleList } from './api/article'
import { toSync } from './lib/fire-and-forget'
import { useAuthedUserStore } from './state/global'
import {
  Article,
  ArticleListSort,
  ArticleListState,
  FrontCategory,
} from './types/types'

/* const articleList = mockArticleList as Article[] */

export default function ArticleListPage() {
  const [loading, setLoading] = useState(false)
  const [list, updateList] = useState<Article[]>([])
  const [pageState, setPageState] = useState<ArticleListState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalCount: 0,
    totalPage: 0,
  })

  const authStore = useAuthedUserStore()
  const isMyself = useCallback(
    (authorID: string) => authStore.isMySelf(authorID),
    [authStore]
  )

  const [params, setParams] = useSearchParams()
  const pathParams = useParams()
  const navigate = useNavigate()

  const sort = (params.get('sort') as ArticleListSort | null) || 'best'
  const category = pathParams['category'] || ''

  const submitPath = useMemo(
    () => (category ? '/submit?category=' + category : '/submit'),
    [category]
  )

  const fetchArticles = toSync(
    async (
      page: number,
      pageSize: number,
      sort: ArticleListSort | null,
      categoryFrontID: string
    ) => {
      try {
        setLoading(true)
        const resp = await getArticleList(page, pageSize, sort, categoryFrontID)
        if (!resp.code) {
          /* console.log('article list: ', resp.data) */
          const { data } = resp
          let category: FrontCategory | undefined
          if (data.category) {
            const { frontId, name, describe } = data.category
            category = { frontId, name, describe } as FrontCategory
          }

          if (data.articles) {
            updateList([...data.articles])
            setPageState({
              currPage: data.currPage,
              pageSize: data.pageSize,
              totalCount: data.articleTotal,
              totalPage: data.totalPage,
              category,
            })
          } else {
            updateList([])
            setPageState({
              currPage: 1,
              pageSize: data.pageSize,
              totalCount: data.articleTotal,
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
    }
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
        console.log('authData success', authData)
        //...
        setTimeout(() => {
          navigate(submitPath)
        }, 0)
      } catch (err) {
        console.error('submit click error: ', err)
      }
    },
    [authStore, submitPath, navigate]
  )

  useEffect(() => {
    const page = Number(params.get('page')) || 1
    const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE
    const sort = (params.get('sort') as ArticleListSort | null) || 'best'

    fetchArticles(page, pageSize, sort, category)
  }, [params, pathParams])

  return (
    <>
      <BContainer category={pageState.category}>
        <div className="flex justify-between items-center">
          <div>
            {list.length > 0 && (
              <Tabs
                defaultValue="best"
                value={sort}
                onValueChange={onSwitchTab}
              >
                <TabsList>
                  <TabsTrigger value="best">最佳</TabsTrigger>
                  <TabsTrigger value="latest">最新</TabsTrigger>
                  <TabsTrigger value="list_hot">热门</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
          <div>
            <Button variant="outline" size="sm" asChild onClick={onSubmitClick}>
              <Link to={submitPath}>+ 提交</Link>
            </Button>
          </div>
        </div>
        <div className="py-4" key={pathParams.category}>
          {loading ? (
            <div className="flex justify-center">
              <BLoader />
            </div>
          ) : list.length == 0 ? (
            <div className="flex justify-center">
              <Badge variant="secondary" className="text-gray-500">
                空空如也
              </Badge>
            </div>
          ) : (
            list.map((item) => (
              <Card key={item.id} className="p-3 my-2 hover:bg-slate-50">
                <div className="mb-3">
                  <div className="mb-1">
                    <Link className="mr-2" to={'/articles/' + item.id}>
                      {item.title}
                    </Link>
                  </div>
                  {/* <div className="max-h-5 mb-1 overflow-hidden text-sm text-gray-600 text-nowrap text-ellipsis">
                    {item.summary}
                  </div> */}
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
                <ArticleControls article={item} type="list" />
              </Card>
            ))
          )}
        </div>

        {pageState.totalPage > 1 && (
          <Card>
            <Pagination className="py-1">
              <PaginationContent>
                {pageState.currPage > 1 && (
                  <PaginationItem>
                    <PaginationPrevious
                      to={'?page=' + (pageState.currPage - 1)}
                    />
                  </PaginationItem>
                )}
                {/* <PaginationItem>
            <PaginationLink href="/?page=1">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/?page=2">2</PaginationLink>
          </PaginationItem> */}
                <PaginationItem>
                  <PaginationLink to={'?page=' + pageState.currPage} isActive>
                    {pageState.currPage}
                  </PaginationLink>
                </PaginationItem>
                {/* <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/?page=99">99</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/?page=100">100</PaginationLink>
          </PaginationItem> */}
                {pageState.currPage < pageState.totalPage && (
                  <PaginationItem>
                    <PaginationNext to={'?page=' + (pageState.currPage + 1)} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </Card>
        )}
      </BContainer>
    </>
  )
}
