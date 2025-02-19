import {
  ColumnDef,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'

import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Checkbox } from './components/ui/checkbox'
import { Input } from './components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import BAvatar from './components/base/BAvatar'
import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'

import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'
import UserDetailCard from './components/UserDetailCard'

import { getSiteBlocklist, unblockUser, unblockUsers } from './api/site'
import { getUser, unBanUser, unbanManyUsers } from './api/user'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { useAlertDialogStore, useAuthedUserStore } from './state/global'
import { BlockedUser, ListPageState } from './types/types'

interface SearchFields {
  keywords?: string
  roleId?: string
}

const defaultSearchData: SearchFields = {
  keywords: '',
  roleId: '',
}

export default function BlockedUserListPage() {
  const [loading, setLoading] = useState(false)
  const [currUser, setCurrUser] = useState<BlockedUser | null>(null)
  const [showUserDetail, setShowUserDetail] = useState(false)

  const [list, setList] = useState<BlockedUser[]>([])
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const authStore = useAuthedUserStore()
  const alertDialog = useAlertDialogStore()

  const { siteFrontId } = useParams()

  const [pageState, setPageState] = useState<ListPageState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const [searchData, setSearchData] = useState<SearchFields>({
    ...defaultSearchData,
    keywords: params.get('keywords') || '',
  })

  const columns: ColumnDef<BlockedUser>[] = [
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
      header: '',
      cell: ({ row }) => (
        <Link to={'/users/' + row.original.name}>
          <BAvatar username={row.original.name} size={36} showUsername />
        </Link>
      ),
    },
    {
      accessorKey: 'blockedAt',
      header: '屏蔽时间',
      cell: ({ row }) => (
        <span title={new Date(row.original.registeredAt).toLocaleString()}>
          {timeFmt(row.original.registeredAt, 'YYYY-M-D')}
        </span>
      ),
    },
    {
      accessorKey: 'contorles',
      header: '操作',
      cell: ({ row }) => (
        <>
          <Button
            variant="secondary"
            size="sm"
            className="m-1"
            onClick={() => {
              onUnblockClick(row.original)
            }}
          >
            解除屏蔽
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
    enableRowSelection: (row) => authStore.levelCompare(row.original.role) < 0,
  })

  const selectedRows = table.getSelectedRowModel().rows

  const unbannableUsers = useMemo(
    () => [...selectedRows.map((item) => item.original)],
    [selectedRows]
  )

  const resetParams = useCallback(() => {
    setParams((params) => {
      params.delete('page')
      params.delete('pageSize')
      params.delete('keywords')
      /* params.delete('role_id') */
      return params
    })
  }, [params])

  const fetchUserList = toSync(
    useCallback(
      async (showLoading = false) => {
        if (!siteFrontId) return

        try {
          if (showLoading) {
            setLoading(true)
          }
          const page = Number(params.get('page')) || 1
          const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE
          const keywords = params.get('keywords') || ''
          /* const roleId = params.get('role_id') || '' */

          setSearchData((state) => ({ ...state, keywords }))

          const resp = await getSiteBlocklist(
            siteFrontId,
            page,
            pageSize,
            keywords
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
      [params, siteFrontId]
    )
  )

  const onResetClick = useCallback(() => {
    setSearchData({ ...defaultSearchData })
    resetParams()
  }, [params])

  const onSearchClick = useCallback(() => {
    resetParams()
    setParams((params) => {
      const { keywords, roleId } = searchData

      /* console.log('on search role id: ', roleId) */

      if (keywords) {
        params.set('keywords', keywords)
      }

      if (roleId) {
        params.set('role_id', roleId)
      }

      return params
    })
  }, [params, searchData])

  const onUnblockSelectedClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()

      if (!siteFrontId) return
      /* setBanOpen(true) */
      const selectedRows = table.getSelectedRowModel().rows
      const userIds = selectedRows.map((item) => Number(item.original.id) || 0)

      if (userIds.length == 0) return

      const usernames = selectedRows.map((item) => item.original.name)

      const confirmed = await alertDialog.confirm(
        '确认',
        `确认解除对已选中的 ${userIds.length} 个用户的屏蔽？`
      )
      if (confirmed) {
        const { code } = await unblockUsers(siteFrontId, userIds, usernames)
        if (!code) {
          setRowSelection({})
          fetchUserList()
        }
      }
    },
    [alertDialog, table, siteFrontId]
  )

  /* const onShowDetailClick = useCallback((user: BlockedUser) => {
   *   setCurrUser(user)
   *   setShowUserDetail(true)
   * }, []) */

  const onUnblockClick = toSync(
    useCallback(
      async (user: BlockedUser) => {
        if (!siteFrontId) return

        const confirmed = await alertDialog.confirm(
          '确认',
          `确定解除对 ${user.name} 的屏蔽？`
        )
        if (!confirmed) return

        const { code } = await unblockUser(siteFrontId, user.id, user.name)
        if (!code) {
          fetchUserList()
        }
      },
      [siteFrontId, alertDialog]
    )
  )

  useEffect(() => {
    fetchUserList(true)
  }, [location])

  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'banned_users',
        name: '已屏蔽',
        describe: '已屏蔽用户',
      }}
    >
      <Card className="flex flex-wrap justify-between p-2">
        <div className="flex flex-wrap">
          <Input
            placeholder="用户名"
            className="w-[140px] h-[36px] mr-3"
            value={searchData.keywords}
            onChange={(e) =>
              setSearchData((state) => ({
                ...state,
                keywords: e.target.value,
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
        <Badge variant="secondary">{pageState.total} 个用户</Badge>
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
                  已选中 {selectedRows.length} 个用户
                </div>
                <div>
                  {unbannableUsers.length > 0 && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={onUnblockSelectedClick}
                    >
                      解除对 {unbannableUsers.length} 个已选用户的屏蔽
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </BContainer>
  )
}
