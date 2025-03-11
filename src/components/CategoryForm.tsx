import { zodResolver } from '@hookform/resolvers/zod'
import emojiRegex from 'emoji-regex'
import { MouseEvent, useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import stc from 'string-to-color'

import { getFirstChar, noop, summryText } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { getArticleList } from '@/api/article'
import {
  checkCategoryExists,
  deleteCategory,
  submitCategory,
  updateCategory,
} from '@/api/category'
import { defaultCategory } from '@/constants/defaults'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useSiteStore,
} from '@/state/global'
import { Category, ResponseData, ResponseID } from '@/types/types'

import BIconColorChar from './base/BIconColorChar'
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
import { Textarea } from './ui/textarea'

const MAX_CATEGORY_FRONT_ID_LENGTH = 20
const MAX_CATEGORY_NAME_LENGTH = 12

const frontIDSchema = z
  .string()
  .min(1, '请输入分类标识')
  .max(
    MAX_CATEGORY_FRONT_ID_LENGTH,
    `分类标识不得超过${MAX_CATEGORY_FRONT_ID_LENGTH}个字符`
  )
  .regex(/^[a-zA-Z0-9_]+$/, '分类标识由数字、字母和下划线组成，不区分大小写')

const nameSchema = z
  .string()
  .min(1, '请输入分类名称')
  .max(
    MAX_CATEGORY_NAME_LENGTH,
    `分类名称不得超过${MAX_CATEGORY_NAME_LENGTH}个字符`
  )

const iconBgColorSchema = z
  .string()
  .regex(
    /^$|^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$|^rgb\(\s*((?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9]))\s*,\s*((?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9]))\s*,\s*((?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9]))\s*\)$/i,
    '颜色格式错误'
  )

const descriptionSchema = z.string()

const emojiRe = emojiRegex()

/* const iconContentSchema = z.string() */

const iconContentSchema = z.string().transform((val, ctx) => {
  if (/^$|^\p{L}$/u.test(val)) return val

  /* val = val.replace(/\p{L}*$/u, '') */
  if (/\p{L}+$/u.test(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '限制为一个字符',
    })
    return z.NEVER
  }

  if (new RegExp(`^${emojiRe.source}{,1}$`, emojiRe.flags).test(val)) return val

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: '限制为一个字符',
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
})

const categoryEditSchema = z.object({
  name: nameSchema,
  iconBgColor: iconBgColorSchema,
  iconContent: iconContentSchema,
  description: descriptionSchema,
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
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  isEdit = false,
  category = defaultCategory,
  onSuccess = noop,
  onChange = noop,
}) => {
  const alertDialog = useAlertDialogStore()
  const authStore = useAuthedUserStore()
  const siteStore = useSiteStore()
  const { siteFrontId } = useParams()

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
              { message: '分类标识已存在' },
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
    [form, isEdit, onSuccess, category, siteStore, siteFrontId]
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
          alertDialog.alert('无法删除', '该分类下存在内容，无法删除')
          return
        }
      }

      const confirmed = await alertDialog.confirm(
        '确认',
        '确认删除？',
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
    [isEdit, category, siteFrontId, alertDialog, authStore.username, onSuccess]
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
              {`/${siteFrontId}/categories/` +
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
        {!isEdit && (
          <FormField
            control={form.control}
            name="frontID"
            key="frontID"
            render={({ field, fieldState }) => (
              <FormItem className="mb-8">
                <FormLabel>标识</FormLabel>
                <FormDescription>
                  分类的唯一标识，有字母、数字和下划线组成
                </FormDescription>
                <FormControl>
                  <Input
                    placeholder="请输入分类标识"
                    autoComplete="off"
                    state={fieldState.invalid ? 'invalid' : 'default'}
                    {...field}
                    onChange={(e) => {
                      form.setValue('iconBgColor', stc(iconId))
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
          name="name"
          key="name"
          render={({ field, fieldState }) => (
            <FormItem className="mb-8">
              <FormLabel>名称</FormLabel>
              <FormControl>
                <Input
                  placeholder="请输入分类名称"
                  autoComplete="off"
                  state={fieldState.invalid ? 'invalid' : 'default'}
                  {...field}
                  onChange={(e) => {
                    form.setValue('iconContent', getFirstChar(e.target.value))
                    field.onChange(e)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="iconContent"
          key="iconContent"
          render={({ field, fieldState }) => (
            <FormItem className="mb-8">
              <FormLabel>
                图标内容 <span className="text-gray-500">(选填)</span>
              </FormLabel>
              <FormDescription>限制为一个字符</FormDescription>
              <FormControl>
                <Input
                  placeholder="请输入图标内容"
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
              <FormLabel>
                图标背景色 <span className="text-gray-500">(选填)</span>
              </FormLabel>
              <FormDescription>
                支持十六进制和RGB格式，例如 #fafafa 或 rgb(255, 20, 30)，
                默认颜色基于分类标识字符串生成
              </FormDescription>
              <FormControl>
                <div className="flex">
                  <Input
                    key={'iconBgColor'}
                    placeholder="请输入图标背景颜色"
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
              <FormControl>
                <FormItem className="mb-8">
                  <FormControl>
                    <Textarea
                      placeholder="请输入分类描述"
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
        <div className="flex justify-between">
          <span>
            {isEdit && authStore.permit('category', 'delete') && (
              <Button
                variant="outline"
                className="border-destructive outline-destructive"
                size="sm"
                onClick={onDeleteClick}
              >
                删除
              </Button>
            )}
          </span>
          <Button type="submit" size="sm" disabled={!form.formState.isDirty}>
            提交
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default CategoryForm
