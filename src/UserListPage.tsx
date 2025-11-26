import {
  ColumnDef,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

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

import AuthSourceSelector from './components/AuthSourceSelector'
import BanDialog, { BanDialogRef, BanSchema } from './components/BanDialog'
import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'
import RoleSelector from './components/RoleSelector'
import UserDetailCard from './components/UserDetailCard'

import { blockUser, blockUsers, removeMember, removeMembers } from './api/site'
import { banManyUsers, getUser, getUserList } from './api/user'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useLoading,
  useSiteStore,
} from './state/global'
import { ListPageState, Role, UserData } from './types/types'

interface SearchFields {
  keywords?: string
  roleId?: string
  authFrom?: string
  joinedFrom?: string
  joinedTo?: string
}

const defaultSearchData: SearchFields = {
  keywords: '',
  roleId: '',
  authFrom: '',
  joinedFrom: '',
  joinedTo: '',
}

export default function UserListPage() {
  /* const [loading, setLoading] = useState(false) */
  const [banOpen, setBanOpen] = useState(false)
  const [showUserDetail, setShowUserDetail] = useState(false)

  const [list, setList] = useState<UserData[]>([])
  const [currUser, setCurrUser] = useState<UserData | null>(null)

  const { setLoading } = useLoading()

  const { t } = useTranslation()

  const getAuthSourceLabel = useCallback(
    (authFromName: string) => {
      const authSourceMap: { [key: string]: string } = {
        Self: t('authSourceSelf'),
        Google: t('authSourceGoogle'),
        GitHub: t('authSourceGithub'),
        Microsoft: t('authSourceMicrosoft'),
      }
      return authSourceMap[authFromName] || authFromName
    },
    [t]
  )

  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const banDialogRef = useRef<BanDialogRef | null>(null)

  const { siteFrontId } = useParams()

  const { checkPermit, levelCompare } = useAuthedUserStore(
    useShallow(({ permit, levelCompare }) => ({
      checkPermit: permit,
      levelCompare,
    }))
  )
  const siteStore = useSiteStore()
  const alertDialog = useAlertDialogStore()

  const [pageState, setPageState] = useState<ListPageState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const [searchData, setSearchData] = useState<SearchFields>({
    ...defaultSearchData,
    keywords: params.get('keywords') || '',
    roleId: params.get('role_id') || '',
    authFrom: params.get('auth_from') || '',
    joinedFrom: params.get('joined_from') || '',
    joinedTo: params.get('joined_to') || '',
  })

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
          aria-label={t('selectAll')}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t('selectRow')}
          disabled={!row.getCanSelect()}
        />
      ),
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: '',
      cell: ({ row }) => (
        <Link to={'/users/' + row.original.name}>
          <BAvatar username={row.original.name} size={36} showUsername />
          {siteFrontId && siteStore.site?.creatorId == row.original.id && (
            <Badge
              variant={'outline'}
              className="text-xs text-gray-500 border-primary font-normal m-1"
            >
              {t('siteCreator')}
            </Badge>
          )}
        </Link>
      ),
    },
    {
      id: 'roleName',
      accessorKey: 'roleName',
      header: t('role'),
    },
    {
      id: 'roleLevel',
      accessorKey: 'roleLevel',
      header: t('permission'),
      cell: ({ row }) => <span>{row.original?.role?.level || '-'}</span>,
    },
    {
      id: 'authFromName',
      accessorKey: 'authFromName',
      header: t('authSource'),
      cell: ({ row }) => (
        <span>
          {row.original?.authFromName
            ? getAuthSourceLabel(row.original.authFromName)
            : '-'}
        </span>
      ),
    },
    {
      id: 'registeredAt',
      accessorKey: 'registeredAt',
      header: t('joinedAt'),
      cell: ({ cell }) => (
        <span>{timeFmt(cell.getValue<string>(), 'YYYY-M-D')}</span>
      ),
    },
    {
      id: 'contorles',
      accessorKey: 'contorles',
      header: '',
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

          {siteFrontId && levelCompare(row.original.role) < 0 && (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="m-1 text-destructive"
                onClick={async () => {
                  await onRemoveClick(row.original)
                }}
              >
                {t('removeName')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="m-1 text-destructive"
                onClick={async () => {
                  await onBlockClick(row.original)
                }}
              >
                {t('block')}
              </Button>
            </>
          )}
        </>
      ),
    },
  ]

  const table = useReactTable({
    data: list,
    columns: siteFrontId
      ? columns.filter(
          (col) => !['roleLevel', 'authFromName'].includes(col.id || '')
        )
      : columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    getRowId: (row) => row.name,
    enableRowSelection: (row) => levelCompare(row.original.role) < 0,
  })

  const selectedRows = table.getSelectedRowModel().rows

  const bannableUsers = useMemo(
    () => [
      ...selectedRows
        .map((item) => item.original)
        .filter((user) => !user.banned),
    ],
    [selectedRows]
  )

  /* useEffect(() => {
   *   console.log('selected: ', selectedUsers)
   * }, [selectedUsers]) */

  const resetParams = useCallback(() => {
    setParams((params) => {
      params.delete('page')
      params.delete('page_size')
      params.delete('keywords')
      params.delete('role_id')
      params.delete('auth_from')
      params.delete('joined_from')
      params.delete('joined_to')
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
          const roleId = params.get('role_id') || ''
          const authFrom = params.get('auth_from') || ''
          const joinedFrom = params.get('joined_from') || ''
          const joinedTo = params.get('joined_to') || ''

          setSearchData((state) => ({ ...state, keywords, roleId, authFrom, joinedFrom, joinedTo }))

          const resp = await getUserList(
            page,
            pageSize,
            keywords,
            roleId,
            '',
            authFrom,
            joinedFrom,
            joinedTo,
            {
              siteFrontId,
            }
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
      const { keywords, roleId, authFrom, joinedFrom, joinedTo } = searchData

      /* console.log('on search role id: ', roleId) */

      if (keywords) {
        params.set('keywords', keywords)
      }

      if (roleId) {
        params.set('role_id', roleId)
      }

      if (authFrom) {
        params.set('auth_from', authFrom)
      }

      if (joinedFrom) {
        params.set('joined_from', joinedFrom)
      }

      if (joinedTo) {
        params.set('joined_to', joinedTo)
      }

      return params
    })
  }, [setParams, searchData, resetParams])

  const onCancelBanAlert = () => {
    setBanOpen(false)
    if (banDialogRef.current) {
      banDialogRef.current.form.reset({ duration: '', reason: '' })
    }
  }

  const onBanSubmit = useCallback(
    async ({ duration, reason }: BanSchema) => {
      const durationNum = Number(duration)
      try {
        const selectedRows = table.getSelectedRowModel().rows

        /* console.log('selecte rows: ', rowSelection) */

        const usernames = [
          ...selectedRows
            .filter((item) => !item.original.banned)
            .map((item) => item.original.name),
        ]

        /* console.log('duration: ', durationNum)
         * console.log('reason: ', reason) */
        /* console.log('usernames: ', usernames) */

        if (usernames.length == 0 || !durationNum) return

        const resp = await banManyUsers(usernames, durationNum, reason)

        if (!resp.code) {
          setRowSelection({})
          setBanOpen(false)
          fetchUserList()

          if (banDialogRef.current) {
            banDialogRef.current.form.reset({ duration: '', reason: '' })
          }
        }
      } catch (err) {
        console.error('ban user error: ', err)
      }
    },
    [table, fetchUserList]
  )

  const onBanSelectedClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setBanOpen(true)
  }

  const onBlockSelectedClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      /* setBlockOpen(true) */
      if (!siteFrontId) return

      /* console.log('selected rows: ', selectedRows) */

      const userIds = selectedRows.map((item) => Number(item.original.id) || 0)
      if (userIds.length == 0) return

      const usernames = selectedRows.map((item) => item.original.name)

      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t('blockConfirm', { num: userIds.length }),
        'danger'
      )
      if (!confirmed) return

      const { code } = await blockUsers(siteFrontId, userIds, usernames)
      if (!code) {
        fetchUserList()
      }
    },
    [siteFrontId, selectedRows, alertDialog, fetchUserList, t]
  )

  const onRemoveSelectedClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      /* setBlockOpen(true) */
      if (!siteFrontId) return

      /* console.log('selected rows: ', selectedRows) */

      const userIds = selectedRows.map((item) => Number(item.original.id) || 0)
      if (userIds.length == 0) return

      const usernames = selectedRows.map((item) => item.original.name)

      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t('removeNameConfirm', { num: userIds.length }),
        'danger'
      )
      if (!confirmed) return

      const { code } = await removeMembers(siteFrontId, userIds, usernames)
      if (!code) {
        fetchUserList()
      }
    },
    [siteFrontId, selectedRows, alertDialog, fetchUserList, t]
  )

  const onBlockClick = useCallback(
    async (user: UserData) => {
      if (!siteFrontId) return
      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t('blockSingleConfirm', { username: user.name }),
        'danger'
      )
      if (!confirmed) return

      const { code } = await blockUser(siteFrontId, user.id, user.name)
      if (!code) {
        fetchUserList()
      }
    },
    [siteFrontId, alertDialog, fetchUserList, t]
  )

  const onRemoveClick = useCallback(
    async (user: UserData) => {
      if (!siteFrontId) return
      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t('removeSingleConfirm', { username: user.name }),
        'danger'
      )
      if (!confirmed) return

      const { code } = await removeMember(siteFrontId, user.id, user.name)
      if (!code) {
        fetchUserList()
      }
    },
    [siteFrontId, alertDialog, fetchUserList, t]
  )

  const onRoleSelectChange = useCallback((role: Role | undefined) => {
    if (role) {
      setSearchData((state) => ({
        ...state,
        roleId: role.id,
      }))
    }
  }, [])

  const onAuthSourceChange = useCallback(
    (authSource: { value: string; label: string } | undefined) => {
      setSearchData((state) => ({
        ...state,
        authFrom: authSource?.value || '',
      }))
    },
    []
  )

  useEffect(() => {
    fetchUserList(true)
  }, [location])

  return (
    <BContainer
      category={
        siteFrontId
          ? {
              isFront: true,
              frontId: 'siteUsers',
              name: t('memberList'),
              describe: t('memberListDescribe'),
            }
          : {
              isFront: true,
              frontId: 'users',
              name: t('userList'),
              describe: t('userListDescribe'),
            }
      }
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
          <div className="mr-3">
            <RoleSelector
              value={searchData.roleId || ''}
              placeholder={t('selectRole')}
              onChange={onRoleSelectChange}
            />
          </div>
          {!siteFrontId && checkPermit('user', 'manage_platform') && (
            <AuthSourceSelector
              value={searchData.authFrom || ''}
              placeholder={t('selectAuthSource')}
              onChange={onAuthSourceChange}
            />
          )}
          <div className="flex items-center ml-3">
            <Input
              type="date"
              className="w-[160px] h-[36px]"
              value={searchData.joinedFrom}
              onChange={(e) =>
                setSearchData((state) => ({
                  ...state,
                  joinedFrom: e.target.value,
                }))
              }
              placeholder={t('joinedFrom')}
            />
            <span className="mx-2">-</span>
            <Input
              type="date"
              className="w-[160px] h-[36px]"
              value={searchData.joinedTo}
              onChange={(e) =>
                setSearchData((state) => ({
                  ...state,
                  joinedTo: e.target.value,
                }))
              }
              placeholder={t('joinedTo')}
            />
          </div>
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
          {siteFrontId
            ? t('countMember', { num: pageState.total })
            : t('countUser', { num: pageState.total })}
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
                  {t('countSelectedUsers', { num: selectedRows.length })}
                </div>
                <div>
                  {bannableUsers.length > 0 && (
                    <>
                      <>
                        {checkPermit('site', 'manage') && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={onRemoveSelectedClick}
                          >
                            {t('removeSelectedUsers', {
                              num: bannableUsers.length,
                            })}
                          </Button>
                        )}

                        {siteFrontId &&
                          checkPermit('user', 'block_from_site') && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={onBlockSelectedClick}
                              className="ml-1"
                            >
                              {t('blockSelectedUsers', {
                                num: bannableUsers.length,
                              })}
                            </Button>
                          )}
                      </>
                      <>
                        {checkPermit('user', 'ban') && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={onBanSelectedClick}
                            className="ml-1"
                          >
                            {t('banSelectedUsers', {
                              num: bannableUsers.length,
                            })}
                          </Button>
                        )}
                      </>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {bannableUsers.length > 0 && (
        <BanDialog
          open={banOpen}
          onOpenChange={setBanOpen}
          users={bannableUsers}
          onSubmit={onBanSubmit}
          onCancel={onCancelBanAlert}
          ref={banDialogRef}
        />
      )}

      <Dialog open={showUserDetail} onOpenChange={setShowUserDetail}>
        {currUser && (
          <DialogContent>
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
