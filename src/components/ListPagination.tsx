import { KeyboardEvent, useCallback, useEffect } from 'react'

import { useNavigate, useSearch } from '@/lib/router'
import { updateSearchParams, withSearchUpdater } from '@/lib/search'

import { ListPageState } from '@/types/types'

import { Card } from './ui/card'
import { Input } from './ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination'

export interface ListPaginationProps {
  pageState: ListPageState
  autoScrollTop?: boolean
}

export const ListPagination: React.FC<ListPaginationProps> = ({
  pageState,
  autoScrollTop = false,
}) => {
  const search = useSearch()
  const navigate = useNavigate()

  const genParamStr = useCallback(
    (page: number) => {
      const newSearch = { ...search, page: page ? String(page) : '1' }
      return new URLSearchParams(
        Object.entries(newSearch).map(([k, v]) => [k, String(v)])
      ).toString()
    },
    [search]
  )

  const onPageEnter = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key == 'Enter') {
        e.preventDefault()
        let page = parseInt(e.currentTarget.value, 10) || 1
        if (page > pageState.totalPage || page < 1) {
          page = 1
        }
        navigate({
          search: withSearchUpdater((prev) =>
            updateSearchParams(prev, { page: String(page) })
          ),
        })
      }
    },
    [pageState, navigate]
  )

  useEffect(() => {
    if (autoScrollTop) {
      setTimeout(() => {
        window.scrollTo({
          top: 0,
        })
      }, 200)
    }
  }, [autoScrollTop])

  return (
    <>
      {pageState.totalPage > 1 && (
        <Card className="mt-4">
          <Pagination className="py-1">
            <PaginationContent>
              {pageState.currPage > 1 && (
                <>
                  <PaginationItem>
                    <PaginationFirst to={'?' + genParamStr(1)} />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationPrevious
                      to={'?' + genParamStr(pageState.currPage - 1)}
                    />
                  </PaginationItem>
                </>
              )}
              <PaginationItem>
                <Input
                  key={pageState.currPage}
                  defaultValue={pageState.currPage}
                  autoComplete="off"
                  pattern="[0-9]+"
                  className="inline-block w-[42px] h-[30px] rounded-full text-center"
                  onKeyUp={onPageEnter}
                />{' '}
                <span className="text-gray-500">/ {pageState.totalPage}</span>
              </PaginationItem>
              {pageState.currPage < pageState.totalPage && (
                <>
                  <PaginationItem>
                    <PaginationNext
                      to={'?' + genParamStr(pageState.currPage + 1)}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLast
                      to={'?' + genParamStr(pageState.totalPage)}
                    />
                  </PaginationItem>
                </>
              )}
            </PaginationContent>
          </Pagination>
        </Card>
      )}
    </>
  )
}
