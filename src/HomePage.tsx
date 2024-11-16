import { useState } from 'react'

import { Card } from '@/components/ui/card'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

import BContainer from './components/base/BContainer'
import BNav from './components/base/BNav'

import mockArticleList from '@/mock/articles.json'
import {
  BookmarkCheckIcon,
  MessageSquare,
  QrCode,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from './components/ui/button'
import { dayjs } from './lib/dayjs-custom'
import { Article } from './types/types'

/* interface Tool {
 *   id: number
 *   name: string
 *   likeCount: number
 *   iconUrl: string
 *   summary: string
 *   isFree: boolean
 *   appType: string[]
 *   reviewCount: number
 *   liked: boolean
 * }
 *
 * const typedMockList = mockList as Tool[] */

const articleList = mockArticleList as Article[]

/* const fetchUser = async () => {
 *   try {
 *     const data = await getUser('oodzchen')
 *     if (!data.code) {
 *       console.log('user data: ', data)
 *     }
 *   } catch (e) {
 *     console.error('get user data error: ', e)
 *   }
 * } */

export default function HomePage() {
  const [list, updateList] = useState<Article[]>(articleList)

  /* useEffect(() => {

  * }, []) */
  console.log('article list: ', articleList)

  return (
    <>
      <BNav />
      <BContainer className="max-w-3xl">
        <div className="pb-4">
          {list.map((item) => (
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
                    <span
                      title={dayjs(item.createdAt)
                        .utc()
                        .format('YYYY-MM-DD hh:mm:ss')}
                    >
                      {dayjs(item.createdAt).utc().fromNow()}
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
          ))}
        </div>
      </BContainer>

      <Pagination className="py-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="/?page=2" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/?page=1">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/?page=2">2</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/?page=3" isActive>
              3
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/?page=99">99</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/?page=100">100</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="/?page=4" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </>
  )
}
