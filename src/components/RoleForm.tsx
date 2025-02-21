import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlertIcon } from 'lucide-react'
import { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'

import { toSync } from '@/lib/fire-and-forget'
import {
  cn,
  getPermissionModuleName,
  getPermissionName,
  noop,
} from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { getPermissionList } from '@/api'
import { deleteRole, submitRole, updateRole } from '@/api/role'
import { getUserList } from '@/api/user'
import { PermissionModule } from '@/constants/types'
import { useAlertDialogStore, useAuthedUserStore } from '@/state/global'
import {
  PermissionListItem,
  ResponseData,
  ResponseID,
  Role,
} from '@/types/types'

import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form'
import { Input } from './ui/input'
import { Switch } from './ui/switch'

export type RoleFormType = 'create' | 'edit' | 'detail'

export interface RoleFormProps {
  type?: RoleFormType
  role?: Role
  onCancel?: () => void
  onSuccess?: () => void
  onChange?: (isDirty: boolean) => void
}

const roleSchema = z.object({
  name: z.string().min(1, '请填写角色名称'),
  level: z.string().min(1, '请填写权限级别'),
  permissionFrontIds: z.string().array().optional(),
  siteNumLimit: z.string().min(1, '请填写可创建站点数量上限'),
})

type RoleSchema = z.infer<typeof roleSchema>

const defaultRoleData: RoleSchema = {
  name: '',
  level: '3',
  permissionFrontIds: [],
  siteNumLimit: '0',
}

const RoleForm: React.FC<RoleFormProps> = ({
  type = 'create',
  role,
  onCancel = noop,
  onSuccess = noop,
  onChange = noop,
}) => {
  const [formType, setFormType] = useState<RoleFormType>(type)
  /* const [permissionOptions, setPermissionOptions] = useState<Permission[]>([]) */
  const [formattedPermissions, setFormattedPermissions] = useState<
    PermissionListItem[]
  >([])
  const authStore = useAuthedUserStore()
  const alertDialog = useAlertDialogStore()

  const { siteFrontId } = useParams()

  const edittingPermissionIds = useMemo(() => {
    return role?.permissions ? role.permissions.map((item) => item.frontId) : []
  }, [role])

  const isEdit = useMemo(() => formType == 'edit', [formType])
  const isDetail = useMemo(() => formType == 'detail', [formType])
  const currRole = useMemo(() => authStore.user?.role, [authStore])
  const minLevel = useMemo(
    () => (currRole ? currRole.level + 1 : 99),
    [currRole]
  )

  const currPermissionFrontIds = useMemo(
    () => (role ? (role.permissions || []).map((item) => item.frontId) : []),
    [role]
  )

  const systemRole = useMemo(
    () => Boolean(isEdit && role && role.isSystem),
    [isEdit, role]
  )

  const form = useForm<RoleSchema>({
    resolver: zodResolver(roleSchema),
    defaultValues: isEdit
      ? ({
          name: role?.name || '',
          level: role ? String(role.level) : String(minLevel),
          permissionFrontIds: edittingPermissionIds,
          siteNumLimit: role ? String(role.siteNumLimit) : '0',
        } as RoleSchema)
      : { ...defaultRoleData, level: String(minLevel) },
  })

  const formVals = form.watch()

  const fetchPermisisonList = toSync(
    useCallback(async () => {
      const { code, data } = await getPermissionList({ siteFrontId })
      /* console.log('permission data: ', data) */
      if (!code) {
        /* setPermissionOptions([...data.list]) */
        setFormattedPermissions([...data.formattedList])
      } else {
        /* setPermissionOptions([]) */
        setFormattedPermissions([])
      }
    }, [siteFrontId])
  )

  const onSubmit = useCallback(
    async (vals: RoleSchema) => {
      /* console.log('vals: ', vals) */
      if (systemRole) return

      let resp: ResponseData<ResponseID> | undefined

      const level = parseInt(vals.level, 10) || 0
      if (level < minLevel) {
        form.setError('level', {
          message: `权限级别不能小于 ${minLevel}`,
        })
        return
      }

      const siteNumLimit = parseInt(vals.siteNumLimit, 10) || 0

      if (isEdit) {
        if (!role) return
        resp = await updateRole(
          role.id,
          vals.name,
          level,
          vals.permissionFrontIds || [],
          siteNumLimit,
          { siteFrontId }
        )
      } else {
        resp = await submitRole(
          vals.name,
          level,
          vals.permissionFrontIds || [],
          siteNumLimit,
          { siteFrontId }
        )
      }

      if (!resp.code) {
        onSuccess()
      }
    },
    [form, isEdit, role, systemRole, minLevel, siteFrontId, onSuccess]
  )

  const onDeleteClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()

      if (!isEdit || !role?.frontId) return

      const { code, data } = await getUserList(1, 1, '', role.id, '', {
        siteFrontId,
      })

      if (!code) {
        if (data.total > 0) {
          alertDialog.alert('无法删除', '该角色有关联用户，无法删除')
          return
        }
      }

      const confirmed = await alertDialog.confirm(
        '确认',
        '删除之后无法撤回，确认删除？',
        'danger'
      )

      if (!confirmed) return

      /* console.log('role: ', role) */

      const respD = await deleteRole(role.id, role.name, { siteFrontId })
      if (!respD.code) {
        onSuccess()
      }
    },
    [isEdit, role, alertDialog, onSuccess, siteFrontId]
  )

  useEffect(() => {
    fetchPermisisonList()
  }, [])

  useEffect(() => {
    onChange(form.formState.isDirty)
  }, [form, formVals, onChange])

  useEffect(() => {
    if (!isDetail && role) {
      form.setValue('name', role.name)
      form.setValue('level', String(role.level))
      form.setValue('siteNumLimit', String(role.siteNumLimit))
      form.setValue(
        'permissionFrontIds',
        (role.permissions || []).map((item) => item.frontId)
      )
    }
  }, [formType, form, role, isDetail])

  if ((isEdit || isDetail) && !role) return null

  return (
    <Form {...form} key={formType}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          key="name"
          render={({ field, fieldState }) => (
            <FormItem className="mb-8">
              <FormLabel>角色名称</FormLabel>
              {isDetail ? (
                <div>
                  <span className="talbe-cell text-sm">{role?.name}</span>
                </div>
              ) : (
                <FormControl>
                  <Input
                    placeholder="请输入角色名称"
                    autoComplete="off"
                    state={fieldState.invalid ? 'invalid' : 'default'}
                    disabled={systemRole}
                    {...field}
                  />
                </FormControl>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="level"
          key="level"
          render={({ field, fieldState }) => (
            <FormItem className="mb-8">
              <FormLabel>
                权限级别{' '}
                <FormDescription className="inline font-normal">
                  (数值越大，级别越低)
                </FormDescription>
              </FormLabel>
              <FormControl>
                {isDetail ? (
                  <div>{role?.level}</div>
                ) : (
                  <Input
                    placeholder="请输入权限级别"
                    autoComplete="off"
                    pattern="^\d+$"
                    state={fieldState.invalid ? 'invalid' : 'default'}
                    disabled={systemRole}
                    {...field}
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!siteFrontId && (
          <FormField
            control={form.control}
            name="siteNumLimit"
            key="siteNumLimit"
            render={({ field, fieldState }) => (
              <FormItem className="mb-8">
                <FormLabel>站点数量上限</FormLabel>
                <FormControl>
                  {isDetail ? (
                    <div>{role?.siteNumLimit}</div>
                  ) : (
                    <Input
                      placeholder="请输入站点数量上限"
                      autoComplete="off"
                      pattern="^\d+$"
                      state={fieldState.invalid ? 'invalid' : 'default'}
                      disabled={systemRole}
                      {...field}
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="permissionFrontIds"
          key="permissionFrontIds"
          render={({ field }) => (
            <>
              <FormLabel>拥有权限</FormLabel>
              <div
                className="overflow-y-auto pb-4"
                style={{ maxHeight: 'calc(100vh - 600px)', minHeight: '200px' }}
              >
                {isDetail &&
                (!role?.permissions || role.permissions.length == 0) ? (
                  <span className="text-sm text-gray-500">没有权限</span>
                ) : (
                  formattedPermissions
                    .filter((item) => {
                      if (isDetail) {
                        return item.list.some((item) =>
                          currPermissionFrontIds.includes(item.frontId)
                        )
                      }
                      return true
                    })
                    .map((fItem) => (
                      <div key={fItem.module}>
                        <div className="mt-4 text-sm text-gray-500 mb-1">
                          {getPermissionModuleName(
                            fItem.module as PermissionModule
                          )}
                        </div>
                        <div
                          className={cn(
                            'flex flex-wrap',
                            isDetail && 'p-2 rounded-sm bg-white pb-0'
                          )}
                        >
                          {fItem.list.map((item) =>
                            isDetail ? (
                              currPermissionFrontIds.includes(item.frontId) && (
                                <Badge
                                  variant="outline"
                                  key={item.frontId}
                                  className="mr-2 mb-2"
                                >
                                  {getPermissionName(item.frontId)}
                                </Badge>
                              )
                            ) : (
                              <div
                                className="flex justify-between p-4 m-1 bg-white border-b-1 rounded-sm"
                                key={item.frontId}
                              >
                                <Badge
                                  variant="outline"
                                  className="mr-2 outline-none border-none"
                                >
                                  {getPermissionName(item.frontId)}
                                </Badge>
                                <Switch
                                  checked={
                                    field.value?.includes(item.frontId) || false
                                  }
                                  disabled={systemRole}
                                  onCheckedChange={(checked) => {
                                    const newVal = checked
                                      ? [...(field.value || []), item.frontId]
                                      : (field.value || []).filter(
                                          (fId) => fId != item.frontId
                                        )
                                    field.onChange(newVal)
                                  }}
                                />
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </>
          )}
        />

        <div className="flex justify-between mt-4">
          <div>
            {isEdit && authStore.permit('role', 'edit') && !systemRole && (
              <Button
                variant="outline"
                className="border-destructive outline-destructive"
                size="sm"
                disabled={systemRole}
                onClick={onDeleteClick}
              >
                删除
              </Button>
            )}
            {isDetail && (
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  setFormType('edit')
                }}
              >
                设置
              </Button>
            )}
          </div>
          <div>
            {systemRole ? (
              <>
                <span className="inline-block mr-4 text-gray-500 text-sm">
                  <CircleAlertIcon size={16} className="inline-block" />{' '}
                  系统角色无法修改
                </span>
                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    onCancel()
                  }}
                >
                  确定
                </Button>
              </>
            ) : isDetail ? (
              <>
                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    onCancel()
                  }}
                >
                  确定
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={(e) => {
                    e.preventDefault()
                    onCancel()
                  }}
                  className="mr-2"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={systemRole || !form.formState.isDirty}
                >
                  提交
                </Button>
              </>
            )}
          </div>
        </div>
      </form>
    </Form>
  )
}

export default RoleForm
