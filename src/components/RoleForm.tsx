import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { toSync } from '@/lib/fire-and-forget'
import { getPermissionModuleName, getPermissionName, noop } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { getPermissionList } from '@/api'
import { submitRole } from '@/api/role'
import { PermissionModule } from '@/constants/types'
import { Permission, PermissionListItem } from '@/types/types'

import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form'
import { Input } from './ui/input'
import { Switch } from './ui/switch'

interface RoleFormProps {
  isEdit?: boolean
  onCancel?: () => void
  onSuccess?: () => void
}

const roleSchema = z.object({
  name: z.string().min(1, '请填写角色名称'),
  level: z.string().min(1, '请填写权限级别'),
  permissionFrontIds: z.array(z.string()).optional(),
})

type RoleSchema = z.infer<typeof roleSchema>

const defaultRoleData: RoleSchema = {
  name: '',
  level: '3',
  permissionFrontIds: [],
}

const RoleForm: React.FC<RoleFormProps> = ({
  onCancel = noop,
  onSuccess = noop,
}) => {
  /* const [permissionOptions, setPermissionOptions] = useState<Permission[]>([]) */
  const [formattedPermissions, setFormattedPermissions] = useState<
    PermissionListItem[]
  >([])

  const form = useForm<RoleSchema>({
    resolver: zodResolver(roleSchema),
    defaultValues: { ...defaultRoleData },
  })

  const fetchPermisisonList = toSync(async () => {
    const { code, data } = await getPermissionList()
    console.log('permission data: ', data)
    if (!code) {
      /* setPermissionOptions([...data.list]) */
      setFormattedPermissions([...data.formattedList])
    } else {
      /* setPermissionOptions([]) */
      setFormattedPermissions([])
    }
  })

  const onSubmit = useCallback(
    async (vals: RoleSchema) => {
      console.log('vals: ', vals)
      const level = parseInt(vals.level, 10) || 0
      if (level < 3) {
        form.setError('level', {
          message: '权限级别不能小于 3',
        })
      }

      const { code } = await submitRole(
        vals.name,
        level,
        vals.permissionFrontIds || []
      )

      if (!code) {
        onSuccess()
      }
    },
    [form]
  )

  useEffect(() => {
    fetchPermisisonList()
  }, [])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          key="name"
          render={({ field, fieldState }) => (
            <FormItem className="mb-8">
              <FormLabel>角色名称</FormLabel>
              <FormControl>
                <Input
                  placeholder="请输入角色名称"
                  autoComplete="off"
                  state={fieldState.invalid ? 'invalid' : 'default'}
                  {...field}
                />
              </FormControl>
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
              <FormLabel>权限级别</FormLabel>
              <FormControl>
                <Input
                  placeholder="请输入权限级别"
                  autoComplete="off"
                  pattern="^\d+$"
                  state={fieldState.invalid ? 'invalid' : 'default'}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="permissionFrontIds"
          key="permissionFrontIds"
          render={({ field }) => (
            <>
              <FormLabel>权限</FormLabel>
              <div
                className="overflow-y-auto mt-2"
                style={{ maxHeight: 'calc(100vh - 600px)', minHeight: '200px' }}
              >
                {formattedPermissions.map((fItem) => (
                  <div key={fItem.module}>
                    <div className="mt-4 text-sm text-gray-500 mb-1">
                      {getPermissionModuleName(
                        fItem.module as PermissionModule
                      )}
                    </div>
                    <div className="flex flex-wrap">
                      {fItem.list.map((item) => (
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
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        />

        <div className="flex justify-between mt-4">
          <div></div>
          <div>
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
            <Button type="submit">提交</Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

export default RoleForm
