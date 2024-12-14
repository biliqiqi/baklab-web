import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

import { ListPageState } from '@/types/types'

import { Card } from './ui/card'
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
  const [params] = useSearchParams()

  const genParamStr = useCallback(
    (page: number) => {
      const cloneParams = new URLSearchParams(params.toString())
      cloneParams.set('page', page ? String(page) : '1')
      return cloneParams.toString()
    },
    [params]
  )

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
                <PaginationLink
                  to={'?' + genParamStr(pageState.currPage)}
                  isActive
                >
                  {pageState.currPage}
                </PaginationLink>
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
