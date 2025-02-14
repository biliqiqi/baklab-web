import { zodResolver } from '@hookform/resolvers/zod'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { MouseEvent, useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { z } from '@/lib/zod-custom'

import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog'
import { Form, FormControl, FormField, FormItem } from './components/ui/form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import BContainer from './components/base/BContainer'
import { BLoaderBlock } from './components/base/BLoader'

import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'
import RoleForm from './components/RoleForm'
import RoleSelector from './components/RoleSelector'

import roleAPI, { getDefaultRole, getDefaultRoles, getRoles } from './api/role'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { defaultPageState } from './constants/defaults'
import { toSync } from './lib/fire-and-forget'
import { useAlertDialogStore } from './state/global'
import { DefaultRoles, ListPageState, Role } from './types/types'

const defaultRoleSchema = z.object({
  roleId: z.string().min(1, '请选择角色'),
})

type DefaultRoleSchema = z.infer<typeof defaultRoleSchema>

interface EditRoleState {
  editting: boolean
  role?: Role
}

export default function RoleManagePage() {
  const [loading, setLoading] = useState(false)

  const [pageState, setPageState] = useState<ListPageState>({
    ...defaultPageState,
  })
  const [roleList, setRoleList] = useState<Role[]>([])
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [roleFormDirty, setRoleFormDirty] = useState(false)
  const [editDefaultRole, setEditDefaultRole] = useState(false)
  const [editSiteDefaultRole, setEditSiteDefaultRole] = useState(false)

  const [defaultRoles, setDefaultRoles] = useState<DefaultRoles | null>(null)

  const { siteFrontId } = useParams()

  /* const roleMap: JSONMap = useMemo(() => {
   *   return roleList.reduce((obj: JSONMap, item) => {
   *     obj[item.frontId] = item.name
   *     return obj
   *   }, {})
   * }, [roleList]) */

  const [editRole, setEditRole] = useState<EditRoleState>({
    editting: false,
    role: undefined,
  })

  const [params] = useSearchParams()

  const alertDialog = useAlertDialogStore()

  const defaultRoleForm = useForm<DefaultRoleSchema>({
    resolver: zodResolver(defaultRoleSchema),
    defaultValues: {
      roleId: '',
    },
  })

  const siteDefaultRoleForm = useForm<DefaultRoleSchema>({
    resolver: zodResolver(defaultRoleSchema),
    defaultValues: {
      roleId: '',
    },
  })

  const columns: ColumnDef<Role>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: '名称',
    },
    {
      id: 'level',
      accessorKey: 'level',
      header: '权限级别',
    },
    {
      id: 'siteNumLimit',
      accessorKey: 'siteNumLimit',
      header: '可创建站点数上限',
    },
    {
      id: 'relateUserCount',
      accessorKey: 'relateUserCount',
      header: '关联用户',
      cell: ({ row }) =>
        row.original.relateUserCount > 0 ? (
          <Button variant="link" asChild>
            <Link
              to={`${siteFrontId ? '/' + siteFrontId : ''}/manage/users?role_id=${row.original.id}`}
            >
              {row.original.relateUserCount}
            </Link>
          </Button>
        ) : (
          <Button variant="link" disabled>
            0
          </Button>
        ),
    },
    {
      id: 'contorles',
      accessorKey: 'contorles',
      header: '操作',
      cell: ({ row }) => (
        <>
          <Button
            variant="secondary"
            size="sm"
            className="m-1"
            onClick={() => {
              setEditRole({
                editting: true,
                role: row.original,
              })
              setShowRoleForm(true)
            }}
          >
            详细
          </Button>
        </>
      ),
    },
  ]

  const table = useReactTable({
    data: roleList,
    columns: siteFrontId
      ? columns.filter((col) => col.id != 'siteNumLimit')
      : columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const fetchRoleList = toSync(
    useCallback(
      async (keywords?: string) => {
        setLoading(true)
        const page = parseInt(params.get('page') || '', 10) || 1

        const { code, data } = await getRoles(
          page,
          DEFAULT_PAGE_SIZE,
          keywords,
          { siteFrontId }
        )
        if (!code && data.list) {
          /* console.log('role list: ', data) */
          setRoleList([...data.list])
          setPageState({
            currPage: data.currPage,
            pageSize: data.pageSize,
            total: data.total,
            totalPage: data.totalPage,
          })
        } else {
          setRoleList([])
          setPageState({ ...defaultPageState })
        }
        setLoading(false)
      },
      [params, siteFrontId]
    )
  )

  const fetchDefaultRoles = toSync(async () => {
    const { code, data } = await getDefaultRoles()
    /* console.log('default role: ', data) */
    if (!code) {
      setDefaultRoles({ ...data })
    }
  })

  const fetchSiteDefaultRole = toSync(
    useCallback(async () => {
      const { code, data } = await getDefaultRole({ siteFrontId })
      /* console.log('default role: ', data) */
      if (!code) {
        /* setDefaultRoles({ ...data }) */
        setDefaultRoles({ site: data })
      }
    }, [siteFrontId])
  )

  const onRoleFormClose = useCallback(async () => {
    if (roleFormDirty) {
      const { editting } = editRole
      const confirmed = await alertDialog.confirm(
        '确认',
        editting ? '角色数据有改动，确认舍弃？' : '角色添加未完成，确认舍弃？',
        'normal',
        {
          confirmBtnText: '确定舍弃',
          cancelBtnText: editting ? '继续设置' : '继续添加',
        }
      )
      if (confirmed) {
        setShowRoleForm(false)
      }
    } else {
      setShowRoleForm(false)
    }
  }, [roleFormDirty, editRole])

  const onDefaultRoleSubmit = useCallback(
    async ({ roleId }: DefaultRoleSchema) => {
      /* console.log('roleId: ', roleId) */
      if (!roleId) return

      const { code } = await roleAPI.setDefaultRole(roleId, false)
      if (!code) {
        fetchDefaultRoles()
        setEditDefaultRole(false)
        defaultRoleForm.reset({ roleId: '' })
      }
    },
    [defaultRoleForm]
  )

  const onSiteDefaultRoleSubmit = useCallback(
    async ({ roleId }: DefaultRoleSchema) => {
      /* console.log('roleId: ', roleId) */
      if (!roleId) return

      const { code } = await roleAPI.setDefaultRole(roleId, true, {
        siteFrontId,
      })
      if (!code) {
        if (siteFrontId) {
          fetchSiteDefaultRole()
        } else {
          fetchDefaultRoles()
        }
        setEditSiteDefaultRole(false)
        siteDefaultRoleForm.reset({ roleId: '' })
      }
    },
    [siteDefaultRoleForm, siteFrontId]
  )

  const onCancelEditDefaultRole = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      setEditDefaultRole(false)
      defaultRoleForm.reset({ roleId: '' })
    },
    [defaultRoleForm]
  )

  const onCancelEditSiteDefaultRole = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      setEditSiteDefaultRole(false)
      defaultRoleForm.reset({ roleId: '' })
    },
    [defaultRoleForm]
  )

  useEffect(() => {
    fetchRoleList()
  }, [params])

  useEffect(() => {
    if (siteFrontId) {
      fetchSiteDefaultRole()
    } else {
      fetchDefaultRoles()
    }
  }, [siteFrontId])

  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'role_manage',
        name: '角色',
        describe: '',
      }}
    >
      {defaultRoles && (
        <Card className="p-4 text-sm mb-4">
          {!!defaultRoles.platform && (
            <div className="flex justify-between items-center mb-2">
              <div>
                <b>平台用户默认角色</b>：{' '}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditRole({
                      editting: true,
                      role: defaultRoles.platform,
                    })
                    setShowRoleForm(true)
                  }}
                >
                  {defaultRoles.platform.name}
                </Button>
              </div>
              <div>
                {editDefaultRole && (
                  <Form {...defaultRoleForm}>
                    <form
                      onSubmit={defaultRoleForm.handleSubmit(
                        onDefaultRoleSubmit
                      )}
                      className="inline-block"
                    >
                      <FormField
                        control={defaultRoleForm.control}
                        name="roleId"
                        key="roleId"
                        render={({ field, fieldState }) => (
                          <FormItem className="inline-block mr-2">
                            <FormControl>
                              <RoleSelector
                                valid={!fieldState.invalid}
                                value={field.value}
                                placeholder="选择默认角色"
                                onChange={(role) => {
                                  if (role) {
                                    defaultRoleForm.setValue('roleId', role.id)
                                  } else {
                                    defaultRoleForm.setValue('roleId', '')
                                  }
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mr-2"
                        onClick={onCancelEditDefaultRole}
                      >
                        取消
                      </Button>
                      <Button type="submit" size="sm">
                        确认
                      </Button>
                    </form>
                  </Form>
                )}

                {!editDefaultRole && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditDefaultRole(true)}
                  >
                    设置
                  </Button>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-between items-center">
            <div>
              <b>站点用户默认角色</b>：{' '}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditRole({
                    editting: true,
                    role: defaultRoles.site,
                  })
                  setShowRoleForm(true)
                }}
              >
                {defaultRoles.site.name}
              </Button>
            </div>
            <div>
              {editSiteDefaultRole && (
                <Form {...siteDefaultRoleForm}>
                  <form
                    onSubmit={siteDefaultRoleForm.handleSubmit(
                      onSiteDefaultRoleSubmit
                    )}
                    className="inline-block"
                  >
                    <FormField
                      control={siteDefaultRoleForm.control}
                      name="roleId"
                      key="roleId"
                      render={({ field, fieldState }) => (
                        <FormItem className="inline-block mr-2">
                          <FormControl>
                            <RoleSelector
                              valid={!fieldState.invalid}
                              value={field.value}
                              placeholder="选择默认角色"
                              onChange={(role) => {
                                if (role) {
                                  siteDefaultRoleForm.setValue(
                                    'roleId',
                                    role.id
                                  )
                                } else {
                                  siteDefaultRoleForm.setValue('roleId', '')
                                }
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mr-2"
                      onClick={onCancelEditSiteDefaultRole}
                    >
                      取消
                    </Button>
                    <Button type="submit" size="sm">
                      确认
                    </Button>
                  </form>
                </Form>
              )}

              {!editSiteDefaultRole && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditSiteDefaultRole(true)}
                >
                  设置
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
      <div className="flex justify-between items-center">
        <div>
          <Badge variant="secondary">{pageState.total} 个角色</Badge>
        </div>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditRole({
                editting: false,
                role: undefined,
              })
              setShowRoleForm(true)
            }}
          >
            + 添加
          </Button>
        </div>
      </div>

      {loading && <BLoaderBlock />}

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

      <Dialog open={showRoleForm} onOpenChange={onRoleFormClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editRole.editting ? '角色详情' : '创建角色'}
            </DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <RoleForm
            type={editRole.editting ? 'detail' : 'create'}
            role={editRole.role}
            onCancel={onRoleFormClose}
            onSuccess={() => {
              setShowRoleForm(false)
              fetchRoleList()
            }}
            onChange={(dirty) => {
              setRoleFormDirty(dirty)
            }}
          />
        </DialogContent>
      </Dialog>
    </BContainer>
  )
}
