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
import z from 'zod'

import { noop, setRootFontSize } from '@/lib/utils'

import {
  DEFAULT_CONTENT_WIDTH,
  DEFAULT_FONT_SIZE,
  DEFAULT_THEME,
} from '@/constants/constants'
import i18n from '@/i18n'
import {
  setLocalUserUISettings,
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
const languageSchema = z.union([z.literal('zh-CN'), z.literal('en-US')])
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
})

type FontSizeSchema = z.infer<typeof fontSizeSchema>
type ContentWidthSchema = z.infer<typeof contentWidthSchema>
type UserUISchema = z.infer<typeof userUISchema>
type ThemeSchema = z.infer<typeof themeSchema>
type LanguageSchema = z.infer<typeof languageSchema>

const defaultUserUIData: UserUISchema = {
  mode: SITE_LIST_MODE.TopDrawer,
  theme: DEFAULT_THEME,
  fontSize: DEFAULT_FONT_SIZE,
  customFontSize: '',
  contentWidth: DEFAULT_CONTENT_WIDTH,
  customContentWidth: '',
  lang: i18n.language as LanguageSchema,
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
    const currSiteListMode = useUserUIStore((state) => state.siteListMode)
    const setSiteListMode = useUserUIStore((state) => state.setSiteListMode)
    const userUIFontSize = useUserUIStore((state) =>
      String(state.fontSize || Number(DEFAULT_FONT_SIZE))
    )
    const userUIContentWidth = useUserUIStore((state) =>
      String(state.contentWidth || Number(DEFAULT_CONTENT_WIDTH))
    )
    const setUserUIState = useUserUIStore((state) => state.setState)
    const setOpenTopDrawer = useTopDrawerStore((state) => state.update)
    const setShowSiteListDropdown = useSiteStore(
      (state) => state.setShowSiteListDropdown
    )
    const forceUpdate = useForceUpdate((state) => state.forceUpdate)

    const { t, i18n } = useTranslation()

    // const userUISettings = useAuthedUserStore((state) => state.user?.uiSettings)

    const { theme, setTheme } = useTheme()

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
        theme: theme as ThemeSchema,
        fontSize: fontSizeGlobalVal,
        customFontSize: fontSizeGlobalVal == 'custom' ? userUIFontSize : '',
        contentWidth: contentWidthGlobalVal,
        customContentWidth:
          contentWidthGlobalVal == 'custom' ? userUIContentWidth : '',
        lang: i18n.language as LanguageSchema,
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

        setLocalUserUISettings({
          siteListMode: mode,
          theme,
          fontSize: Number(fs) || Number(DEFAULT_FONT_SIZE),
          contentWidth: Number(cw) || Number(DEFAULT_CONTENT_WIDTH),
          updatedAt: Date.now(),
        })

        try {
          await i18n.changeLanguage(lang)
        } catch (err) {
          console.error('switch language error: ', err)
        }

        form.reset({
          mode,
          theme,
          fontSize,
          customFontSize,
          contentWidth,
          customContentWidth,
          lang,
        })

        forceUpdate()
      },
      [form, i18n, forceUpdate]
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
