import { zodResolver } from '@hookform/resolvers/zod'
import { CheckedState } from '@radix-ui/react-checkbox'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import z from 'zod'

import { refreshAuthState } from '@/lib/request'

import { saveUserUISettings } from '@/api/user'
import { USER_UI_SETTINGS_KEY } from '@/constants/constants'
import {
  UserUIStateData,
  setLocalUserUISettings,
  useAuthedUserStore,
  useUserUIStore,
} from '@/state/global'
import { SITE_LIST_MODE, SiteListMode } from '@/types/types'

import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'

const modeList = [
  SITE_LIST_MODE.TopDrawer,
  SITE_LIST_MODE.DropdownMenu,
] as const

const userUISchema = z.object({
  mode: z.enum(modeList),
})

type UserUISchema = z.infer<typeof userUISchema>

const defaultUserUIData: UserUISchema = {
  mode: SITE_LIST_MODE.TopDrawer,
}

const UserUIForm = () => {
  /* const [syncDevices, setSyncDevices] = useState<CheckedState>(false) */
  const currSiteListMode = useUserUIStore((state) => state.siteListMode)
  const setSiteListMode = useUserUIStore((state) => state.setSiteListMode)

  const userUISettings = useAuthedUserStore((state) => state.user?.uiSettings)

  const form = useForm({
    resolver: zodResolver(userUISchema),
    defaultValues: { ...defaultUserUIData, mode: currSiteListMode },
  })

  const formVals = form.watch()

  const onSubmit = useCallback(
    ({ mode }: UserUISchema) => {
      /* console.log('sync devices: ', syncDevices) */
      setLocalUserUISettings({ siteListMode: mode, updatedAt: Date.now() })

      // if (syncDevices == true) {
      // const { code } = await saveUserUISettings({
      // mode,
      // })
      // if (!code) {
      // toast.success('个性化界面设置保存成功')
      // await refreshAuthState(true)
      // }
      // }

      form.reset({ mode })
    },
    [form]
  )

  //useEffect(() => {
  //const localUISettings = localStorage.getItem(USER_UI_SETTINGS_KEY)
  //
  //if (!localUISettings) {
  //form.reset({
  //mode:
  //(userUISettings?.mode as SiteListMode | null | undefined) ||
  //SITE_LIST_MODE.TopDrawer,
  //})
  //}
  //}, [userUISettings, form])

  useEffect(() => {
    setSiteListMode(formVals.mode)
  }, [formVals.mode, setSiteListMode])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="mode"
          key="mode"
          render={({ field }) => (
            <FormItem className="mb-8">
              <FormLabel>站点列表模式</FormLabel>
              <FormDescription></FormDescription>
              <FormControl>
                <RadioGroup
                  className="flex flex-wrap"
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormItem
                    className="flex items-center space-y-0 mr-4 mb-4"
                    key={SITE_LIST_MODE.TopDrawer}
                  >
                    <FormControl>
                      <RadioGroupItem
                        value={SITE_LIST_MODE.TopDrawer}
                        className="mr-1"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">顶部抽屉</FormLabel>
                  </FormItem>
                  <FormItem
                    className="flex items-center space-y-0 mr-4 mb-4"
                    key={SITE_LIST_MODE.DropdownMenu}
                  >
                    <FormControl>
                      <RadioGroupItem
                        value={SITE_LIST_MODE.DropdownMenu}
                        className="mr-1"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">下拉框</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between">
          <span></span>
          <div className="flex items-center">
            {/* <div className="inline-flex items-center space-x-2 mr-2">
              <Checkbox
                id="sync-devices"
                checked={syncDevices}
                onCheckedChange={setSyncDevices}
              />
              <label
                htmlFor="sync-devices"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-500"
              >
                同步到其他设备
              </label>
            </div> */}
            <Button type="submit" size="sm" disabled={!form.formState.isDirty}>
              保存
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

export default UserUIForm
