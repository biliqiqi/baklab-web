import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronsUpDown } from 'lucide-react'
import { escapeHtml } from 'markdown-it/lib/common/utils.mjs'
import {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { timeAgo } from '@/lib/dayjs-custom'
import { cn } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { submitArticle, updateArticle, updateReply } from '@/api/article'
import {
  ARTICLE_MAX_CONTENT_LEN,
  ARTICLE_MAX_TITILE_LEN,
} from '@/constants/constants'
import { defaultArticle } from '@/constants/defaults'
import useDocumentTitle from '@/hooks/use-page-title'
import {
  useAuthedUserStore,
  useCategoryStore,
  useNotFoundStore,
  useSiteStore,
} from '@/state/global'
import {
  Article,
  ArticleSubmitResponse,
  Category,
  ResponseData,
} from '@/types/types'

import ArticleCard from './ArticleCard'
import ContentFormSelector from './ContentFormSelector'
import TipTap from './TipTap'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form'
import { Input } from './ui/input'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Textarea } from './ui/textarea'

const contentRule = z.string().max(ARTICLE_MAX_CONTENT_LEN)

const contentScheme = z.object({
  content: contentRule,
})

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
  category: z.string().min(1, '板块不能为空').trim(),
  contentFormId: z.string().optional(),
  content: contentRule,
})

type ArticleScheme = z.infer<typeof articleScheme>
/* type ContentScheme = z.infer<typeof contentScheme> */

interface CategoryNameMap {
  [x: string]: string
}

interface CategoryMap {
  [x: string]: Category
}

export interface ArticleFormProps {
  article?: Article
}

const MIN_CONTENT_BOX_HEIGHT = 40
const INIT_CONTENT_BOX_HEIGHT = 320

type InputType = 'textarea' | 'tiptap'
interface DraggingInfo {
  inputType: InputType
  dragging: boolean
}

const ArticleForm = ({ article }: ArticleFormProps) => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [markdownMode, setMarkdownMode] = useState(false)
  const [isPreview, setPreview] = useState(false)
  /* const [isDragging, setDragging] = useState(false) */

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  )

  const [contentBoxHeight, setContentBoxHeight] = useState(
    INIT_CONTENT_BOX_HEIGHT
  )

  const { siteFrontId } = useParams()
  /* const [cateList, setCateList] = useState<CategoryOption[]>([]) */
  const { categories: cateList } = useCategoryStore()
  const site = useSiteStore((state) => state.site)

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const notFound = useNotFoundStore()

  const categoryNameMap: CategoryNameMap = useMemo(() => {
    return cateList.reduce((obj: CategoryNameMap, item) => {
      obj[item.id] = item.name
      return obj
    }, {})
  }, [cateList])

  const categoryMap: CategoryMap = useMemo(() => {
    return cateList.reduce((obj: CategoryMap, item) => {
      obj[item.id] = item
      return obj
    }, {})
  }, [cateList])

  const isEdit = useMemo(() => Boolean(article && article.id), [article])
  const isReply = useMemo(
    () => Boolean(article && article.replyToId != '0'),
    [article]
  )
  const paramCateId = searchParams.get('category_id') || ''

  const draggingRef = useRef<DraggingInfo>({
    inputType: 'tiptap',
    dragging: isEdit,
  })

  const checkPermit = useAuthedUserStore((state) => state.permit)

  const defaultArticleData: ArticleScheme =
    isEdit && article
      ? isReply
        ? {
            title: '',
            link: '',
            category: '',
            content: article.content,
          }
        : {
            title: article.title,
            link: article.link,
            category: article.categoryId,
            content: article.content,
          }
      : {
          title: '',
          link: '',
          category: searchParams.get('category_id') || '',
          content: '',
          contentFormId: categoryMap[paramCateId]?.contentFormId || '0',
        }

  /* console.log('default form data: ', defaultArticleData) */

  const form = useForm<ArticleScheme>({
    resolver: isReply ? zodResolver(contentScheme) : zodResolver(articleScheme),
    defaultValues: defaultArticleData,
  })

  const formVals = form.watch()

  const categoryVal = () => form.getValues('category')

  const onSubmit = useCallback(
    async ({
      title,
      link,
      category,
      content,
      contentFormId,
    }: ArticleScheme) => {
      /* console.log('values: ', content)
       * console.log('isEdit:', isEdit)
       * console.log('isReply:', isReply) */

      if (!siteFrontId) return

      try {
        setLoading(true)

        let data: ResponseData<ArticleSubmitResponse>
        if (isEdit) {
          if (!article) {
            notFound.updateNotFound(true)
            return
          }

          if (isReply) {
            data = await updateReply(
              article.id,
              content,
              article.replyToId,
              article.displayTitle,
              false,
              {
                siteFrontId: article.siteFrontId,
              }
            )
          } else {
            data = await updateArticle(
              article.id,
              title,
              category,
              link,
              content,
              false,
              { siteFrontId: article.siteFrontId }
            )
          }
        } else {
          data = await submitArticle(
            title,
            category,
            link,
            content,
            false,
            contentFormId,
            {
              siteFrontId,
            }
          )
        }

        if (!data.code) {
          if (site?.reviewBeforePublish && !checkPermit('article', 'review')) {
            toast.info('提交成功！根据站点设置，内容将会在审核之后展示。')
          }
          navigate(`/${siteFrontId}/articles/${data.data.id}`, {
            replace: true,
          })
        }
      } catch (err) {
        console.error('submit article error: ', err)
      } finally {
        setLoading(false)
      }
    },
    [
      article,
      isEdit,
      isReply,
      navigate,
      notFound,
      siteFrontId,
      site,
      checkPermit,
    ]
  )

  const onMarkdownModeClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      setMarkdownMode(!markdownMode)
    },
    [markdownMode]
  )

  const onPreviewClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      setPreview(!isPreview)
    },
    [isPreview]
  )

  const onContentBoxResize = useCallback((_width: number, height: number) => {
    /* console.log('content height: ', height)
     * console.log('draggingRef: ', draggingRef.current) */

    if (!draggingRef.current.dragging) return

    if (height < MIN_CONTENT_BOX_HEIGHT) {
      setContentBoxHeight(MIN_CONTENT_BOX_HEIGHT)
    } else {
      setContentBoxHeight(height)
    }
  }, [])

  const onMouseDown =
    (it: InputType) =>
    (e: MouseEvent<HTMLDivElement | HTMLTextAreaElement>) => {
      const target = e.target as Element
      const rect = target.getBoundingClientRect()
      const clickableRadius = 20

      if (
        e.pageX < rect.right - clickableRadius ||
        e.pageX > rect.right + clickableRadius ||
        e.pageY < rect.bottom - clickableRadius ||
        e.pageY > rect.bottom + clickableRadius
      )
        return

      draggingRef.current.inputType = it
      draggingRef.current.dragging = true
    }

  const onMouseUp = () => {
    draggingRef.current.dragging = false
  }

  useDocumentTitle(isEdit ? '编辑帖子' : '创建帖子')

  useEffect(() => {
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  useEffect(() => {
    form.setValue(
      'contentFormId',
      categoryMap[formVals.category]?.contentFormId || '0'
    )
  }, [categoryMap, formVals.category, form])

  return (
    <Card className="p-3">
      {article && !isPreview && (
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
          {isReply && article ? (
            <h1 className="bg-gray-100 rounded-sm py-1 px-2 text-gray-500 text-sm cursor-pointer">
              <Link
                to={`/${article.replyRootArticleSiteFrontId}/articles/${article.replyRootArticleId}`}
              >
                {article.displayTitle}
              </Link>
            </h1>
          ) : (
            <>
              <FormField
                control={form.control}
                name="title"
                key="title"
                render={({ field, fieldState }) => (
                  <FormItem style={{ display: isPreview ? 'none' : '' }}>
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
              <div className="flex justify-between items-center">
                <FormField
                  control={form.control}
                  name="category"
                  key="category"
                  render={({ fieldState }) => (
                    <FormItem style={{ display: isPreview ? 'none' : '' }}>
                      <div>
                        <FormLabel className="text-gray-500 mr-2">
                          发布到
                        </FormLabel>
                        <FormControl>
                          <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant={
                                  fieldState.invalid ? 'invalid' : 'outline'
                                }
                                role="combobox"
                                aria-expanded={open}
                                className="w-[200px] justify-between text-gray-700"
                                disabled={
                                  loading ||
                                  (isEdit &&
                                    !checkPermit('article', 'edit_others'))
                                }
                              >
                                {categoryVal()
                                  ? cateList.find(
                                      (cate) => cate.id === categoryVal()
                                    )?.name
                                  : '请选择'}
                                <ChevronsUpDown className="opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                              <Command
                                filter={(val, search) =>
                                  categoryNameMap[val].includes(search) ? 1 : 0
                                }
                              >
                                <CommandInput placeholder="搜索板块..." />
                                <CommandList>
                                  <CommandEmpty>未找到板块</CommandEmpty>
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
                                              : currentValue,
                                            { shouldDirty: true }
                                          )
                                          setOpen(false)
                                          setSelectedCategory(() => cate)
                                        }}
                                      >
                                        <div>
                                          <div className="flex items-center justify-between">
                                            {cate.name}
                                            <Check
                                              className={cn(
                                                'ml-auto',
                                                categoryVal() === cate.id
                                                  ? 'opacity-100'
                                                  : 'opacity-0'
                                              )}
                                            />
                                          </div>
                                          <div className="text-gray-500 text-xs">
                                            {cate.describe}
                                          </div>
                                        </div>
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
                  name="contentFormId"
                  key="contentFormId"
                  render={({ field }) => (
                    <FormItem style={{ display: isPreview ? 'none' : '' }}>
                      <FormLabel className="text-gray-500 mr-2">
                        内容形式
                      </FormLabel>
                      <FormControl>
                        <ContentFormSelector
                          value={field.value || '0'}
                          onChange={field.onChange}
                          disabled={Boolean(
                            formVals.contentFormId &&
                              formVals.contentFormId != '0'
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="link"
                key="link"
                render={({ field, fieldState }) => (
                  <FormItem style={{ display: isPreview ? 'none' : '' }}>
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
            </>
          )}
          <FormField
            control={form.control}
            name="content"
            key="content"
            render={({ field, fieldState }) => (
              <FormItem style={{ display: isPreview ? 'none' : '' }}>
                <FormControl>
                  <>
                    <Textarea
                      {...field}
                      state={fieldState.invalid ? 'invalid' : 'default'}
                      placeholder="请输入内容"
                      style={{
                        display: !markdownMode ? 'none' : '',
                        height:
                          draggingRef.current.inputType == 'tiptap'
                            ? `${contentBoxHeight}px`
                            : '',
                      }}
                      onResize={onContentBoxResize}
                      onMouseDown={onMouseDown('textarea')}
                    />

                    <TipTap
                      placeholder="请输入内容"
                      {...field}
                      state={fieldState.invalid ? 'invalid' : 'default'}
                      style={{
                        display: markdownMode ? 'none' : '',
                        marginTop: 0,
                        height:
                          draggingRef.current.inputType == 'textarea'
                            ? `${contentBoxHeight}px`
                            : isEdit
                              ? ''
                              : `${INIT_CONTENT_BOX_HEIGHT}px`,
                      }}
                      onChange={field.onChange}
                      value={escapeHtml(field.value)}
                      hideBubble={markdownMode}
                      className={cn('resize-y overflow-auto min-h-[40px]')}
                      onResize={onContentBoxResize}
                      onMouseDown={onMouseDown('tiptap')}
                    />
                  </>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isPreview && (
            <ArticleCard
              previewMode
              article={{
                ...defaultArticle,
                asMainArticle: true,
                authorName: article?.authorName || '',
                id: article?.id || '0',
                replyToId: article?.replyToId || '0',
                replyToArticle: article?.replyToArticle || null,
                title: formVals.title,
                displayTitle: formVals.title,
                categoryFrontId: formVals.category,
                link: formVals.link || '',
                content: formVals.content,
              }}
            />
          )}

          <div className="flex items-center justify-between">
            <div>
              {!isPreview && (
                <>
                  <Button
                    variant={markdownMode ? 'default' : 'ghost'}
                    size="icon"
                    onClick={onMarkdownModeClick}
                    title="Markdown模式"
                    className="w-8 h-[24px] align-middle"
                  >
                    M
                  </Button>
                </>
              )}
            </div>
            <div>
              <Button
                variant="outline"
                disabled={loading}
                className="mt-2"
                size="sm"
                onClick={onPreviewClick}
              >
                {isPreview ? '继续' : '预览'}
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
