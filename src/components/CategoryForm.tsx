import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { debounce } from 'remeda'
import { toast } from 'sonner'

import { noop } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { checkCategoryExists, submitCategory } from '@/api/category'

import BIconColorChar from './base/BIconColorChar'
import { Button } from './ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'

const MAX_CATEGORY_FRONT_ID_LENGTH = 20
const MAX_CATEGORY_NAME_LENGTH = 12

const frontIDScheme = z
  .string()
  .min(1, '请输入分类标识')
  .max(
    MAX_CATEGORY_FRONT_ID_LENGTH,
    `分类标识不得超过${MAX_CATEGORY_FRONT_ID_LENGTH}个字符`
  )
  .regex(/^[a-zA-Z0-9_]+$/, '分类标识由数字、字母和下划线组成，不区分大小写')

const categoryScheme = z.object({
  frontID: frontIDScheme,
  name: z
    .string()
    .min(1, '请输入分类名称')
    .max(
      MAX_CATEGORY_NAME_LENGTH,
      `分类名称不得超过${MAX_CATEGORY_NAME_LENGTH}个字符`
    ),
  description: z.string(),
})

type CategoryScheme = z.infer<typeof categoryScheme>

interface CategoryFormProps {
  onSuccess?: () => void
  onChange?: (isDirty: boolean) => void
}

const defaultCategoryData: CategoryScheme = {
  frontID: '',
  name: '',
  description: '',
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  onSuccess = noop,
  onChange = noop,
}) => {
  /* const [frontIDExists, setFrontIDExists] = useState(false) */
  const onSubmit = async ({ frontID, name, description }: CategoryScheme) => {
    /* console.log('category vals: ', vals) */
    try {
      const exists = await checkCategoryExists(frontID)
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

      const resp = await submitCategory(frontID, name, description)
      if (!resp.code) {
        onSuccess()
      }
    } catch (err) {
      console.error('validate front id error: ', err)
    }
  }

  const form = useForm<CategoryScheme>({
    resolver: zodResolver(categoryScheme, {}, { mode: 'async' }),
    defaultValues: {
      ...defaultCategoryData,
    },
    mode: 'onChange',
  })

  const formVals = form.watch()

  useEffect(() => {
    onChange(form.formState.isDirty)
  }, [form, formVals])

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
            iconId={formVals.frontID.toLowerCase() || 'x'}
            char={formVals.name}
            size={66}
            className="w-[66px] flex-shink-0"
          />
          <div className="pl-4 flex-grow max-w-[calc(100%-82px)] overflow-hidden">
            <div className="text-sm text-gray-500 h-5">
              {'/categories/' + formVals.frontID.toLowerCase()}
            </div>
            <div className="h-6">{formVals.name}</div>
            <div className="text-sm text-gray-500 h-6 overflow-hidden text-ellipsis">
              {formVals.description}
            </div>
          </div>
        </div>
        <FormField
          control={form.control}
          name="frontID"
          key="frontID"
          render={({ field, fieldState }) => (
            <FormItem className="mb-8">
              <FormControl>
                <Input
                  placeholder="请输入分类标识"
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
          name="name"
          key="name"
          render={({ field, fieldState }) => (
            <FormItem className="mb-8">
              <FormControl>
                <Input
                  placeholder="请输入分类名称"
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
          <span></span>
          <Button type="submit" size="sm">
            提交
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default CategoryForm
