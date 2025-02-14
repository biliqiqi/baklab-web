import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { timeFmt } from '@/lib/dayjs-custom'
import { cn, formatMinutes, getPermissionName, noop } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card, CardTitle } from '@/components/ui/card'
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
import { useAlertDialogStore, useAuthedUserStore } from '@/state/global'
import { Role, UserData } from '@/types/types'

import RoleSelector from './RoleSelector'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface UserDetailCardProps {
  title?: string
  user: UserData
  className?: string
  onSuccess?: () => void
}

const roleEditScheme = z.object({
  roleId: z.string().min(1, '请选择角色'),
  remark: z.string(),
  roleName: z.string(),
})

type RoleEditScheme = z.infer<typeof roleEditScheme>

const defaultRoleEditData: RoleEditScheme = {
  roleId: '',
  remark: '',
  roleName: '',
}

const UserDetailCard: React.FC<UserDetailCardProps> = ({
  title = '用户管理',
  className,
  user,
  onSuccess = noop,
}) => {
  const authStore = useAuthedUserStore()
  const [alertOpen, setAlertOpen] = useState(false)
  const [banOpen, setBanOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(user.role)

  const { siteFrontId } = useParams()

  const banDialogRef = useRef<BanDialogRef | null>(null)
  const alertDialog = useAlertDialogStore()

  const selectedPermissions = useMemo(
    () => selectedRole?.permissions || [],
    [selectedRole]
  )

  const form = useForm<RoleEditScheme>({
    resolver: zodResolver(roleEditScheme),
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
    async ({ roleId, remark, roleName }: RoleEditScheme) => {
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
          toast.success('用户角色已更新')
          /* fetchUserData(false) */
          onSuccess()
        }
      } catch (err) {
        console.error('confirm delete error: ', err)
      }
    },
    [user, form, onSuccess, siteFrontId]
  )

  const onUnbanClick = useCallback(async () => {
    try {
      const confirmed = await alertDialog.confirm(
        '确认',
        `确定解封 ${user.name} ？`
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
  }, [user, alertDialog, onSuccess])

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
        <CardTitle>{title}</CardTitle>
        <div className="table mt-4 w-full">
          <div className="table-row">
            <b className="table-cell py-2 w-24">邮箱：</b>
            <span className="table-cell py-2">{user.email}</span>
          </div>
          <div className="table-row">
            <b className="table-cell py-2">角色：</b>
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
                  封禁于 {timeFmt(user.bannedStartAt, 'YYYY-M-D h:m:s')}
                  <br />
                  封禁时长：
                  {user.bannedMinutes == -1
                    ? '永久'
                    : formatMinutes(user.bannedMinutes)}
                  <br />
                  总封禁次数：
                  {user.bannedCount} 次 <br />
                </div>
              )}
            </div>
          </div>
          <div className="table-row">
            <b className="table-cell py-2">权限级别：</b> {user.role.level}
          </div>
          <div className="table-row">
            {authStore.levelCompare(user.role) < 1 && (
              <>
                <b className="table-cell py-2">拥有权限：</b>
                <div className="table-cell py-2 bg-white p-1 rounded-sm">
                  {user.permissions
                    ? user.permissions.map((item) => (
                        <Badge
                          variant="outline"
                          className="mr-1 mb-1 font-normal"
                          key={item.frontId}
                        >
                          {getPermissionName(item.frontId) || ''}
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
                  更新角色
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
                      解封
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="ml-2"
                      onClick={() => setBanOpen(true)}
                    >
                      封禁
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Card>

      <AlertDialog
        defaultOpen={false}
        open={alertOpen}
        onOpenChange={setAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>更新角色</AlertDialogTitle>
            <AlertDialogDescription></AlertDialogDescription>
          </AlertDialogHeader>
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
                      将用户 {user?.name} 的角色更新为 &nbsp;
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
                    <div className="mb-4">角色拥有权限：</div>
                    {selectedPermissions.map((item) => (
                      <Badge
                        variant="outline"
                        key={item.frontId}
                        className="mr-2 mb-2"
                      >
                        {getPermissionName(item.frontId)}
                      </Badge>
                    ))}
                  </>
                ) : (
                  '所选角色没有任何权限'
                )}
              </div>
              <FormField
                control={form.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="备注" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              ></FormField>
            </form>
          </Form>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancelRoleUpdate}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={form.handleSubmit(onUpdateRole)}>
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
