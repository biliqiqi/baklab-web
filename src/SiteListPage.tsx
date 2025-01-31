import {
  ColumnDef,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Checkbox } from './components/ui/checkbox'
import { Input } from './components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'
import BSiteIcon from './components/base/BSiteIcon'

import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'

import { getSiteList } from './api/site'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { ListPageState, SITE_VISIBLE, Site } from './types/types'

interface SearchFields {
  keywords?: string
  creatorName?: string
}

const defaultSearchData: SearchFields = {
  keywords: '',
  creatorName: '',
}

export default function SiteListPage() {
  const [loading, setLoading] = useState(false)
  const [list, setList] = useState<Site[]>([])
  const [params, setParams] = useSearchParams()
  const [searchData, setSearchData] = useState<SearchFields>({
    ...defaultSearchData,
    keywords: params.get('keywords') || '',
    creatorName: params.get('creator_name') || '',
  })

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const [pageState, setPageState] = useState<ListPageState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const location = useLocation()

  const resetParams = useCallback(() => {
    setParams((params) => {
      params.delete('page')
      params.delete('page_size')
      params.delete('keywords')
      params.delete('creator_name')
      return params
    })
  }, [params])

  const onResetClick = useCallback(() => {
    setSearchData({ ...defaultSearchData })
    resetParams()
  }, [params])

  const onSearchClick = useCallback(() => {
    resetParams()
    setParams((params) => {
      const { keywords, creatorName } = searchData

      if (keywords) {
        params.set('keywords', keywords)
      }

      if (creatorName) {
        params.set('creator_name', creatorName)
      }

      return params
    })
  }, [params, searchData])

  const columns: ColumnDef<Site>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          disabled={!row.getCanSelect()}
        />
      ),
    },
    {
      accessorKey: 'name',
      header: '站点名称',
      cell: ({ row }) => (
        <Link to={'/' + row.original.frontId}>
          <BSiteIcon
            logoUrl={row.original.logoUrl}
            name={row.original.name}
            size={36}
            showSiteName
          />
        </Link>
      ),
    },
    {
      accessorKey: 'creatorName',
      header: '创建人',
      cell: ({ row }) => (
        <Link to={'/users/' + row.original.creatorName}>
          {row.original.creatorName}
        </Link>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: '创建时间',
      cell: ({ cell }) => (
        <span>{timeFmt(cell.getValue<string>(), 'YYYY-M-D')}</span>
      ),
    },
    {
      accessorKey: 'contorles',
      header: '操作',
      cell: () => (
        <>
          <Button variant="link" asChild size="sm">
            {/* <Link to={'/users/' + row.original.name}>详细</Link> */}
          </Button>
        </>
      ),
    },
  ]

  const table = useReactTable({
    data: list,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    getRowId: (row) => row.name,
  })

  const selectedRows = table.getSelectedRowModel().rows

  const fetchSiteList = toSync(
    useCallback(
      async (showLoading = false) => {
        try {
          if (showLoading) {
            setLoading(true)
          }
          const page = Number(params.get('page')) || 1
          const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE
          const keywords = params.get('keywords') || ''
          const creatorName = params.get('creator_name') || ''

          setSearchData((state) => ({ ...state, keywords, creatorName }))

          const resp = await getSiteList(
            page,
            pageSize,
            keywords,
            '0',
            creatorName,
            SITE_VISIBLE.All
          )
          if (!resp.code) {
            const { data } = resp
            if (data.list) {
              setList([...data.list])
              setPageState({
                currPage: data.currPage,
                pageSize: data.pageSize,
                total: data.total,
                totalPage: data.totalPage,
              })
            } else {
              setList([])
              setPageState({
                currPage: 1,
                pageSize: data.pageSize,
                total: 0,
                totalPage: 0,
              })
            }
            setRowSelection({})
          }
        } catch (err) {
          console.error('get user list error: ', err)
        } finally {
          setLoading(false)
        }
      },
      [params]
    )
  )

  useEffect(() => {
    fetchSiteList(true)
  }, [location])

  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'site_list',
        name: '站点管理',
        describe: '全部站点',
      }}
    >
      <Card className="flex flex-wrap justify-between p-2">
        <div className="flex flex-wrap">
          <Input
            placeholder="站点名称"
            className="w-[140px] h-[36px] mr-3"
            value={searchData.keywords}
            onChange={(e) =>
              setSearchData((state) => ({
                ...state,
                keywords: e.target.value,
              }))
            }
          />
          <Input
            placeholder="创建人"
            className="w-[140px] h-[36px] mr-3"
            value={searchData.creatorName}
            onChange={(e) =>
              setSearchData((state) => ({
                ...state,
                creatorName: e.target.value,
              }))
            }
          />
        </div>
        <div>
          <Button size="sm" onClick={onResetClick} className="mr-3">
            重置
          </Button>
          <Button size="sm" onClick={onSearchClick}>
            搜索
          </Button>
        </div>
      </Card>
      <div className="my-4">
        <Badge variant="secondary">{pageState.total} 个站点</Badge>
      </div>
      {loading && (
        <div className="flex justify-center">
          <BLoader />
        </div>
      )}

      {list.length == 0 ? (
        <Empty />
      ) : (
        <>
          <Card className="mt-4 overflow-hidden">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      <Empty />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <ListPagination pageState={pageState} />
          </Card>
          {selectedRows.length > 0 && (
            <Card className="mt-4 p-2">
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  已选中 {selectedRows.length} 个站点
                </div>
                <div>操作...</div>
              </div>
            </Card>
          )}
        </>
      )}
    </BContainer>
  )
}
