import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { timeFmt } from '@/lib/dayjs-custom'
import { cn, formatMinutes, noop } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { Card, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

import BanDialog, { BanDialogRef, BanSchema } from '@/components/BanDialog'

import { banUser, setUserRole, unBanUser } from '@/api/user'
import { useSiteParams } from '@/hooks/use-site-params'
import i18n from '@/i18n'
import { useAlertDialogStore, useAuthedUserStore } from '@/state/global'
import { Role, StringFn, UserData } from '@/types/types'

import RoleSelector from './RoleSelector'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface UserDetailCardProps {
  title?: string | StringFn
  user: UserData
  className?: string
  onSuccess?: () => void
}

const roleEditSchema = z.object({
  roleId: z.string(),
  remark: z.string(),
  roleName: z.string(),
})

type RoleEditSchema = z.infer<typeof roleEditSchema>

const defaultRoleEditData: RoleEditSchema = {
  roleId: '',
  remark: '',
  roleName: '',
}

const UserDetailCard: React.FC<UserDetailCardProps> = ({
  title = () => i18n.t('userManagement'),
  className,
  user,
  onSuccess = noop,
}) => {
  const authStore = useAuthedUserStore()
  const [alertOpen, setAlertOpen] = useState(false)
  const [banOpen, setBanOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(user.role)

  const { siteFrontId } = useSiteParams()

  const banDialogRef = useRef<BanDialogRef | null>(null)
  const alertDialog = useAlertDialogStore()
  const { t } = useTranslation()

  const selectedPermissions = useMemo(
    () => selectedRole?.permissions || [],
    [selectedRole]
  )

  const form = useForm<RoleEditSchema>({
    resolver: zodResolver(
      roleEditSchema.extend({
        roleId: z.string().min(1, t('selectRoleTip')),
      })
    ),
    defaultValues: {
      ...defaultRoleEditData,
      roleId: user.role.id,
      roleName: user.roleName,
    },
  })

  const onBanSubmit = useCallback(
    async ({ duration, reason }: BanSchema) => {
      const durationNum = Number(duration)
      try {
        if (!user.name || !durationNum) return

        const resp = await banUser(user.name, durationNum, reason)

        if (!resp.code) {
          setBanOpen(false)
          /* fetchUserData(false) */
          onSuccess()
          if (banDialogRef.current) {
            banDialogRef.current.form.reset({ duration: '1', reason: '' })
          }
        }
      } catch (err) {
        console.error('ban user error: ', err)
      }
    },
    [banDialogRef, user, onSuccess]
  )

  const onCancelRoleUpdate = () => {
    setAlertOpen(false)
  }

  const onCancelBanAlert = () => {
    setBanOpen(false)
  }

  const onUpdateRole = useCallback(
    async ({ roleId, remark, roleName }: RoleEditSchema) => {
      try {
        /* console.log('roleId: ', roleId)
         * console.log('roleName: ', roleName) */

        const resp = await setUserRole(user.name, roleId, remark, roleName, {
          siteFrontId,
        })
        if (!resp.code) {
          /* const {data} */
          form.reset({ ...defaultRoleEditData })
          setAlertOpen(false)
          toast.success(t('userRoleUpdateTip'))
          /* fetchUserData(false) */
          onSuccess()
        }
      } catch (err) {
        console.error('confirm delete error: ', err)
      }
    },
    [user, form, onSuccess, siteFrontId, t]
  )

  const onUnbanClick = useCallback(async () => {
    try {
      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t('unbanUserConfirm', { username: user.name })
      )
      if (confirmed) {
        const resp = await unBanUser(user.name)
        if (!resp.code) {
          /* fetchUserData(false) */
          onSuccess()
        }
      }
    } catch (err) {
      console.error('unban user error: ', err)
    }
  }, [user, alertDialog, onSuccess, t])

  useEffect(() => {
    if (selectedRole) {
      /* console.log('selected role: ', selectedRole) */
      form.setValue('roleId', selectedRole.id)
      form.setValue('roleName', selectedRole.name)
    } else {
      form.setValue('roleId', '')
      form.setValue('roleName', '')
    }
  }, [selectedRole, form])

  useEffect(() => {
    setSelectedRole(user.role)
  }, [user])

  return (
    <>
      <Card className={cn('p-3 mb-4 rounded-0', className)}>
        <CardTitle>{typeof title == 'function' ? title() : title}</CardTitle>
        <div className="table mt-4 w-full">
          {user.email && (
            <div className="table-row">
              <b className="table-cell py-2 w-24">{t('email')}：</b>
              <span className="table-cell py-2">{user.email}</span>
            </div>
          )}
          {!user.email && user.phone && (
            <div className="table-row">
              <b className="table-cell py-2 w-24">{t('phone')}：</b>
              <span className="table-cell py-2">{user.phone}</span>
            </div>
          )}
          <div className="table-row">
            <b className="table-cell py-2 w-24">{t('role')}：</b>
            <div className="table-cell py-2">
              <Badge
                variant="outline"
                className={cn(
                  user.roleFrontId == 'banned_user' ? 'border-red-500' : '',
                  'font-normal bg-white'
                )}
              >
                {user.roleName}
              </Badge>
              {user.banned && (
                <div className="bg-gray-100 text-sm mt-2 p-2 leading-6">
                  {t('bannedAt1')}{' '}
                  {timeFmt(user.bannedStartAt, 'YYYY-M-D h:m:s')}
                  <br />
                  {t('bannedDuration')}：
                  {user.bannedMinutes == -1
                    ? t('forever')
                    : formatMinutes(user.bannedMinutes)}
                  <br />
                  {t('bannedCount')}：
                  {t('timesCount', { num: user.bannedCount })} <br />
                </div>
              )}
            </div>
          </div>
          <div className="table-row">
            <b className="table-cell py-2 w-24">{t('permissionLevel')}：</b>{' '}
            {user.role.level}
          </div>
          <div className="table-row">
            {authStore.levelCompare(user.role) < 1 && (
              <>
                <b className="table-cell py-2">{t('havePermissions')}：</b>
                <div className="table-cell py-2 bg-white p-1 rounded-sm">
                  {user.permissions
                    ? user.permissions.map((item) => (
                        <Badge
                          variant="outline"
                          className="mr-1 mb-1 font-normal"
                          key={item.frontId}
                        >
                          {item.name || ''}
                        </Badge>
                      ))
                    : '-'}
                </div>
              </>
            )}
          </div>
        </div>
        <hr className="my-4" />
        <div className="flex justify-between">
          <div></div>
          {authStore.levelCompare(user.role) < 0 && (
            <div>
              {!user.banned && (
                <Button variant="outline" onClick={() => setAlertOpen(true)}>
                  {t('updateRoleBtn')}
                </Button>
              )}

              {authStore.permit('user', 'ban') && (
                <>
                  {user.banned ? (
                    <Button
                      variant="outline"
                      className="ml-2"
                      onClick={onUnbanClick}
                    >
                      {t('unban')}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="ml-2"
                      onClick={() => setBanOpen(true)}
                    >
                      {t('ban')}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Card>

      <Dialog defaultOpen={false} open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('updateRoleBtn')}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onUpdateRole)}
              className="py-4 space-y-8"
            >
              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('updateRoleLabel', { username: user.name })} &nbsp;
                    </FormLabel>
                    <FormControl>
                      <RoleSelector
                        value={field.value}
                        onChange={(role) => {
                          setSelectedRole(role || null)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              ></FormField>

              <div className="p-2 mb-2 border-[1px] rounded-sm bg-white text-sm text-gray-500">
                {selectedPermissions.length > 0 ? (
                  <>
                    <div className="mb-4">{t('permissionsInRole')}：</div>
                    {selectedPermissions.map((item) => (
                      <Badge
                        variant="outline"
                        key={item.frontId}
                        className="mr-2 mb-2"
                      >
                        {item.name}
                      </Badge>
                    ))}
                  </>
                ) : (
                  t('noPermissionInRole')
                )}
              </div>
              <FormField
                control={form.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder={t('remark')} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              ></FormField>
            </form>
          </Form>
          <DialogFooter>
            <Button variant={'secondary'} onClick={onCancelRoleUpdate}>
              {t('cancel')}
            </Button>
            <Button onClick={form.handleSubmit(onUpdateRole)}>
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BanDialog
        open={banOpen}
        onOpenChange={setBanOpen}
        users={user ? [user] : []}
        onSubmit={onBanSubmit}
        onCancel={onCancelBanAlert}
        ref={banDialogRef}
      />
    </>
  )
}

export default UserDetailCard
