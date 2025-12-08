import { zodResolver } from '@hookform/resolvers/zod'
import emojiRegex from 'emoji-regex'
import { ChevronDownIcon } from 'lucide-react'
import { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { cn, getFirstChar, noop, summaryText } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { getArticleList } from '@/api/article'
import {
  checkCategoryExists,
  deleteCategory,
  submitCategory,
  updateCategory,
} from '@/api/category'
import { defaultCategory } from '@/constants/defaults'
import { I18n } from '@/constants/types'
import { useSiteParams } from '@/hooks/use-site-params'
import i18n from '@/i18n'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useSiteStore,
} from '@/state/global'
import { Category, ResponseData, ResponseID } from '@/types/types'

import ContentFormSelector from './ContentFormSelector'
import BIconColorChar from './base/BIconColorChar'
import { Button } from './ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible'
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
import { Textarea } from './ui/textarea'

const MAX_CATEGORY_FRONT_ID_LENGTH = 20
const MAX_CATEGORY_NAME_LENGTH = 12

const frontIDSchema = (i: I18n) =>
  z
    .string()
    .min(1, i.t('inputTip', { field: i.t('categoryFrontId') }))
    .max(
      MAX_CATEGORY_FRONT_ID_LENGTH,
      i.t('charMaximum', {
        field: i.t('categoryFrontId'),
        num: MAX_CATEGORY_FRONT_ID_LENGTH,
      })
    )
    .regex(/^[a-zA-Z0-9_]+$/, i.t('categoryFrontIdFormatTip'))

const nameSchema = (i: I18n) =>
  z
    .string()
    .min(1, i.t('inputTip', { field: i.t('categoryName') }))
    .max(
      MAX_CATEGORY_NAME_LENGTH,
      i.t('charMaximum', {
        field: i.t('categoryName'),
        num: MAX_CATEGORY_NAME_LENGTH,
      })
    )

const iconBgColorSchema = (i: I18n) =>
  z
    .string()
    .regex(
      /^$|^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$|^rgb\(\s*((?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9]))\s*((?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9]))\s*((?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9]))\s*\)$/i,
      i.t('colorFormatError')
    )

const contentFormIdSchema = z.string()
const descriptionSchema = z.string()

const emojiRe = emojiRegex()

const iconContentSchema = (i: I18n) =>
  z.string().transform((val, ctx) => {
    if (/^$|^\p{L}$/u.test(val)) return val

    if (/\p{L}+$/u.test(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: i.t('limitOneChar'),
      })
      return z.NEVER
    }

    if (new RegExp(`^${emojiRe.source}{,1}$`, emojiRe.flags).test(val))
      return val

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: i.t('limitOneChar'),
    })

    return z.NEVER
  })

/* const CATEGORY_ICON_CONTENT_PATTERN = /^$|^(\p{L}|\p{Emoji})$/u */
const categorySchema = z.object({
  frontID: frontIDSchema(i18n),
  name: nameSchema(i18n),
  iconBgColor: iconBgColorSchema(i18n),
  iconContent: iconContentSchema(i18n),
  description: descriptionSchema,
  contentFormId: contentFormIdSchema,
  visible: z.boolean(),
})

const categoryEditSchema = z.object({
  name: nameSchema(i18n),
  iconBgColor: iconBgColorSchema(i18n),
  iconContent: iconContentSchema(i18n),
  description: descriptionSchema,
  contentFormId: contentFormIdSchema,
  visible: z.boolean(),
})

type CategorySchema = z.infer<typeof categorySchema>

/* type CategoryEditSchema = z.infer<typeof categoryEditSchema> */

interface CategoryFormProps {
  isEdit?: boolean
  category?: Category
  onSuccess?: () => void
  onChange?: (isDirty: boolean) => void
}

const defaultCategoryData: CategorySchema = {
  frontID: '',
  name: '',
  iconBgColor: '#1e73ca',
  iconContent: '',
  description: '',
  contentFormId: '0',
  visible: true,
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  isEdit = false,
  category = defaultCategory,
  onSuccess = noop,
  onChange = noop,
}) => {
  const [showMoreSettings, setShowMoreSettings] = useState(isEdit)

  const alertDialog = useAlertDialogStore()
  const authStore = useAuthedUserStore()
  const siteStore = useSiteStore()
  const { siteFrontId } = useSiteParams()

  const { t, i18n } = useTranslation()

  const form = useForm<CategorySchema>({
    resolver: zodResolver(
      isEdit
        ? categoryEditSchema.extend({
            name: nameSchema(i18n),
            iconBgColor: iconBgColorSchema(i18n),
            iconContent: iconContentSchema(i18n),
          })
        : categorySchema.extend({
            frontID: frontIDSchema(i18n),
            name: nameSchema(i18n),
            iconBgColor: iconBgColorSchema(i18n),
            iconContent: iconContentSchema(i18n),
          }),
      {},
      { mode: 'async' }
    ),
    defaultValues: {
      ...(isEdit
        ? {
            name: category.name,
            description: category.describe,
            iconBgColor: category.iconBgColor || '#1e73ca',
            iconContent: category.iconContent,
            contentFormId: category.contentFormId,
            visible: category.visible,
          }
        : defaultCategoryData),
    },
    mode: 'onChange',
  })

  const formVals = form.watch()

  const iconId = useMemo(
    () =>
      isEdit ? category.frontId : (formVals.frontID || '').toLowerCase() || 'x',
    [isEdit, formVals, category.frontId]
  )

  const onSubmit = useCallback(
    async ({
      frontID,
      name,
      description,
      iconBgColor,
      iconContent,
      contentFormId,
      visible,
    }: CategorySchema) => {
      /* console.log('category vals: ', vals) */
      try {
        let resp: ResponseData<ResponseID> | undefined

        if (isEdit) {
          resp = await updateCategory(
            category.frontId,
            name,
            description,
            visible,
            iconBgColor,
            iconContent,
            {
              siteFrontId: category.siteFrontId,
            }
          )
        } else {
          if (!siteStore.site) return

          const exists = await checkCategoryExists(frontID, { siteFrontId })
          /* console.log('frontID exists: ', exists) */
          if (exists) {
            form.setError(
              'frontID',
              { message: t('categoryFrontIdExists') },
              { shouldFocus: true }
            )
            return
          } else {
            form.clearErrors('frontID')
          }

          resp = await submitCategory(
            frontID,
            name,
            description,
            visible,
            iconBgColor,
            iconContent,
            contentFormId,
            {
              siteFrontId,
            }
          )
        }
        if (!resp?.code) {
          onSuccess()
        }
      } catch (err) {
        console.error('validate front id error: ', err)
      }
    },
    [form, isEdit, onSuccess, category, siteStore, siteFrontId, t]
  )

  const onDeleteClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      if (!isEdit || !category.frontId) return

      const resp = await getArticleList(
        1,
        1,
        'latest',
        category.frontId,
        '',
        'article',
        '',
        '',
        ['published'],
        { siteFrontId }
      )
      if (!resp.code) {
        if (resp.data.articleTotal > 0) {
          const inputName = await alertDialog.prompt(
            t('confirm'),
            t('categoryContentExistsDeleteConfirm', {
              categoryName: category.name,
            }),
            '',
            (value) => value === category.name,
            t('categoryNameNotMatch'),
            'danger'
          )

          if (!inputName) return

          const respD = await deleteCategory(
            category.frontId,
            category.name,
            authStore.username,
            {
              siteFrontId: category.siteFrontId,
            }
          )
          if (!respD.code) {
            onSuccess()
          }
          return
        }
      }

      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t('deleteConfirm1'),
        'danger'
      )

      if (!confirmed) return

      const respD = await deleteCategory(
        category.frontId,
        category.name,
        authStore.username,
        {
          siteFrontId: category.siteFrontId,
        }
      )
      if (!respD.code) {
        onSuccess()
      }
    },
    [
      isEdit,
      category,
      siteFrontId,
      alertDialog,
      authStore.username,
      onSuccess,
      t,
    ]
  )

  useEffect(() => {
    onChange(form.formState.isDirty)
  }, [form, formVals, onChange])

  /* useEffect(() => {
   *   onFrontIDChange.call(frontIDVal)
   * }, [frontIDVal]) */

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="relative max-w-full"
      >
        <div className="flex items-start mb-4">
          <BIconColorChar
            iconId={iconId}
            color={formVals.iconBgColor}
            char={formVals.iconContent || ''}
            size={66}
            className="w-[66px] flex-shink-0"
          />
          <div className="pl-4 flex-grow max-w-[calc(100%-82px)] overflow-hidden">
            <div className="text-sm text-gray-500 h-5">
              {`/z/${siteFrontId}/b/` +
                (isEdit
                  ? category.frontId
                  : (formVals.frontID || '').toLowerCase())}
            </div>
            <div className="h-6">{formVals.name}</div>
            <div className="text-sm text-gray-500 h-6 overflow-hidden text-ellipsis">
              {summaryText(formVals.description, 20)}
            </div>
          </div>
        </div>
        <FormField
          control={form.control}
          name="name"
          key="name"
          render={({ field, fieldState }) => (
            <FormItem className="mb-8">
              <FormLabel>{t('name')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('inputTip', { field: t('categoryName') })}
                  autoComplete="off"
                  state={fieldState.invalid ? 'invalid' : 'default'}
                  {...field}
                  onChange={(e) => {
                    form.setValue('iconContent', getFirstChar(e.target.value), {
                      shouldDirty: true,
                    })
                    field.onChange(e)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!isEdit && (
          <FormField
            control={form.control}
            name="frontID"
            key="frontID"
            render={({ field, fieldState }) => (
              <FormItem className="mb-8">
                <FormLabel>{t('frontId')}</FormLabel>
                <FormDescription>
                  {t('categoryFrontIdDescribe')}
                </FormDescription>
                <FormControl>
                  <Input
                    placeholder={t('inputTip', { field: t('categoryFrontId') })}
                    autoComplete="off"
                    state={fieldState.invalid ? 'invalid' : 'default'}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="contentFormId"
          key="contentFormId"
          render={({ field }) => (
            <FormItem className="mb-8">
              <FormLabel>{t('contentForm')}</FormLabel>
              <FormControl>
                <FormItem className="mb-8">
                  <FormControl>
                    <ContentFormSelector
                      disabled={isEdit}
                      value={field.value}
                      onChange={field.onChange}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="visible"
          key="visible"
          render={({ field }) => (
            <FormItem className="mb-8">
              <FormLabel>{t('visibility')}</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(val) => {
                    if (val == '1') {
                      field.onChange(true)
                    } else {
                      field.onChange(false)
                    }
                  }}
                  defaultValue="1"
                  className="flex flex-wrap"
                  value={field.value ? '1' : '0'}
                >
                  <FormItem
                    className="flex items-center space-y-0 mr-4 mb-4"
                    key="1"
                  >
                    <FormControl>
                      <RadioGroupItem value="1" className="mr-1" />
                    </FormControl>
                    <FormLabel className="font-normal mr-1">
                      {t('public')}
                    </FormLabel>
                  </FormItem>
                  <FormItem
                    className="flex items-center space-y-0 mr-4 mb-4"
                    key="0"
                  >
                    <FormControl>
                      <RadioGroupItem value="0" className="mr-1" />
                    </FormControl>
                    <FormLabel className="font-normal mr-1">
                      {t('private')}
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Collapsible open={showMoreSettings} onOpenChange={setShowMoreSettings}>
          <CollapsibleTrigger asChild>
            <Button
              size={'sm'}
              variant={'link'}
              className="text-gray-500 px-0 mb-4 hover:no-underline"
            >
              <ChevronDownIcon
                size={14}
                className={cn(
                  'transition-transform duration-200 ease-in-out rotate-0 inline-block align-bottom mr-1',
                  !showMoreSettings && '-rotate-90'
                )}
              />
              {t('moreSettings')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="CollapsibleContent">
            <FormField
              control={form.control}
              name="iconContent"
              key="iconContent"
              render={({ field, fieldState }) => (
                <FormItem className="mb-8">
                  <FormLabel>{t('iconContent')}</FormLabel>
                  <FormDescription>{t('limitOneChar')}</FormDescription>
                  <FormControl>
                    <Input
                      placeholder={t('inputTip', { field: t('iconContent') })}
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
              name="iconBgColor"
              key="iconBgColor"
              render={({ field, fieldState }) => (
                <FormItem className="mb-8">
                  <FormLabel>{t('iconBgColor')}</FormLabel>
                  <FormDescription>{t('iconBgColorDescribe')}</FormDescription>
                  <FormControl>
                    <div className="flex items-center">
                      <Input
                        key={'iconBgColor'}
                        placeholder={t('inputTip', { field: t('iconBgColor') })}
                        autoComplete="off"
                        state={fieldState.invalid ? 'invalid' : 'default'}
                        {...field}
                        className="w-36 mr-2"
                      />
                      <Input
                        key={'iconBgColorPicker'}
                        type="color"
                        className="w-16"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              key="description"
              render={({ field, fieldState }) => (
                <FormItem className="mb-8">
                  <FormLabel>{t('description')}</FormLabel>
                  <FormControl>
                    <FormItem className="mb-8">
                      <FormControl>
                        <Textarea
                          placeholder={t('inputTip', {
                            field: t('categoryDescription'),
                          })}
                          autoComplete="off"
                          state={fieldState.invalid ? 'invalid' : 'default'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>
        <div className="flex justify-between">
          <span>
            {isEdit && authStore.permit('category', 'delete') && (
              <Button
                variant="outline"
                className="border-destructive outline-destructive"
                size="sm"
                onClick={onDeleteClick}
              >
                {t('delete')}
              </Button>
            )}
          </span>
          <Button type="submit" size="sm" disabled={!form.formState.isDirty}>
            {t('submit')}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default CategoryForm
