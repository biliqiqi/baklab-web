import { zodResolver } from '@hookform/resolvers/zod'
// import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
// import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import BContainer from '@/components/base/BContainer'

import { updateUserProfile } from '@/api/user'
import { useAuthedUserStore } from '@/state/global'

const profileSchema = z.object({
  introduction: z
    .string()
    .max(500, 'Introduction must be less than 500 characters'),
  // showRoleName: z.boolean(),
})

type ProfileSchema = z.infer<typeof profileSchema>

export default function UserProfileSettingsPage() {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)

  const { userID, username, user, updateUserData } = useAuthedUserStore()

  const form = useForm<ProfileSchema>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      introduction: '',
      // showRoleName: true,
    },
  })

  // 当用户信息加载完成后，设置表单默认值
  useEffect(() => {
    if (user) {
      form.reset({
        introduction: user.introduction || '',
        // showRoleName: user.showRoleName ?? true,
      })
    }
  }, [user, form])

  const onSubmit = useCallback(
    async (data: ProfileSchema) => {
      if (!userID) return

      try {
        setSaving(true)

        const resp = await updateUserProfile({
          introduction: data.introduction,
          // showRoleName: data.showRoleName,
        })

        if (!resp.code) {
          // 更新本地用户信息
          if (user) {
            updateUserData({
              ...user,
              introduction: data.introduction,
              // showRoleName: data.showRoleName,
            })
          }

          toast.success(t('profileUpdatedSuccessfully'))
          form.reset(data) // 重置表单状态，清除dirty状态
        }
      } catch (error) {
        console.error('Update profile error:', error)
        toast.error(t('profileUpdateFailed'))
      } finally {
        setSaving(false)
      }
    },
    [userID, user, updateUserData, form, t]
  )

  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'settings-profile',
        name: t('personalProfile'),
        describe: t('manageYourPersonalInformation'),
      }}
      sidebarType="settings"
    >
      <Card className="p-4 text-sm mb-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 用户名显示（只读） */}
            <div className="space-y-2">
              <FormLabel>{t('username')}</FormLabel>
              <Input value={username || ''} disabled className="bg-muted" />
              <FormDescription>{t('usernameCannotBeChanged')}</FormDescription>
            </div>

            {/* 用户简介 */}
            <FormField
              control={form.control}
              name="introduction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('introduction')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('introduceYourself')}
                      className="min-h-[100px]"
                      maxLength={500}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('characterCount', {
                      current: field.value?.length || 0,
                      max: 500,
                    })}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 角色名称显示设置 */}
            {/* <FormField
              control={form.control}
              name="showRoleName"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      {field.value ? (
                        <EyeIcon size={16} />
                      ) : (
                        <EyeOffIcon size={16} />
                      )}
                      {t('showRoleName')}
                    </FormLabel>
                    <FormDescription>
                      {t('showRoleNameDescription')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            */}

            {/* 提交按钮 */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving || !form.formState.isDirty}
              >
                {saving ? t('saving') : t('save')}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </BContainer>
  )
}
