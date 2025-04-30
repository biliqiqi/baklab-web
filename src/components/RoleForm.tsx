import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlertIcon } from 'lucide-react'
import { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
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
import { defaultRole } from '@/constants/defaults'
import { I18n, PermissionModule } from '@/constants/types'
import i18n from '@/i18n'
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
  onFormTypeChange?: (formType: RoleFormType) => void
}

const nameSchema = (i: I18n) =>
  z.string().min(1, i.t('inputTip', { field: i.t('roleName') }))
const levelSchema = (i: I18n) =>
  z.string().min(1, i.t('inputTip', { field: i.t('permissionLevel') }))
const siteNumLimitSchema = (i: I18n) =>
  z.string().min(1, i.t('inputTip', { field: i.t('siteNumLimit') }))

const roleSchema = z.object({
  name: nameSchema(i18n),
  level: levelSchema(i18n),
  permissionFrontIds: z.string().array().optional(),
  siteNumLimit: siteNumLimitSchema(i18n),
  showRoleName: z.boolean(),
})

type RoleSchema = z.infer<typeof roleSchema>

const defaultRoleData: RoleSchema = {
  name: '',
  level: '3',
  permissionFrontIds: [],
  siteNumLimit: '0',
  showRoleName: false,
}

const RoleForm: React.FC<RoleFormProps> = ({
  type = 'create',
  role = { ...defaultRole },
  onCancel = noop,
  onSuccess = noop,
  onChange = noop,
  onFormTypeChange = noop,
}) => {
  const [formType, setFormType] = useState<RoleFormType>(type)
  /* const [permissionOptions, setPermissionOptions] = useState<Permission[]>([]) */
  const [formattedPermissions, setFormattedPermissions] = useState<
    PermissionListItem[]
  >([])
  const authStore = useAuthedUserStore()
  const alertDialog = useAlertDialogStore()

  const { siteFrontId } = useParams()
  const { t, i18n } = useTranslation()

  const edittingPermissionFrontIds = useMemo(() => {
    return (role.permissions || []).map((item) => item.frontId)
  }, [role.permissions])

  const isEdit = useMemo(() => formType == 'edit', [formType])
  const isDetail = useMemo(() => formType == 'detail', [formType])
  const currRole = useMemo(() => authStore.user?.role, [authStore])
  const minLevel = useMemo(
    () => (currRole ? currRole.level + 1 : 99),
    [currRole]
  )

  const systemRole = useMemo(
    () => Boolean(isEdit && role && role.isSystem),
    [isEdit, role]
  )

  const form = useForm<RoleSchema>({
    resolver: zodResolver(
      roleSchema.extend({
        name: nameSchema(i18n),
        level: levelSchema(i18n),
        siteNumLimit: siteNumLimitSchema(i18n),
      })
    ),
    defaultValues: isEdit
      ? {
          name: role.name,
          level: String(role.level),
          permissionFrontIds: edittingPermissionFrontIds,
          siteNumLimit: String(role.siteNumLimit) || '0',
          showRoleName: role.showRoleName,
        }
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
      let resp: ResponseData<ResponseID> | undefined

      const level = parseInt(vals.level, 10) || 0
      if (!systemRole && level < minLevel) {
        form.setError('level', {
          message: t('minimumNum', {
            field: t('permissionLevel'),
            num: minLevel,
          }),
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
          vals.showRoleName,
          { siteFrontId }
        )
      } else {
        resp = await submitRole(
          vals.name,
          level,
          vals.permissionFrontIds || [],
          siteNumLimit,
          vals.showRoleName,
          { siteFrontId }
        )
      }

      if (!resp.code) {
        onSuccess()
      }
    },
    [form, isEdit, role, systemRole, minLevel, siteFrontId, onSuccess, t]
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
          alertDialog.alert(t('undeletable'), t('roleUndeletableTip'))
          return
        }
      }

      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t('roleDeleteConfirm'),
        'danger'
      )

      if (!confirmed) return

      /* console.log('role: ', role) */

      const respD = await deleteRole(role.id, role.name, { siteFrontId })
      if (!respD.code) {
        onSuccess()
      }
    },
    [isEdit, role, alertDialog, onSuccess, siteFrontId, t]
  )

  useEffect(() => {
    fetchPermisisonList()
  }, [])

  useEffect(() => {
    onChange(form.formState.isDirty)
  }, [form, formVals, onChange])

  useEffect(() => {
    onFormTypeChange(formType)
  }, [formType, onFormTypeChange])

  if ((isEdit || isDetail) && !role) return null

  return (
    <Form {...form} key={formType}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {systemRole && formType == 'edit' && (
          <div className="flex items-center mb-8 mt-4 text-gray-500">
            <CircleAlertIcon size={16} className="inline-block" />{' '}
            {t('systemRoleEditTip')}
          </div>
        )}
        <FormField
          control={form.control}
          name="name"
          key="name"
          render={({ field, fieldState }) => (
            <FormItem className="mb-8">
              <FormLabel>{t('roleName')}</FormLabel>
              {isDetail ? (
                <div>
                  <span className="talbe-cell text-sm">{role?.name}</span>
                </div>
              ) : (
                <FormControl>
                  <Input
                    placeholder={t('inputTip', { field: t('roleName') })}
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
        <div className="text-sm mb-8">
          <div className="font-bold mb-4">{t('roleType')}</div>
          <div>{role.isSystem ? t('system') : t('userCreated')}</div>
        </div>
        {siteFrontId && (
          <FormField
            control={form.control}
            name="showRoleName"
            key="showRoleName"
            render={({ field }) => (
              <FormItem className="mb-8">
                <FormLabel>{t('displayRoleName')}</FormLabel>
                <FormDescription>
                  {isDetail ? t('displayRoleNameDescribe') : ''}
                </FormDescription>
                {isDetail ? (
                  <div>
                    <span className="talbe-cell text-sm">
                      {role?.showRoleName ? t('display') : t('displayNone')}
                    </span>
                  </div>
                ) : (
                  <FormControl>
                    <div className="flex items-center">
                      <Switch
                        id="show-role-name"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <label
                        htmlFor="show-role-name"
                        className="inline-block pl-2 leading-[24px] text-sm"
                      >
                        {t('displayRoleNameDescribe')}
                      </label>
                    </div>
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="level"
          key="level"
          render={({ field, fieldState }) => (
            <FormItem className="mb-8">
              <FormLabel>
                {t('permissionLevel')}{' '}
                <FormDescription className="inline font-normal">
                  ({t('permissionLevelDescribe')})
                </FormDescription>
              </FormLabel>
              <FormControl>
                {isDetail ? (
                  <div>{role?.level}</div>
                ) : (
                  <Input
                    placeholder={t('inputTip', { field: t('permissionLevel') })}
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
                <FormLabel>{t('siteNumLimit')}</FormLabel>
                <FormControl>
                  {isDetail ? (
                    <div>{role?.siteNumLimit}</div>
                  ) : (
                    <Input
                      placeholder={t('inputTip', { field: t('siteNumLimit') })}
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
              <FormLabel>{t('havePermissions')}</FormLabel>
              <div
                className="overflow-y-auto pb-4"
                style={{ maxHeight: 'calc(100vh - 600px)', minHeight: '200px' }}
              >
                {isDetail &&
                (!role?.permissions || role.permissions.length == 0) ? (
                  <span className="text-sm text-gray-500">
                    {t('noPermission')}
                  </span>
                ) : (
                  formattedPermissions
                    .filter((item) => {
                      if (isDetail) {
                        return item.list.some((item) =>
                          edittingPermissionFrontIds.includes(item.frontId)
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
                              edittingPermissionFrontIds.includes(
                                item.frontId
                              ) && (
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
                {t('delete')}
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
                {t('settings')}
              </Button>
            )}
          </div>
          <div>
            {isDetail ? (
              <>
                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    onCancel()
                  }}
                >
                  {t('confirm')}
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
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={!form.formState.isDirty}>
                  {t('submit')}
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
