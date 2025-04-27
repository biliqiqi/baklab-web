import { zodResolver } from '@hookform/resolvers/zod'
import emojiRegex from 'emoji-regex'
import { ChevronDownIcon } from 'lucide-react'
import { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import stc from 'string-to-color'

import { cn, getFirstChar, noop, summryText } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { getArticleList } from '@/api/article'
import {
  checkCategoryExists,
  deleteCategory,
  submitCategory,
  updateCategory,
} from '@/api/category'
import { defaultCategory } from '@/constants/defaults'
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
import { Textarea } from './ui/textarea'

const MAX_CATEGORY_FRONT_ID_LENGTH = 20
const MAX_CATEGORY_NAME_LENGTH = 12

const frontIDSchema = z
  .string()
  .min(1, i18n.t('inputTip', { field: i18n.t('categoryFrontId') }))
  .max(
    MAX_CATEGORY_FRONT_ID_LENGTH,
    i18n.t('charMaximum', {
      field: i18n.t('categoryFrontId'),
      num: MAX_CATEGORY_FRONT_ID_LENGTH,
    })
  )
  .regex(/^[a-zA-Z0-9_]+$/, i18n.t('categoryFrontIdFormatTip'))

const nameSchema = z
  .string()
  .min(1, i18n.t('inputTip', { field: i18n.t('categoryName') }))
  .max(
    MAX_CATEGORY_NAME_LENGTH,
    i18n.t('charMaximum', {
      field: i18n.t('categoryName'),
      num: MAX_CATEGORY_NAME_LENGTH,
    })
  )

const iconBgColorSchema = z
  .string()
  .regex(
    /^$|^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$|^rgb\(\s*((?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9]))\s*((?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9]))\s*((?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9]))\s*\)$/i,
    i18n.t('colorFormatError')
  )

const contentFormIdSchema = z.string()
const descriptionSchema = z.string()

const emojiRe = emojiRegex()

const iconContentSchema = z.string().transform((val, ctx) => {
  if (/^$|^\p{L}$/u.test(val)) return val

  if (/\p{L}+$/u.test(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: i18n.t('limitOneChar'),
    })
    return z.NEVER
  }

  if (new RegExp(`^${emojiRe.source}{,1}$`, emojiRe.flags).test(val)) return val

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: i18n.t('limitOneChar'),
  })

  return z.NEVER
})

/* const CATEGORY_ICON_CONTENT_PATTERN = /^$|^(\p{L}|\p{Emoji})$/u */
const categorySchema = z.object({
  frontID: frontIDSchema,
  name: nameSchema,
  iconBgColor: iconBgColorSchema,
  iconContent: iconContentSchema,
  description: descriptionSchema,
  contentFormId: contentFormIdSchema,
})

const categoryEditSchema = z.object({
  name: nameSchema,
  iconBgColor: iconBgColorSchema,
  iconContent: iconContentSchema,
  description: descriptionSchema,
  contentFormId: contentFormIdSchema,
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
  iconBgColor: stc('x'),
  iconContent: '',
  description: '',
  contentFormId: '0',
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
  const { siteFrontId } = useParams()

  const { t } = useTranslation()

  const form = useForm<CategorySchema>({
    resolver: zodResolver(
      isEdit ? categoryEditSchema : categorySchema,
      {},
      { mode: 'async' }
    ),
    defaultValues: {
      ...(isEdit
        ? {
            name: category.name,
            description: category.describe,
            iconBgColor:
              category.iconBgColor || stc(category.frontId.toLowerCase()),
            iconContent: category.iconContent,
            contentFormId: category.contentFormId,
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
    }: CategorySchema) => {
      /* console.log('category vals: ', vals) */
      try {
        let resp: ResponseData<ResponseID> | undefined

        if (isEdit) {
          resp = await updateCategory(
            category.frontId,
            name,
            description,
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
        ['published'],
        { siteFrontId }
      )
      if (!resp.code) {
        if (resp.data.articleTotal > 0) {
          alertDialog.alert(t('undeletable'), t('categoryContentExists'))
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
              {`/${siteFrontId}/bankuai/` +
                (isEdit
                  ? category.frontId
                  : (formVals.frontID || '').toLowerCase())}
            </div>
            <div className="h-6">{formVals.name}</div>
            <div className="text-sm text-gray-500 h-6 overflow-hidden text-ellipsis">
              {summryText(formVals.description, 20)}
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
                    onChange={(e) => {
                      form.setValue('iconBgColor', stc(iconId), {
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
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
                    <div className="flex">
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
