import {
  ColumnDef,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'

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

import BAvatar from './components/base/BAvatar'
import BContainer from './components/base/BContainer'

import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'

import { useLocationKey } from '@/hooks/use-location-key'
import { useSiteParams } from '@/hooks/use-site-params'

import { getSiteBlocklist, unblockUser, unblockUsers } from './api/site'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useLoading,
} from './state/global'
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
  /* const [loading, setLoading] = useState(false) */

  const [list, setList] = useState<BlockedUser[]>([])
  const [params, setParams] = useSearchParams()
  const { locationKey } = useLocationKey()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const { setLoading } = useLoading()

  const authStore = useAuthedUserStore()
  const alertDialog = useAlertDialogStore()
  const { t } = useTranslation()

  const { siteFrontId } = useSiteParams()

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
      header: t('blockedAt'),
      cell: ({ row }) => (
        <span title={new Date(row.original.registeredAt).toLocaleString()}>
          {timeFmt(row.original.registeredAt, 'YYYY-M-D')}
        </span>
      ),
    },
    {
      accessorKey: 'contorles',
      header: t('operations'),
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
            {t('unblock')}
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
  }, [setParams])

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
      [params, siteFrontId, setLoading]
    )
  )

  const onResetClick = useCallback(() => {
    setSearchData({ ...defaultSearchData })
    resetParams()
  }, [resetParams])

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
  }, [searchData, resetParams, setParams])

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
        t('confirm'),
        t('unblockUsersConfirm', { num: userIds.length })
      )
      if (confirmed) {
        const { code } = await unblockUsers(siteFrontId, userIds, usernames)
        if (!code) {
          setRowSelection({})
          fetchUserList()
        }
      }
    },
    [alertDialog, table, siteFrontId, fetchUserList, t]
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
          t('confirm'),
          t('unblockSingleUserConfirm', { name: user.name })
        )
        if (!confirmed) return

        const { code } = await unblockUser(siteFrontId, user.id, user.name)
        if (!code) {
          fetchUserList()
        }
      },
      [siteFrontId, alertDialog, fetchUserList, t]
    )
  )

  useEffect(() => {
    fetchUserList(true)
  }, [locationKey])

  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'banned_users',
        name: t('blocked'),
        describe: t('blockedDescribe'),
      }}
    >
      <Card className="flex flex-wrap justify-between p-2">
        <div className="flex flex-wrap">
          <Input
            placeholder={t('username')}
            className="w-[140px] h-[36px] mr-3"
            value={searchData.keywords}
            onChange={(e) =>
              setSearchData((state) => ({
                ...state,
                keywords: e.target.value,
              }))
            }
            onKeyUp={(e) => {
              if (e.key == 'Enter') {
                onSearchClick()
              }
            }}
          />
        </div>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={onResetClick}
            className="mr-3"
          >
            {t('reset')}
          </Button>
          <Button variant="outline" size="sm" onClick={onSearchClick}>
            {t('search')}
          </Button>
        </div>
      </Card>
      <div className="my-4">
        <Badge variant="secondary">
          {t('userCount', { num: pageState.total })}
        </Badge>
      </div>
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
            <Card className="sticky bottom-0 mt-4 p-2">
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  {t('selectedUserCount', { num: selectedRows.length })}
                </div>
                <div>
                  {unbannableUsers.length > 0 && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={onUnblockSelectedClick}
                    >
                      {t('selectedUnblockCount', {
                        num: unbannableUsers.length,
                      })}
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
