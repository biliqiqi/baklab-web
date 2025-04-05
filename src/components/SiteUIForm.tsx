import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import z from 'zod'

import { saveSiteUISettings } from '@/api/site'
import { useSiteStore, useSiteUIStore } from '@/state/global'
import { SITE_UI_MODE, SiteUIMode } from '@/types/types'

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
import { RadioGroup, RadioGroupItem } from './ui/radio-group'

const modeList = [SITE_UI_MODE.Sidebar, SITE_UI_MODE.TopNav] as const

const siteUISchema = z.object({
  mode: z.enum(modeList),
})

type SiteUISchema = z.infer<typeof siteUISchema>

const defaultSiteUIData: SiteUISchema = {
  mode: SITE_UI_MODE.Sidebar,
}

const SiteUIForm = () => {
  const setUIMode = useSiteUIStore((state) => state.setMode)
  const currUIMode = useSiteUIStore((state) => state.mode)

  const fetchSiteData = useSiteStore((state) => state.fetchSiteData)
  const siteUISettings = useSiteStore((state) => state.site?.uiSettings)

  const { siteFrontId } = useParams()

  const form = useForm({
    resolver: zodResolver(siteUISchema),
    defaultValues: { ...defaultSiteUIData, mode: currUIMode },
  })

  const formVals = form.watch()

  const onSubmit = useCallback(
    async ({ mode }: SiteUISchema) => {
      if (!siteFrontId) return

      const { code } = await saveSiteUISettings(siteFrontId, {
        mode,
      })
      if (!code) {
        toast.success('站点界面设置保存成功')
        await fetchSiteData(siteFrontId)

        form.reset({ mode })
      }
    },
    [siteFrontId, fetchSiteData, form]
  )

  useEffect(() => {
    /* console.log('site ui settings update: ', siteUISettings) */
    form.reset({
      mode:
        (siteUISettings?.mode as SiteUIMode | null | undefined) ||
        SITE_UI_MODE.TopNav,
    })
  }, [siteUISettings, form])

  useEffect(() => {
    setUIMode(formVals.mode)
  }, [formVals.mode, setUIMode])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="mode"
          key="mode"
          render={({ field }) => (
            <FormItem className="mb-8">
              <FormLabel>站点模式</FormLabel>
              <FormDescription></FormDescription>
              <FormControl>
                <RadioGroup
                  className="flex flex-wrap"
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormItem
                    className="flex items-center space-y-0 mr-4 mb-4"
                    key={SITE_UI_MODE.Sidebar}
                  >
                    <FormControl>
                      <RadioGroupItem
                        value={SITE_UI_MODE.Sidebar}
                        className="mr-1"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">侧边栏</FormLabel>
                  </FormItem>
                  <FormItem
                    className="flex items-center space-y-0 mr-4 mb-4"
                    key={SITE_UI_MODE.TopNav}
                  >
                    <FormControl>
                      <RadioGroupItem
                        value={SITE_UI_MODE.TopNav}
                        className="mr-1"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">顶部导航栏</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between">
          <span></span>
          <Button type="submit" size="sm" disabled={!form.formState.isDirty}>
            提交
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default SiteUIForm
