import { KeyboardEvent, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

import { ListPageState } from '@/types/types'

import { Card } from './ui/card'
import { Input } from './ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination'

export interface ListPaginationProps {
  pageState: ListPageState
}

export const ListPagination: React.FC<ListPaginationProps> = ({
  pageState,
}) => {
  const [params, setParams] = useSearchParams()

  const genParamStr = useCallback(
    (page: number) => {
      const cloneParams = new URLSearchParams(params.toString())
      cloneParams.set('page', page ? String(page) : '1')
      return cloneParams.toString()
    },
    [params]
  )

  const onPageEnter = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key == 'Enter') {
        e.preventDefault()
        let page = parseInt(e.currentTarget.value, 10) || 1
        if (page > pageState.totalPage || page < 1) {
          page = 1
        }
        setParams((params) => ({ ...params, page: page }))
      }
    },
    [pageState]
  )

  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({
        top: 0,
      })
    }, 200)
  }, [params])

  return (
    <>
      {pageState.totalPage > 1 && (
        <Card>
          <Pagination className="py-1">
            <PaginationContent>
              {pageState.currPage > 1 && (
                <PaginationItem>
                  <PaginationPrevious
                    to={'?' + genParamStr(pageState.currPage - 1)}
                  />
                </PaginationItem>
              )}
              <PaginationItem>
                <Input
                  key={pageState.currPage}
                  defaultValue={pageState.currPage}
                  autoComplete="off"
                  pattern="[0-9]+"
                  className="inline-block w-[30px] h-[30px] rounded-full text-center"
                  onKeyUp={onPageEnter}
                />{' '}
                <span className="text-gray-500">/ {pageState.totalPage}</span>
              </PaginationItem>
              {pageState.currPage < pageState.totalPage && (
                <PaginationItem>
                  <PaginationNext
                    to={'?' + genParamStr(pageState.currPage + 1)}
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </Card>
      )}
    </>
  )
}
