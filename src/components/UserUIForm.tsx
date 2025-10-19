import { zodResolver } from '@hookform/resolvers/zod'
import { GlobeIcon } from 'lucide-react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react'
import { UseFormReturn, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import z from 'zod'
import { useShallow } from 'zustand/react/shallow'

import { noop, setRootFontSize } from '@/lib/utils'

import { saveUserUISettings } from '@/api/user'
import { DEFAULT_CONTENT_WIDTH, DEFAULT_THEME } from '@/constants/constants'
import i18n from '@/i18n'
import {
  BackendUISettings,
  forceApplyUISettings,
  getLocalUserUISettings,
  registerUISettingsCallback,
  setLocalUserUISettings,
  unregisterUISettingsCallback,
  useAuthedUserStore,
  useDefaultFontSizeStore,
  useForceUpdate,
  useSiteStore,
  useTopDrawerStore,
  useUserUIStore,
} from '@/state/global'
import { SITE_LIST_MODE } from '@/types/types'

import { useTheme } from './theme-provider'
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
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Switch } from './ui/switch'

/* const modeList = [SITE_LIST_MODE.TopDrawer, SITE_LIST_MODE.DropdownMenu] */

const themeList = ['light', 'dark', 'system'] as const
const themeLabelMap = (theme: ThemeSchema) => {
  switch (theme) {
    case 'light':
      return i18n.t('light')
    case 'dark':
      return i18n.t('dark')
    case 'system':
      return i18n.t('syncWithSystem')
  }
}

const fontSizeList = ['12', '14', '16', '18', '20', 'custom'] as const
const fontSizeLabelMap = (fontSize: FontSizeSchema) => {
  switch (fontSize) {
    case '12':
      return i18n.t('xsmall')
    case '14':
      return i18n.t('small')
    case '16':
      return i18n.t('regular')
    case '18':
      return i18n.t('large')
    case '20':
      return i18n.t('xlarge')
    case 'custom':
      return i18n.t('custom')
  }
}

const MIN_FONT_SIZE = 10
const fontSizeSchema = z.union([
  z.literal('12'),
  z.literal('14'),
  z.literal('16'),
  z.literal('18'),
  z.literal('20'),
  z.literal('custom'),
])

const contentWidthList = ['1200', '-1', 'custom'] as const
const contentWidthLabelMap = (contentWidth: ContentWidthSchema) => {
  switch (contentWidth) {
    case '1200':
      return '1200px'
    case '-1':
      return i18n.t('full')
    case 'custom':
      return i18n.t('custom')
  }
}
const MIN_CONTENT_WIDTH = 1000
const contentWidthSchema = z.union([
  z.literal('1200'),
  z.literal('-1'),
  z.literal('custom'),
])
const themeSchema = z.union([
  z.literal('light'),
  z.literal('dark'),
  z.literal('system'),
])
const languageSchema = z.union([
  z.literal('zh'),
  z.literal('zh-CN'),
  z.literal('zh-Hans'),
  z.literal('en'),
  z.literal('en-US'),
])

const normalizeLanguageForForm = (lang: string): LanguageSchema => {
  if (lang.startsWith('zh')) {
    return 'zh-CN'
  }
  if (lang.startsWith('en')) {
    return 'en-US'
  }
  return 'en-US'
}

const userUISchema = z.object({
  mode: z.union([
    z.literal(SITE_LIST_MODE.TopDrawer),
    z.literal(SITE_LIST_MODE.DropdownMenu),
  ]),
  theme: themeSchema,
  fontSize: fontSizeSchema,
  customFontSize: z.string(),
  contentWidth: contentWidthSchema,
  customContentWidth: z.string(),
  lang: languageSchema,
  syncToOtherDevices: z.boolean(),
})

type FontSizeSchema = z.infer<typeof fontSizeSchema>
type ContentWidthSchema = z.infer<typeof contentWidthSchema>
type UserUISchema = z.infer<typeof userUISchema>
type ThemeSchema = z.infer<typeof themeSchema>
type LanguageSchema = z.infer<typeof languageSchema>

const defaultUserUIData: UserUISchema = {
  mode: SITE_LIST_MODE.TopDrawer,
  theme: DEFAULT_THEME,
  fontSize: useDefaultFontSizeStore.getState()
    .defaultFontSize as FontSizeSchema,
  customFontSize: '',
  contentWidth: DEFAULT_CONTENT_WIDTH,
  customContentWidth: '',
  lang: normalizeLanguageForForm(i18n.language),
  syncToOtherDevices: false,
}

export interface UserUIFormProps {
  onChange?: (dirty: boolean) => void
}

export interface UserUIFormRef {
  form: UseFormReturn<UserUISchema>
}

const UserUIForm = forwardRef<UserUIFormRef, UserUIFormProps>(
  ({ onChange = noop }, ref) => {
    /* const [syncDevices, setSyncDevices] = useState<CheckedState>(false) */
    /* const [customFontSize, setCustomFontSize] = useState('') */
    const defaultFontSize = useDefaultFontSizeStore(
      (state) => state.defaultFontSize
    )
    const isLogined = useAuthedUserStore((state) => state.isLogined())

    // Get all UI settings from userUIStore for consistency using useShallow
    const {
      siteListMode: currSiteListMode,
      fontSize: userUIFontSizeNum,
      contentWidth: userUIContentWidthNum,
      theme: userUITheme,
    } = useUserUIStore(
      useShallow((state) => ({
        siteListMode: state.siteListMode,
        fontSize: state.fontSize || Number(defaultFontSize),
        contentWidth: state.contentWidth || Number(DEFAULT_CONTENT_WIDTH),
        theme: state.theme,
      }))
    )

    const setSiteListMode = useUserUIStore((state) => state.setSiteListMode)
    const setUserUIState = useUserUIStore((state) => state.setState)
    const setOpenTopDrawer = useTopDrawerStore((state) => state.update)
    const setShowSiteListDropdown = useSiteStore(
      (state) => state.setShowSiteListDropdown
    )
    const forceUpdate = useForceUpdate((state) => state.forceUpdate)

    const { t, i18n } = useTranslation()

    // Get theme from userUIStore, fallback to theme provider
    const { setTheme } = useTheme()
    const effectiveTheme = userUITheme || DEFAULT_THEME

    // Convert numbers to strings for form processing
    const userUIFontSize = String(userUIFontSizeNum)
    const userUIContentWidth = String(userUIContentWidthNum)

    const fontSizeGlobalVal = useMemo(
      () =>
        fontSizeSchema.safeParse(userUIFontSize).success
          ? userUIFontSize
          : 'custom',
      [userUIFontSize]
    ) as FontSizeSchema

    const contentWidthGlobalVal = useMemo(
      () =>
        contentWidthSchema.safeParse(userUIContentWidth).success
          ? userUIContentWidth
          : 'custom',
      [userUIContentWidth]
    ) as ContentWidthSchema

    const form = useForm({
      resolver: zodResolver(userUISchema),
      defaultValues: {
        ...defaultUserUIData,
        mode: currSiteListMode,
        theme: effectiveTheme as ThemeSchema,
        fontSize: fontSizeGlobalVal,
        customFontSize: fontSizeGlobalVal == 'custom' ? userUIFontSize : '',
        contentWidth: contentWidthGlobalVal,
        customContentWidth:
          contentWidthGlobalVal == 'custom' ? userUIContentWidth : '',
        lang: normalizeLanguageForForm(i18n.language),
        syncToOtherDevices: false,
      },
    })

    useImperativeHandle(ref, () => ({ form }))

    const formVals = form.watch()

    const onSubmit = useCallback(
      async ({
        mode,
        theme,
        fontSize,
        customFontSize,
        contentWidth,
        customContentWidth,
        lang,
        syncToOtherDevices,
      }: UserUISchema) => {
        /* console.log('font size: ', fontSize) */

        let fs = String(fontSize)
        if (fontSize == 'custom') {
          fs = customFontSize
        }

        let cw = String(contentWidth)
        if (contentWidth == 'custom') {
          cw = customContentWidth
        }

        // Use same timestamp for both local and backend storage
        const timestamp = Date.now()
        const savedFontSize = Number(fs) || Number(defaultFontSize)
        const savedContentWidth = Number(cw) || Number(DEFAULT_CONTENT_WIDTH)

        setLocalUserUISettings({
          siteListMode: mode,
          theme,
          fontSize: savedFontSize,
          contentWidth: savedContentWidth,
          updatedAt: timestamp,
        })

        // Immediately update userUIStore to ensure form displays correctly after save
        setUserUIState({
          fontSize: savedFontSize,
          contentWidth: savedContentWidth,
          theme,
        })

        try {
          await i18n.changeLanguage(lang)
        } catch (err) {
          console.error('switch language error: ', err)
        }

        if (syncToOtherDevices) {
          try {
            await saveUserUISettings({
              mode,
              theme,
              fontSize: Number(fs) || Number(defaultFontSize),
              contentWidth: Number(cw) || Number(DEFAULT_CONTENT_WIDTH),
              lang,
              updatedAt: timestamp,
            })
          } catch (err) {
            console.error('save UI settings error: ', err)
          }
        }

        // Reset form with current form values (userUIStore has been updated)
        form.reset({
          mode,
          theme,
          fontSize,
          customFontSize,
          contentWidth,
          customContentWidth,
          lang,
          syncToOtherDevices,
        })

        forceUpdate()
      },
      [form, i18n, forceUpdate, setUserUIState, defaultFontSize]
    )

    useEffect(() => {
      setSiteListMode(formVals.mode)

      if (form.formState.isDirty) {
        if (formVals.mode == 'top_drawer') {
          setShowSiteListDropdown(false)
          setOpenTopDrawer(true)
        } else {
          setOpenTopDrawer(false)
          setShowSiteListDropdown(true)
        }
      }
    }, [
      form,
      formVals.mode,
      setSiteListMode,
      setOpenTopDrawer,
      setShowSiteListDropdown,
    ])

    useEffect(() => {
      /* console.log('set new theme in user ui form: ', formVals.theme) */
      setTheme(formVals.theme)
    }, [formVals.theme, setTheme])

    useEffect(() => {
      if (formVals.fontSize == 'custom') {
        setRootFontSize(formVals.customFontSize)
      } else {
        setRootFontSize(formVals.fontSize)
      }
    }, [formVals.fontSize, formVals.customFontSize])

    useEffect(() => {
      if (formVals.contentWidth == 'custom') {
        setUserUIState({
          contentWidth:
            Number(formVals.customContentWidth) ||
            Number(DEFAULT_CONTENT_WIDTH),
        })
      } else {
        setUserUIState({
          contentWidth: Number(formVals.contentWidth),
        })
      }
    }, [formVals, setUserUIState])

    useEffect(() => {
      onChange(form.formState.isDirty)
    }, [formVals, form, onChange])

    // Register callback to handle backend settings updates
    useEffect(() => {
      const handlePendingSettings = (settings: BackendUISettings) => {
        toast.info(t('settingsUpdatedFromAnotherDevice'), {
          description: t('doYouWantToApplyNewSettings'),
          duration: Infinity,
          action: {
            label: t('apply'),
            onClick: () => {
              // Apply settings to global state first
              forceApplyUISettings(settings)

              // Then update form to reflect the new values
              const newFontSizeStr = String(
                settings.fontSize || Number(defaultFontSize)
              )
              const newContentWidthStr = String(
                settings.contentWidth || Number(DEFAULT_CONTENT_WIDTH)
              )

              const newFontSizeVal = fontSizeSchema.safeParse(newFontSizeStr)
                .success
                ? (newFontSizeStr as FontSizeSchema)
                : 'custom'

              const newContentWidthVal = contentWidthSchema.safeParse(
                newContentWidthStr
              ).success
                ? (newContentWidthStr as ContentWidthSchema)
                : 'custom'

              form.reset({
                ...defaultUserUIData,
                mode: settings.mode || SITE_LIST_MODE.TopDrawer,
                theme: (settings.theme || DEFAULT_THEME) as ThemeSchema,
                fontSize: newFontSizeVal,
                customFontSize:
                  newFontSizeVal === 'custom' ? newFontSizeStr : '',
                contentWidth: newContentWidthVal,
                customContentWidth:
                  newContentWidthVal === 'custom' ? newContentWidthStr : '',
                lang: normalizeLanguageForForm(settings.lang || i18n.language),
                syncToOtherDevices: false,
              })
            },
          },
          cancel: {
            label: t('cancel'),
            onClick: () => {
              const existingSettings = getLocalUserUISettings()
              if (existingSettings) {
                setLocalUserUISettings({
                  ...existingSettings,
                  updatedAt: Date.now(),
                })
              }
            },
          },
        })
      }

      registerUISettingsCallback(handlePendingSettings)

      return () => {
        unregisterUISettingsCallback()
      }
    }, [t, form, i18n.language, defaultFontSize])

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="lang"
            key="lang"
            render={({ field }) => (
              <FormItem className="mb-8">
                <FormLabel>
                  <GlobeIcon
                    size={14}
                    className="inline-block align-[-1px] mr-1"
                  />
                  {t('language')}
                </FormLabel>
                <FormDescription></FormDescription>
                <FormControl>
                  <div>
                    <Select
                      value={field.value}
                      name={field.name}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-[180px] bg-white">
                        <SelectValue
                          placeholder={t('readonly')}
                          ref={field.ref}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="zh-CN">中文</SelectItem>
                          <SelectItem value="en-US">English</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fontSize"
            key="fontSize"
            render={({ field }) => (
              <FormItem className="mb-8">
                <FormLabel>{t('fontSize')}</FormLabel>
                <FormDescription></FormDescription>
                <FormControl>
                  <RadioGroup
                    className="flex flex-wrap"
                    value={field.value}
                    onValueChange={field.onChange}
                    ref={field.ref}
                  >
                    {fontSizeList.map((item) =>
                      item == 'custom' ? (
                        <FormItem
                          className="flex items-center space-y-0 mr-4 mb-4"
                          key={item}
                        >
                          <FormControl>
                            <RadioGroupItem value={item} className="mr-1" />
                          </FormControl>
                          <FormLabel className="font-normal whitespace-nowrap">
                            <span>{fontSizeLabelMap(item)}</span>
                            &nbsp;&nbsp;
                            <Input
                              type="number"
                              className="inline-block w-[100px] h-6"
                              min={MIN_FONT_SIZE}
                              defaultValue={
                                fontSizeGlobalVal == 'custom'
                                  ? userUIFontSize
                                  : ''
                              }
                              onFocus={() => field.onChange(item)}
                              onBlur={(e) => {
                                const val = Number(e.currentTarget.value)
                                if (!val) return

                                form.setValue(
                                  'customFontSize',
                                  val < MIN_FONT_SIZE
                                    ? String(MIN_FONT_SIZE)
                                    : String(val),
                                  { shouldDirty: true }
                                )
                              }}
                            />{' '}
                            px
                          </FormLabel>
                        </FormItem>
                      ) : (
                        <FormItem
                          className="flex items-center space-y-0 mr-4 mb-4"
                          key={item}
                        >
                          <FormControl>
                            <RadioGroupItem value={item} className="mr-1" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {fontSizeLabelMap(item)}
                          </FormLabel>
                        </FormItem>
                      )
                    )}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="theme"
            key="theme"
            render={({ field }) => (
              <FormItem className="mb-8">
                <FormLabel>{t('themeColor')}</FormLabel>
                <FormDescription></FormDescription>
                <FormControl>
                  <RadioGroup
                    className="flex flex-wrap"
                    value={field.value}
                    onValueChange={field.onChange}
                    ref={field.ref}
                  >
                    {themeList.map((item) => (
                      <FormItem
                        className="flex items-center space-y-0 mr-4 mb-4"
                        key={item}
                      >
                        <FormControl>
                          <RadioGroupItem value={item} className="mr-1" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {themeLabelMap(item)}
                        </FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contentWidth"
            key="contentWidth"
            render={({ field }) => (
              <FormItem className="mb-8">
                <FormLabel>{t('contentWidth')}</FormLabel>
                <FormDescription></FormDescription>
                <FormControl>
                  <RadioGroup
                    className="flex flex-wrap"
                    value={field.value}
                    onValueChange={field.onChange}
                    ref={field.ref}
                  >
                    {contentWidthList.map((item) =>
                      item == 'custom' ? (
                        <FormItem
                          className="flex items-center space-y-0 mr-4 mb-4"
                          key={item}
                        >
                          <FormControl>
                            <RadioGroupItem value={item} className="mr-1" />
                          </FormControl>
                          <FormLabel className="font-normal whitespace-nowrap">
                            <span>{contentWidthLabelMap(item)}</span>
                            &nbsp;&nbsp;
                            <Input
                              type="number"
                              className="inline-block w-[100px] h-6"
                              min={MIN_CONTENT_WIDTH}
                              defaultValue={
                                contentWidthGlobalVal == 'custom'
                                  ? userUIContentWidth
                                  : ''
                              }
                              onFocus={() => field.onChange(item)}
                              onBlur={(e) => {
                                const val = Number(e.currentTarget.value)
                                if (!val) return

                                form.setValue(
                                  'customContentWidth',
                                  val < MIN_CONTENT_WIDTH
                                    ? String(MIN_CONTENT_WIDTH)
                                    : String(val),
                                  { shouldDirty: true }
                                )
                              }}
                            />{' '}
                            px
                          </FormLabel>
                        </FormItem>
                      ) : (
                        <FormItem
                          className="flex items-center space-y-0 mr-4 mb-4"
                          key={item}
                        >
                          <FormControl>
                            <RadioGroupItem value={item} className="mr-1" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {contentWidthLabelMap(item)}
                          </FormLabel>
                        </FormItem>
                      )
                    )}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mode"
            key="mode"
            render={({ field }) => (
              <FormItem className="mb-8">
                <FormLabel>{t('siteListMode')}</FormLabel>
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
                      key={SITE_LIST_MODE.TopDrawer}
                    >
                      <FormControl>
                        <RadioGroupItem
                          value={SITE_LIST_MODE.TopDrawer}
                          className="mr-1"
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {t('topDrawer')}
                      </FormLabel>
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
                      <FormLabel className="font-normal">
                        {t('dropdown')}
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isLogined && (
            <FormField
              control={form.control}
              name="syncToOtherDevices"
              key="syncToOtherDevices"
              render={({ field }) => (
                <FormItem className="mb-8 flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    {t('syncToOtherDevices')}
                  </FormLabel>
                </FormItem>
              )}
            />
          )}

          <div className="flex justify-between">
            <span></span>
            <div className="flex items-center">
              <Button
                type="submit"
                size="sm"
                disabled={!form.formState.isDirty}
              >
                {t('save')}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    )
  }
)

export default UserUIForm
