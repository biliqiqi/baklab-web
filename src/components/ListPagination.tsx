import { KeyboardEvent, useCallback } from 'react'

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
  autoScrollTop: _autoScrollTop = false,
}) => {
  const search = useSearch()
  const navigate = useNavigate()

  const getSearchParams = useCallback(
    (targetPage: number) => {
      const newSearch: Record<string, string | undefined> = {}
      Object.entries(search).forEach(([key, value]) => {
        if (key !== 'page') {
          newSearch[key] = value
        }
      })
      newSearch.page = targetPage.toString()
      return newSearch
    },
    [search]
  )

  const handlePaginationClick = useCallback(() => {
    sessionStorage.setItem('__pagination_click__', 'true')
  }, [])

  const onPageEnter = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key == 'Enter') {
        e.preventDefault()
        let page = parseInt(e.currentTarget.value, 10) || 1
        if (page > pageState.totalPage || page < 1) {
          page = 1
        }
        sessionStorage.setItem('__pagination_click__', 'true')
        navigate({
          search: withSearchUpdater((prev) =>
            updateSearchParams(prev, { page: String(page) })
          ),
        })
      }
    },
    [pageState, navigate]
  )

  // Temporarily disabled: Now using TanStack Router's built-in scroll restoration
  // useEffect(() => {
  //   if (autoScrollTop) {
  //     setTimeout(() => {
  //       window.scrollTo({
  //         top: 0,
  //       })
  //     }, 200)
  //   }
  // }, [autoScrollTop])

  return (
    <>
      {pageState.totalPage > 1 && (
        <Card className="mt-4">
          <Pagination className="py-1">
            <PaginationContent>
              {pageState.currPage > 1 && (
                <>
                  <PaginationItem>
                    <PaginationFirst
                      to="."
                      search={getSearchParams(1)}
                      onClick={handlePaginationClick}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationPrevious
                      to="."
                      search={getSearchParams(pageState.currPage - 1)}
                      onClick={handlePaginationClick}
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
                      to="."
                      search={getSearchParams(pageState.currPage + 1)}
                      onClick={handlePaginationClick}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLast
                      to="."
                      search={getSearchParams(pageState.totalPage)}
                      onClick={handlePaginationClick}
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
