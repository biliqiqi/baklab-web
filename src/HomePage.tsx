import { useCallback, useEffect, useState } from 'react'

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
  BookmarkCheckIcon,
  MessageSquare,
  QrCode,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { getArticleList } from './api/article'
import BLoader from './components/base/BLoader'
import { Button } from './components/ui/button'
import { timeAgo, timeFmt } from './lib/dayjs-custom'
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

  const [params, _setParams] = useSearchParams()

  const fetchArticles = useCallback(
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
    },
    []
  )

  useEffect(() => {
    const page = Number(params.get('page')) || 1
    const pageSize = Number(params.get('page_size')) || 10
    const sort = params.get('sort') as ArticleListSort | null
    const category = params.get('category') || ''
    fetchArticles(page, pageSize, sort, category)
  }, [params, fetchArticles])

  return (
    <>
      <BNav />
      <BContainer className="max-w-3xl">
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
              <Card key={item.id} className="p-3 my-2">
                <div className="mb-3">
                  <div className="mb-1">
                    <a className="mr-2 font-bold" href="#">
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
                      variant="default"
                      size="sm"
                      className="mr-[-1px] rounded-r-none"
                    >
                      <ThumbsUp size={20} className="inline-block mr-1" />
                      10
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-l-none"
                    >
                      <ThumbsDown size={20} className="inline-block mr-1" />
                      12
                    </Button>
                    <Button variant="ghost" size="sm">
                      <BookmarkCheckIcon
                        size={20}
                        className="inline-block mr-1 text-primary"
                      />
                      3
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MessageSquare size={20} className="inline-block mr-1" />
                      99
                    </Button>

                    <div className="ml-2">
                      发布于
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
