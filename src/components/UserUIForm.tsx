import { zodResolver } from '@hookform/resolvers/zod'
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import { UseFormReturn, useForm } from 'react-hook-form'
import z from 'zod'

import { noop, setRootFontSize } from '@/lib/utils'

import {
  DEFAULT_CONTENT_WIDTH,
  DEFAULT_FONT_SIZE,
  DEFAULT_THEME,
} from '@/constants/constants'
import { setLocalUserUISettings, useUserUIStore } from '@/state/global'
import { SITE_LIST_MODE, SiteListMode } from '@/types/types'

import { useTheme } from './ThemeProvider'
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

/* const modeList = [SITE_LIST_MODE.TopDrawer, SITE_LIST_MODE.DropdownMenu] */

const themeList = ['light', 'dark', 'system'] as const
const themeLabelMap = {
  light: '亮色',
  dark: '暗色',
  system: '跟随系统',
}

const fontSizeList = ['12', '14', '16', '18', '20', 'custom'] as const
const fontSizeLabelMap = {
  '12': '极小',
  '14': '小',
  '16': '普通',
  '18': '大',
  '20': '极大',
  custom: '自定义',
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
const contentWidthLabelMap = {
  '1200': '1200px',
  '-1': '铺满',
  custom: '自定义',
}
const MIN_CONTENT_WIDTH = 1000
const contentWidthSchema = z.union([
  z.literal('1200'),
  z.literal('-1'),
  z.literal('custom'),
])

const userUISchema = z.object({
  mode: z.union([
    z.literal(SITE_LIST_MODE.TopDrawer),
    z.literal(SITE_LIST_MODE.DropdownMenu),
  ]),
  theme: z.union([z.literal('light'), z.literal('dark'), z.literal('system')]),
  fontSize: fontSizeSchema,
  customFontSize: z.string(),
  contentWidth: contentWidthSchema,
  customContentWidth: z.string(),
})

type FontSizeSchema = z.infer<typeof fontSizeSchema>

type ContentWidthSchema = z.infer<typeof contentWidthSchema>

type UserUISchema = z.infer<typeof userUISchema>

const defaultUserUIData: UserUISchema = {
  mode: SITE_LIST_MODE.TopDrawer,
  theme: DEFAULT_THEME,
  fontSize: DEFAULT_FONT_SIZE,
  customFontSize: '',
  contentWidth: DEFAULT_CONTENT_WIDTH,
  customContentWidth: '',
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
        theme,
        fontSize: fontSizeGlobalVal,
        contentWidth: contentWidthGlobalVal,
      },
    })

    useImperativeHandle(ref, () => ({ form }))

    const formVals = form.watch()

    const onSubmit = useCallback(
      ({
        mode,
        theme,
        fontSize,
        customFontSize,
        contentWidth,
        customContentWidth,
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

        // if (syncDevices == true) {
        // const { code } = await saveUserUISettings({
        // mode,
        // })
        // if (!code) {
        // toast.success('个性化界面设置保存成功')
        // await refreshAuthState(true)
        // }
        // }

        form.reset({
          mode,
          theme,
          fontSize,
          customFontSize,
          contentWidth,
          customContentWidth,
        })
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

    useEffect(() => {
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
      if (fontSizeGlobalVal == 'custom') {
        /* setCustomFontSize(userUIFontSize) */
        form.setValue('customFontSize', userUIFontSize)
      }
    }, [fontSizeGlobalVal, userUIFontSize, form])

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
      if (contentWidthGlobalVal == 'custom') {
        form.setValue('customContentWidth', userUIContentWidth)
      }
    }, [contentWidthGlobalVal, userUIContentWidth, form])

    useEffect(() => {
      onChange(form.formState.isDirty)
    }, [formVals, form, onChange])

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="fontSize"
            key="fontSize"
            render={({ field }) => (
              <FormItem className="mb-8">
                <FormLabel>字号大小</FormLabel>
                <FormDescription></FormDescription>
                <FormControl>
                  <RadioGroup
                    className="flex flex-wrap"
                    value={field.value}
                    onValueChange={field.onChange}
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
                            <span>{fontSizeLabelMap[item]}</span>
                            &nbsp;&nbsp;
                            <Input
                              type="number"
                              className="inline-block w-[100px] h-6"
                              min={MIN_FONT_SIZE}
                              defaultValue={formVals.customFontSize}
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
                            {fontSizeLabelMap[item]}
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
                <FormLabel>主题颜色</FormLabel>
                <FormDescription></FormDescription>
                <FormControl>
                  <RadioGroup
                    className="flex flex-wrap"
                    value={field.value}
                    onValueChange={field.onChange}
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
                          {themeLabelMap[item]}
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
                <FormLabel>内容宽度</FormLabel>
                <FormDescription></FormDescription>
                <FormControl>
                  <RadioGroup
                    className="flex flex-wrap"
                    value={field.value}
                    onValueChange={field.onChange}
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
                            <span>{contentWidthLabelMap[item]}</span>
                            &nbsp;&nbsp;
                            <Input
                              type="number"
                              className="inline-block w-[100px] h-6"
                              min={MIN_CONTENT_WIDTH}
                              defaultValue={formVals.customContentWidth}
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
                            {contentWidthLabelMap[item]}
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
              <Button
                type="submit"
                size="sm"
                disabled={!form.formState.isDirty}
              >
                保存
              </Button>
            </div>
          </div>
        </form>
      </Form>
    )
  }
)

export default UserUIForm
