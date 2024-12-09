import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { timeAgo } from '@/lib/dayjs-custom'
import { toSync } from '@/lib/fire-and-forget'
import { cn } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { getCategoryList } from '@/api'
import { submitArticle, updateArticle } from '@/api/article'
import {
  ARTICLE_MAX_CONTENT_LEN,
  ARTICLE_MAX_TITILE_LEN,
} from '@/constants/constants'
import useDocumentTitle from '@/hooks/use-page-title'
import { useNotFoundStore } from '@/state/global'
import { Article, CategoryOption } from '@/types/types'

import BAvatar from './base/BAvatar'
import BLoader from './base/BLoader'
import { Button } from './ui/button'
import { Card } from './ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command'
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form'
import { Input } from './ui/input'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Textarea } from './ui/textarea'

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

export interface ArticleFormProps {
  article?: Article
}

const ArticleForm = ({ article }: ArticleFormProps) => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cateList, setCateList] = useState<CategoryOption[]>([])

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const notFound = useNotFoundStore()

  const cateMap: CategoryMap = useMemo(() => {
    return cateList.reduce((obj: CategoryMap, item) => {
      obj[item.id] = item.name
      return obj
    }, {})
  }, [cateList])

  const isEdit = useMemo(() => Boolean(article && article.id), [article])

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

  const defaultArticleData: ArticleScheme = article
    ? {
        title: article.title,
        link: article.link,
        category: article.categoryFrontId,
        content: article.content,
      }
    : {
        title: '',
        link: '',
        category: searchParams.get('category') || '',
        content: '',
      }

  const form = useForm<ArticleScheme>({
    resolver: zodResolver(articleScheme),
    defaultValues: defaultArticleData,
  })

  const categoryVal = () => form.getValues('category')

  const onSubmit = useCallback(
    async ({ title, link, category, content }: ArticleScheme) => {
      /* console.log('values: ', values) */
      try {
        if (!article) {
          notFound.updateNotFound(true)
          return
        }

        setLoading(true)
        const data = await updateArticle(
          article.id,
          title,
          category,
          link,
          content
        )
        if (!data.code) {
          toast.info('提交成功')
          navigate(-1)
        }
      } catch (err) {
        console.error('submit article error: ', err)
      } finally {
        setLoading(false)
      }
    },
    [article]
  )

  useDocumentTitle('编辑帖子')

  /* console.log('render submit page') */

  useEffect(() => {
    fetchCateList()
  }, [])

  return (
    <Card className="p-3">
      {article && (
        <div className="py-2 mb-4 text-gray-500 text-sm">
          <BAvatar size={24} username={article.authorName} />{' '}
          <Link to={`/users/${article.authorName}`}>{article.authorName}</Link>{' '}
          发布于 {timeAgo(article.createdAt)}
        </div>
      )}
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
                          disabled={loading || isEdit}
                        >
                          {categoryVal()
                            ? '发布到【' +
                              cateList.find((cate) => cate.id === categoryVal())
                                ?.name +
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
    </Card>
  )
}

export default ArticleForm
