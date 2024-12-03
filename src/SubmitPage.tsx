import { z } from '@/lib/zod-custom'

import { cn } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getCategoryList } from './api'
import { submitArticle } from './api/article'
import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'
import { Button } from './components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './components/ui/command'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from './components/ui/form'
import { Input } from './components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './components/ui/popover'
import { Textarea } from './components/ui/textarea'
import { ARTICLE_MAX_CONTENT_LEN, ARTICLE_MAX_TITILE_LEN } from './constants'
import useDocumentTitle from './hooks/use-page-title'
import { toSync } from './lib/fire-and-forget'
import { CategoryOption } from './types/types'

const articleScheme = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(ARTICLE_MAX_TITILE_LEN),
  link: z
    .string()
    .optional()
    .transform((val) => {
      return val === undefined || val === '' ? undefined : val.trim()
    })
    .refine(
      (val) =>
        val === undefined || z.string().trim().url().safeParse(val).success,
      '链接格式错误'
    ),
  category: z.string().min(1, '分类不能为空').trim(),
  content: z.string().max(ARTICLE_MAX_CONTENT_LEN),
})

type ArticleScheme = z.infer<typeof articleScheme>

interface CategoryMap {
  [x: string]: string
}

export default function SubmitPage() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cateList, setCateList] = useState<CategoryOption[]>([])

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const cateMap: CategoryMap = useMemo(() => {
    return cateList.reduce((obj: CategoryMap, item) => {
      obj[item.id] = item.name
      return obj
    }, {})
  }, [cateList])

  const fetchCateList = toSync(async () => {
    try {
      setLoading(true)
      const data = await getCategoryList()
      if (!data.code) {
        setCateList([...data.data])
      }
    } catch (err) {
      console.error('fetch category list error: ', err)
    } finally {
      setLoading(false)
    }
  })

  const form = useForm<ArticleScheme>({
    resolver: zodResolver(articleScheme),
    defaultValues: {
      title: '',
      link: '',
      category: searchParams.get('category') || '',
      content: '',
    },
  })

  const categoryVal = () => form.getValues('category')

  const onSubmit = async ({
    title,
    link,
    category,
    content,
  }: ArticleScheme) => {
    /* console.log('values: ', values) */
    try {
      setLoading(true)
      const data = await submitArticle(title, category, link, content)
      if (!data.code) {
        toast.info('提交成功')
        navigate('/')
      }
    } catch (err) {
      console.error('submit article error: ', err)
    } finally {
      setLoading(false)
    }
  }

  useDocumentTitle('提交内容')

  /* console.log('render submit page') */

  useEffect(() => {
    fetchCateList()
  }, [])

  return (
    <>
      <BContainer
        title="提交"
        category={{
          frontId: 'submit',
          name: '提交新内容',
          describe: '',
          isFront: true,
        }}
        goBack
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 max-w-[800px] mx-auto"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="请输入标题"
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
              name="category"
              render={({ fieldState }) => (
                <FormItem>
                  <div>
                    <FormControl>
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant={fieldState.invalid ? 'invalid' : 'outline'}
                            role="combobox"
                            aria-expanded={open}
                            className="w-[200px] justify-between text-gray-700"
                            disabled={loading}
                          >
                            {categoryVal()
                              ? '发布到【' +
                                cateList.find(
                                  (cate) => cate.id === categoryVal()
                                )?.name +
                                '】'
                              : '发布到...'}
                            <ChevronsUpDown className="opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0">
                          <Command
                            filter={(val, search) =>
                              cateMap[val].includes(search) ? 1 : 0
                            }
                          >
                            <CommandInput placeholder="搜索分类..." />
                            <CommandList>
                              <CommandEmpty>未找到分类</CommandEmpty>
                              <CommandGroup>
                                {cateList.map((cate) => (
                                  <CommandItem
                                    key={cate.id}
                                    value={cate.id}
                                    onSelect={(currentValue) => {
                                      form.setValue(
                                        'category',
                                        currentValue === categoryVal()
                                          ? ''
                                          : currentValue
                                      )
                                      setOpen(false)
                                    }}
                                  >
                                    {cate.name}
                                    <Check
                                      className={cn(
                                        'ml-auto',
                                        categoryVal() === cate.id
                                          ? 'opacity-100'
                                          : 'opacity-0'
                                      )}
                                    />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                  </div>

                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="link"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="请输入来源链接"
                      autoComplete="off"
                      type="url"
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
              name="content"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      state={fieldState.invalid ? 'invalid' : 'default'}
                      placeholder="请输入内容"
                      className="h-[320px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between">
              <div></div>
              <div>
                <Button
                  variant="outline"
                  disabled={loading}
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                  }}
                >
                  {loading ? <BLoader /> : '预览'}
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  size="sm"
                  className="ml-2"
                >
                  {loading ? <BLoader /> : '提交'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </BContainer>
    </>
  )
}
