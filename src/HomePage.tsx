import { useEffect, useState } from 'react'

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
import BNav from './components/base/BNav'

/* import mockArticleList from '@/mock/articles.json' */

import {
  BookmarkIcon,
  MessageSquare,
  QrCode,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { getArticleList } from './api/article'
import BLoader from './components/base/BLoader'
import { Button } from './components/ui/button'
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'
import { timeAgo, timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { Article, ArticleListSort } from './types/types'

/* const articleList = mockArticleList as Article[] */

interface PageState {
  currPage: number
  pageSize: number
  totalCount: number // 数据总量
  totalPage: number // 总页数
}

export default function HomePage() {
  const [loading, setLoading] = useState(false)
  const [list, updateList] = useState<Article[]>([])
  const [pageState, setPageState] = useState<PageState>({
    currPage: 1,
    pageSize: 10,
    totalCount: 0,
    totalPage: 0,
  })

  const [params, setParams] = useSearchParams()

  const sort = (params.get('sort') as ArticleListSort | null) || 'best'

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
          console.log('article list: ', resp.data)
          const { data } = resp
          updateList([...data.articles])
          setPageState({
            currPage: data.currPage,
            pageSize: data.pageSize,
            totalCount: data.articleTotal,
            totalPage: data.totalPage,
          })
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

  useEffect(() => {
    const page = Number(params.get('page')) || 1
    const pageSize = Number(params.get('page_size')) || 10
    const category = params.get('category') || ''
    const sort = (params.get('sort') as ArticleListSort | null) || 'best'

    fetchArticles(page, pageSize, sort, category)
  }, [params])

  return (
    <>
      <BNav />
      <BContainer className="max-w-3xl">
        <Tabs defaultValue="best" value={sort} onValueChange={onSwitchTab}>
          <TabsList>
            <TabsTrigger value="best">最佳</TabsTrigger>
            <TabsTrigger value="latest">最新</TabsTrigger>
            <TabsTrigger value="list_hot">热门</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="py-4">
          {loading ? (
            <div className="flex justify-center">
              <BLoader />
            </div>
          ) : list.length == 0 ? (
            <div className="flex justify-center">
              <span className="text-gray-500">暂无内容</span>
            </div>
          ) : (
            list.map((item) => (
              <Card key={item.id} className="p-3 my-2 hover:bg-slate-50">
                <div className="mb-3">
                  <div className="mb-1">
                    <a className="mr-2" href="#">
                      {item.title}
                    </a>
                  </div>
                  <div className="max-h-5 mb-1 overflow-hidden text-sm text-gray-600 text-nowrap text-ellipsis">
                    {item.summary}
                  </div>
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
                <div className="flex flex-wrap justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="mr-[-1px] rounded-r-none"
                    >
                      <ThumbsUp size={20} className="inline-block mr-1" />
                      {item.voteUp > 0 && item.voteUp}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-l-none"
                    >
                      <ThumbsDown size={20} className="inline-block mr-1" />
                      {item.voteDown > 0 && item.voteDown}
                    </Button>
                    <Button variant="ghost" size="sm">
                      {/* TODO: saved count */}
                      <BookmarkIcon size={20} className="inline-block mr-1" />3
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MessageSquare size={20} className="inline-block mr-1" />
                      {item.totalReplyCount > 0 && item.totalReplyCount}
                    </Button>

                    <div className="ml-2">
                      <Link to="" className="font-bold">
                        {item.category.name}
                      </Link>
                      &nbsp;·&nbsp;
                      <span title={timeFmt(item.createdAt, 'YYYY-M-D H:m:s')}>
                        {timeAgo(item.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {Boolean(item.price) && (
                      <>
                        <Button variant="ghost" className="ml-1">
                          <QrCode />
                        </Button>
                        <Button size="sm">
                          <a href="https://example.com/" target="_blank">
                            京东购买 ¥{(Math.random() * 100).toFixed(2)}
                          </a>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </BContainer>

      {pageState.totalPage > 1 && (
        <Pagination className="py-4">
          <PaginationContent>
            {pageState.currPage > 1 && (
              <PaginationItem>
                <PaginationPrevious to={'?page=' + (pageState.currPage - 1)} />
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
      )}
    </>
  )
}
