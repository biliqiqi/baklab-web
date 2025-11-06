import {
  ColumnDef,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'
import UserDetailCard from './components/UserDetailCard'

import { getUser, getUserList, unbanManyUsers } from './api/user'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { formatMinutes } from './lib/utils'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useLoading,
} from './state/global'
import { ListPageState, UserData } from './types/types'

interface SearchFields {
  keywords?: string
  roleId?: string
}

const defaultSearchData: SearchFields = {
  keywords: '',
  roleId: '',
}

export default function BannedUserListPage() {
  /* const [loading, setLoading] = useState(false) */
  const [currUser, setCurrUser] = useState<UserData | null>(null)
  const [showUserDetail, setShowUserDetail] = useState(false)

  const [list, setList] = useState<UserData[]>([])
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const { setLoading } = useLoading()

  const { t } = useTranslation()

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

  const columns: ColumnDef<UserData>[] = [
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
    /* {
     *   accessorKey: 'roleName',
     *   header: t('role'),
     * }, */
    /* {
     *   accessorKey: 'roleLevel',
     *   header: t('permissionLevel'),
     *   cell: ({ row }) => <span>{row.original?.role?.level || '-'}</span>,
     * }, */
    {
      accessorKey: 'registeredAt',
      header: t('joinedAt'),
      cell: ({ row }) => (
        <span title={new Date(row.original.registeredAt).toLocaleString()}>
          {timeFmt(row.original.registeredAt, 'YYYY-M-D')}
        </span>
      ),
    },
    {
      accessorKey: 'bannedStartAt',
      header: t('bannedAt'),
      cell: ({ row }) => (
        <span title={new Date(row.original.bannedStartAt).toLocaleString()}>
          {timeFmt(row.original.bannedStartAt, 'YYYY-M-D h:m:s')}
        </span>
      ),
    },
    {
      accessorKey: t('bannedDuration'),
      header: t('bannedDuration'),
      cell: ({ row }) => (
        <span>{formatMinutes(row.original.bannedMinutes)}</span>
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
              onShowDetailClick(row.original)
            }}
          >
            {t('detail')}
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
        try {
          if (showLoading) {
            setLoading(true)
          }
          const page = Number(params.get('page')) || 1
          const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE
          const keywords = params.get('keywords') || ''
          /* const roleId = params.get('role_id') || '' */

          setSearchData((state) => ({ ...state, keywords }))

          const resp = await getUserList(
            page,
            pageSize,
            keywords,
            '',
            'banned_user',
            '',
            { siteFrontId }
          )

          if (!resp.code) {
            const { data } = resp
            if (data.list) {
              setList([...data.list])
              setPageState({
                currPage: data.page,
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
  }, [resetParams, setParams, searchData])

  const onUnbanSelectedClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      /* setBanOpen(true) */
      const selectedRows = table.getSelectedRowModel().rows
      const usernames = selectedRows.map((item) => item.original.name)

      if (usernames.length == 0) return

      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t('unbanConfirm', { num: usernames.length })
      )
      if (confirmed) {
        const { code } = await unbanManyUsers(usernames)
        if (!code) {
          setRowSelection({})
          fetchUserList()
        }
      }
    },
    [alertDialog, table, fetchUserList, t]
  )

  const fetchUserData = toSync(
    useCallback(
      async (username: string) => {
        const { code, data } = await getUser(username, {}, { siteFrontId })
        if (!code) {
          setCurrUser(data)
        }
      },
      [siteFrontId]
    )
  )

  const onShowDetailClick = useCallback(
    (user: UserData) => {
      setCurrUser(user)
      setShowUserDetail(true)
      fetchUserData(user.name)
    },
    [fetchUserData]
  )

  useEffect(() => {
    fetchUserList(true)
  }, [location])

  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'banned_users',
        name: t('banned'),
        describe: t('bannedUser'),
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
                      onClick={onUnbanSelectedClick}
                    >
                      {t('selectedUnbanCount', { num: unbannableUsers.length })}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      <Dialog open={showUserDetail} onOpenChange={setShowUserDetail}>
        {currUser && (
          <DialogContent className="max-sm:max-w-[90%]">
            <DialogHeader>
              <DialogTitle>
                {t('userDetail', { username: currUser.name })}
              </DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>
            <UserDetailCard
              user={currUser}
              title=""
              className="p-0 bg-transparent border-none shadow-none"
              onSuccess={() => {
                setShowUserDetail(false)
                fetchUserList(false)
              }}
            />
          </DialogContent>
        )}
      </Dialog>
    </BContainer>
  )
}
