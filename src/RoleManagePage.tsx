import { zodResolver } from '@hookform/resolvers/zod'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { MouseEvent, useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
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

import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'
import RoleForm, { RoleFormType } from './components/RoleForm'
import RoleSelector from './components/RoleSelector'

import roleAPI, { getDefaultRole, getDefaultRoles, getRoles } from './api/role'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { defaultPageState } from './constants/defaults'
import i18n from './i18n'
import { toSync } from './lib/fire-and-forget'
import { useAlertDialogStore, useLoading } from './state/global'
import { DefaultRoles, ListPageState, Role } from './types/types'

const defaultRoleSchema = z.object({
  roleId: z.string(),
})

type DefaultRoleSchema = z.infer<typeof defaultRoleSchema>

interface EditRoleState {
  /* editting: boolean */
  role?: Role
}

const RoleFormTypeNameMap = (rft: RoleFormType) => {
  switch (rft) {
    case 'create':
      return i18n.t('createRole')
    case 'edit':
      return i18n.t('editRole')
    case 'detail':
      return i18n.t('roleDetail')
  }
}

export default function RoleManagePage() {
  /* const [loading, setLoading] = useState(false) */

  const [pageState, setPageState] = useState<ListPageState>({
    ...defaultPageState,
  })
  const [roleList, setRoleList] = useState<Role[]>([])
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [roleFormDirty, setRoleFormDirty] = useState(false)
  const [editDefaultRole, setEditDefaultRole] = useState(false)
  const [editSiteDefaultRole, setEditSiteDefaultRole] = useState(false)
  const [roleFormType, setRoleFormType] = useState<RoleFormType>('create')

  const [defaultRoles, setDefaultRoles] = useState<DefaultRoles | null>(null)

  const { setLoading } = useLoading()

  const { siteFrontId } = useParams()

  const { t } = useTranslation()

  /* const roleMap: JSONMap = useMemo(() => {
   *   return roleList.reduce((obj: JSONMap, item) => {
   *     obj[item.frontId] = item.name
   *     return obj
   *   }, {})
   * }, [roleList]) */

  const [editRole, setEditRole] = useState<EditRoleState>({
    /* editting: false, */
    role: undefined,
  })

  const [params] = useSearchParams()

  const alertDialog = useAlertDialogStore()

  const defaultRoleForm = useForm<DefaultRoleSchema>({
    resolver: zodResolver(
      defaultRoleSchema.extend({
        roleId: z.string().min(1, t('selectRoleTip')),
      })
    ),
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
      header: t('name'),
    },
    {
      id: 'isSystem',
      accessorKey: 'isSystem',
      header: t('roleType'),
      cell: ({ row }) => {
        return row.original.isSystem ? (
          <span>{t('system')}</span>
        ) : (
          <span>{t('userCreated')}</span>
        )
      },
    },
    {
      id: 'level',
      accessorKey: 'level',
      header: t('permissionLevel'),
    },
    {
      id: 'siteNumLimit',
      accessorKey: 'siteNumLimit',
      header: t('siteNumLimit'),
    },
    {
      id: 'relateUserCount',
      accessorKey: 'relateUserCount',
      header: t('relateUsers'),
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
      header: t('operations'),
      cell: ({ row }) => (
        <>
          <Button
            variant="secondary"
            size="sm"
            className="m-1"
            onClick={() => {
              setRoleFormType('detail')
              setEditRole({
                role: row.original,
              })
              setShowRoleForm(true)
            }}
          >
            {t('detail')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="m-1"
            onClick={() => {
              setEditRole({
                role: { ...row.original, name: '', isSystem: false },
              })
              setRoleFormType('create')
              setShowRoleForm(true)
            }}
          >
            {t('copy')}
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
      [params, siteFrontId, setLoading]
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
      const confirmed = await alertDialog.confirm(
        t('confirm'),
        roleFormType == 'create'
          ? t('roleAddDropConfirm')
          : t('roleEditDropConfirm'),
        'normal',
        {
          confirmBtnText: t('dropConfirm'),
          cancelBtnText:
            roleFormType == 'create'
              ? t('continueAdding')
              : t('continueSetting'),
        }
      )
      if (confirmed) {
        setShowRoleForm(false)
      }
    } else {
      setShowRoleForm(false)
    }
  }, [roleFormDirty, roleFormType, alertDialog, t])

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
    [defaultRoleForm, fetchDefaultRoles]
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
    [siteDefaultRoleForm, siteFrontId, fetchDefaultRoles, fetchSiteDefaultRole]
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
        name: t('role'),
        describe: '',
      }}
    >
      {defaultRoles && (
        <Card className="p-4 text-sm mb-4">
          {!!defaultRoles.platform && (
            <div className="flex justify-between items-center mb-2">
              <div>
                <b>{t('platformDefaultRole')}</b>：{' '}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRoleFormType('detail')
                    setEditRole({
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
                                placeholder={t('selectDefaultRole')}
                                onChange={(role) => {
                                  if (role) {
                                    defaultRoleForm.setValue(
                                      'roleId',
                                      role.id,
                                      { shouldDirty: true }
                                    )
                                  } else {
                                    defaultRoleForm.setValue('roleId', '', {
                                      shouldDirty: true,
                                    })
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
                        {t('cancel')}
                      </Button>
                      <Button type="submit" size="sm">
                        {t('confirm')}
                      </Button>
                    </form>
                  </Form>
                )}

                {!editDefaultRole && (
                  <Button
                    size="sm"
                    onClick={() => setEditDefaultRole(true)}
                  >
                    {t('settings')}
                  </Button>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-between items-center">
            <div>
              <b>{t('siteDefaultRole')}</b>：{' '}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRoleFormType('detail')
                  setEditRole({
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
                              placeholder={t('selectDefaultRole')}
                              onChange={(role) => {
                                if (role) {
                                  siteDefaultRoleForm.setValue(
                                    'roleId',
                                    role.id,
                                    { shouldDirty: true }
                                  )
                                } else {
                                  siteDefaultRoleForm.setValue('roleId', '', {
                                    shouldDirty: true,
                                  })
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
                      {t('cancel')}
                    </Button>
                    <Button type="submit" size="sm">
                      {t('confirm')}
                    </Button>
                  </form>
                </Form>
              )}

              {!editSiteDefaultRole && (
                <Button
                  size="sm"
                  onClick={() => setEditSiteDefaultRole(true)}
                >
                  {t('settings')}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
      <div className="flex justify-between items-center">
        <div>
          <Badge variant="secondary">
            {t('roleCount', { num: pageState.total })}
          </Badge>
        </div>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRoleFormType('create')
              setEditRole({
                role: undefined,
              })
              setShowRoleForm(true)
            }}
          >
            + {t('add')}
          </Button>
        </div>
      </div>

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
            <DialogTitle>{RoleFormTypeNameMap(roleFormType)}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <RoleForm
            key={`roleForm_${roleFormType}`}
            type={roleFormType}
            role={editRole.role}
            onCancel={onRoleFormClose}
            onSuccess={() => {
              setShowRoleForm(false)
              fetchRoleList()
            }}
            onChange={setRoleFormDirty}
            onFormTypeChange={setRoleFormType}
          />
        </DialogContent>
      </Dialog>
    </BContainer>
  )
}
