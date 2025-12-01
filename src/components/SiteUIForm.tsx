import { zodResolver } from '@hookform/resolvers/zod'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import { UseFormReturn, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import z from 'zod'

import { noop } from '@/lib/utils'

import { saveSiteUISettings } from '@/api/site'
import { saveUserUISettings } from '@/api/user'
import { useSiteParams } from '@/hooks/use-site-params'
import {
  useAuthedUserStore,
  useSiteStore,
  useSiteUIStore,
  useUserUIStore,
} from '@/state/global'
import {
  ARTICLE_LIST_MODE,
  ArticleListMode,
  SITE_UI_MODE,
  SiteUIMode,
} from '@/types/types'

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
  articleListMode: z.union([
    z.literal(ARTICLE_LIST_MODE.Compact),
    z.literal(ARTICLE_LIST_MODE.Preview),
    z.literal(ARTICLE_LIST_MODE.Grid),
  ]),
})

type SiteUISchema = z.infer<typeof siteUISchema>

const defaultSiteUIData: SiteUISchema = {
  mode: SITE_UI_MODE.Sidebar,
  articleListMode: ARTICLE_LIST_MODE.Preview,
}

export interface SiteUIFormProps {
  onChange?: (dirty: boolean) => void
}

export interface SiteUIFormRef {
  form: UseFormReturn<SiteUISchema>
  restoreGlobalState: () => void
}

const SiteUIForm = forwardRef<SiteUIFormRef, SiteUIFormProps>(
  ({ onChange = noop }, ref) => {
    const setUIMode = useSiteUIStore((state) => state.setMode)
    const currUIMode = useSiteUIStore((state) => state.mode)
    const setArticleListMode = useSiteUIStore(
      (state) => state.setArticleListMode
    )
    const currArticleListMode = useSiteUIStore((state) => state.articleListMode)

    const isLogined = useAuthedUserStore((state) => state.isLogined())
    const userArticleListMode = useUserUIStore((state) => state.articleListMode)
    const setUserUIState = useUserUIStore((state) => state.setState)

    const fetchSiteData = useSiteStore((state) => state.fetchSiteData)
    const siteUISettings = useSiteStore((state) => state.site?.uiSettings)

    const { t } = useTranslation()

    const { siteFrontId } = useSiteParams()

    const initialStateRef = useRef<{
      mode: SiteUIMode
      articleListMode: ArticleListMode
    } | null>(null)

    const form = useForm({
      resolver: zodResolver(siteUISchema),
      defaultValues: {
        ...defaultSiteUIData,
        mode: currUIMode,
        articleListMode: currArticleListMode,
      },
    })

    useEffect(() => {
      if (!form.formState.isDirty && !initialStateRef.current) {
        initialStateRef.current = {
          mode: currUIMode,
          articleListMode: currArticleListMode,
        }
      }
    }, [form.formState.isDirty, currUIMode, currArticleListMode])

    const restoreGlobalState = useCallback(() => {
      if (initialStateRef.current) {
        setUIMode(initialStateRef.current.mode)
        setArticleListMode(initialStateRef.current.articleListMode)
        initialStateRef.current = null
      }
    }, [setUIMode, setArticleListMode])

    useImperativeHandle(ref, () => ({ form, restoreGlobalState }))

    const formVals = form.watch()

    const hasUserCustomSettings =
      isLogined &&
      userArticleListMode !== undefined &&
      userArticleListMode !== formVals.articleListMode

    const onSubmit = useCallback(
      async ({ mode, articleListMode }: SiteUISchema) => {
        if (!siteFrontId) return

        const { code } = await saveSiteUISettings(siteFrontId, {
          mode,
          articleListMode,
        })
        if (!code) {
          toast.success(t('siteUISaveTip'))
          await fetchSiteData(siteFrontId)

          form.reset({ mode, articleListMode })
          initialStateRef.current = null

          if (
            isLogined &&
            userArticleListMode !== undefined &&
            userArticleListMode !== articleListMode
          ) {
            toast.info(t('syncSiteUIToPersonal'), {
              duration: Infinity,
              action: {
                label: t('sync'),
                onClick: () => {
                  void (async () => {
                    try {
                      await saveUserUISettings({
                        articleListMode,
                        updatedAt: Date.now(),
                      })
                      setUserUIState({ articleListMode })
                      toast.success(t('syncSuccess'))
                    } catch (err) {
                      console.error('sync user UI settings error: ', err)
                    }
                  })()
                },
              },
              cancel: {
                label: t('doNotSync'),
                onClick: () => {},
              },
            })
          }
        }
      },
      [
        siteFrontId,
        fetchSiteData,
        form,
        t,
        isLogined,
        userArticleListMode,
        setUserUIState,
      ]
    )

    useEffect(() => {
      /* console.log('site ui settings update: ', siteUISettings) */
      form.reset({
        mode:
          (siteUISettings?.mode as SiteUIMode | null | undefined) ||
          SITE_UI_MODE.TopNav,
        articleListMode:
          (siteUISettings?.articleListMode as
            | ArticleListMode
            | null
            | undefined) || ARTICLE_LIST_MODE.Compact,
      })
    }, [siteUISettings, form])

    useEffect(() => {
      setUIMode(formVals.mode)
      setArticleListMode(formVals.articleListMode)
    }, [formVals.mode, formVals.articleListMode, setUIMode, setArticleListMode])

    useEffect(() => {
      onChange(form.formState.isDirty)
    }, [form, formVals, onChange])

    useEffect(() => {
      const siteArticleListModeSetting =
        (siteUISettings?.articleListMode as
          | ArticleListMode
          | null
          | undefined) || ARTICLE_LIST_MODE.Compact
      setArticleListMode(siteArticleListModeSetting)
    }, [setArticleListMode, siteUISettings])

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="mode"
            key="mode"
            render={({ field }) => (
              <FormItem className="mb-8">
                <FormLabel>{t('siteMode')}</FormLabel>
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
                      <FormLabel className="font-normal">
                        {t('sidebar')}
                      </FormLabel>
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
                      <FormLabel className="font-normal">
                        {t('topNav')}
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="articleListMode"
            key="articleListMode"
            render={({ field }) => (
              <FormItem className="mb-8">
                <FormLabel>{t('articleListMode')}</FormLabel>
                <FormDescription></FormDescription>
                <FormControl>
                  <RadioGroup
                    className="flex flex-wrap"
                    value={field.value}
                    onValueChange={field.onChange}
                    ref={field.ref}
                  >
                    <FormItem
                      className="flex items-center space-y-0 mr-4 mb-4"
                      key={ARTICLE_LIST_MODE.Compact}
                    >
                      <FormControl>
                        <RadioGroupItem
                          value={ARTICLE_LIST_MODE.Compact}
                          className="mr-1"
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {t('compact')}
                      </FormLabel>
                    </FormItem>
                    <FormItem
                      className="flex items-center space-y-0 mr-4 mb-4"
                      key={ARTICLE_LIST_MODE.Preview}
                    >
                      <FormControl>
                        <RadioGroupItem
                          value={ARTICLE_LIST_MODE.Preview}
                          className="mr-1"
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {t('preview')}
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between">
            <span></span>
            <Button
              type="submit"
              size="sm"
              disabled={!form.formState.isDirty && !hasUserCustomSettings}
            >
              {t('save')}
            </Button>
          </div>
        </form>
      </Form>
    )
  }
)

export default SiteUIForm
