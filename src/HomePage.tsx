import { useEffect, useState } from 'react'
import { Fragment } from 'react/jsx-runtime'

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

import { BIconHeart } from './components/icon/Heart'

import mockList from '@/mock/toolList.json'

interface Tool {
  id: number
  name: string
  likeCount: number
  iconUrl: string // "https://placehold.co/400x400/3A8FB7/F1E8B8?text=Z",
  summary: string // "一款强大的人工智能助手,提高您的工作效率",
  isFree: boolean // false,
  appType: string[] // ["生产力", "人工智能"],
  reviewCount: number // 3254,
  liked: boolean // false,
}

const typedMockList = mockList as Tool[]

export default function HomePage() {
  const [list, updateList] = useState<Tool[]>([])

  const toggleLike = (id: number): Tool[] => {
    return mockList.map((item) => {
      if (item.id == id) {
        item.liked = !item.liked
      }
      return item
    })
  }

  const onLikeClick = (id: number) => {
    console.log('clicked: ', id)
    const res = toggleLike(id)
    console.log('list: ', list)
    updateList(res)
  }

  useEffect(() => {
    updateList(typedMockList)
  }, [])

  return (
    <>
      <BNav />
      <BContainer>
        <h1 className="text-lg font-bold pb-4">最新发布</h1>

        <div className="pb-4">
          {list.map((item) => (
            <Card key={item.id} className="p-3 my-4">
              <div className="flex mb-4">
                <div className="w-16 h-16 rounded mr-4 bg-gray-200 shrink-0 overflow-hidden">
                  <a href="#">
                    <img
                      alt={item.name}
                      src={item.iconUrl}
                      className="max-w-full"
                    />
                  </a>
                </div>
                <div>
                  <div className="mb-2">
                    <a className="mr-2 font-bold" href="#">
                      {item.name}
                    </a>
                    <span
                      onClick={() => onLikeClick(item.id)}
                      className="border-2 px-2 rounded-md text-sm text-nowrap cursor-pointer"
                    >
                      <BIconHeart variant={item.liked ? 'full' : 'default'} />{' '}
                      {item.likeCount}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">{item.summary}</div>
                </div>
              </div>
              <div className="flex flex-wrap justify-between text-sm text-gray-500">
                <div>
                  <div className="flex flex-wrap">
                    <div className="mr-4 mb-2">
                      <span className="font-bold">是否免费：</span>{' '}
                      {item.isFree ? '是' : '否'}
                    </div>
                    <div className="mb-2">
                      <span className="font-bold">类型：</span>{' '}
                      {item.appType.map((t) => (
                        <Fragment key={t}>
                          <a href="#">{t}</a> &nbsp;&nbsp;
                        </Fragment>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-bold">支持平台：</span>{' '}
                    Linux、Windows、macOS、iOS、Android
                  </div>
                </div>
                <div className="flex items-end">
                  <a href="#" className="text-gray-500">
                    {item.reviewCount} 条评论
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </BContainer>

      <Pagination>
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
