import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronsUpDown, ImageIcon, X } from 'lucide-react'
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
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { dayjs, timeAgo } from '@/lib/dayjs-custom'
import { cn } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { submitArticle, updateArticle, updateReply } from '@/api/article'
import { uploadFileBase64 } from '@/api/file'
import { getSiteTags } from '@/api/site'
import {
  ARTICLE_MAX_CONTENT_LEN,
  ARTICLE_MAX_TITILE_LEN,
} from '@/constants/constants'
import { defaultArticle } from '@/constants/defaults'
import { useEditorCache, useInitialCache } from '@/hooks/use-editor-cache'
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
  Tag,
} from '@/types/types'

import ArticleCard from './ArticleCard'
import ContentFormSelector from './ContentFormSelector'
import TipTap, { TipTapRef } from './TipTap'
import BAvatar from './base/BAvatar'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Checkbox } from './ui/checkbox'
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
import { Spinner } from './ui/spinner'
import { Textarea } from './ui/textarea'

const contentRule = z.string().max(ARTICLE_MAX_CONTENT_LEN)

const contentSchema = z.object({
  content: contentRule,
})

const articleSchema = z.object({
  title: z.string(),
  link: z.string(),
  category: z.string(),
  contentFormId: z.string().optional(),
  content: contentRule,
  pinnedScope: z.enum(['', 'category', 'site', 'platform']).optional(),
  pinnedExpireAt: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

type ArticleSchema = z.infer<typeof articleSchema>
/* type ContentSchema = z.infer<typeof contentSchema> */

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

const sanitizeTagNames = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
    .filter((tag): tag is string => Boolean(tag))
}

const extractArticleTagNames = (tags?: Tag[] | null): string[] =>
  sanitizeTagNames(tags?.map((tag) => tag.name) ?? [])

const ArticleForm = ({ article }: ArticleFormProps) => {
  const [openCategoryList, setOpenCategoryList] = useState(false)
  const [loading, setLoading] = useState(false)
  const [markdownMode, setMarkdownMode] = useState(false)
  const [isPreview, setPreview] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [showLinkField, setShowLinkField] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [showPinScopeOptions, setShowPinScopeOptions] = useState(false)
  /* const [isDragging, setDragging] = useState(false) */

  /* const [selectedCategory, setSelectedCategory] = useState<Category | null>(
   *   null
   * ) */

  const [tagOptions, setTagOptions] = useState<Tag[]>([])
  const [tagSelectorOpen, setTagSelectorOpen] = useState(false)
  const [tagLoading, setTagLoading] = useState(false)

  const [contentBoxHeight, setContentBoxHeight] = useState(
    INIT_CONTENT_BOX_HEIGHT
  )

  const { siteFrontId } = useParams()
  /* const [cateList, setCateList] = useState<CategoryOption[]>([]) */
  const { categories: cateList } = useCategoryStore()
  const site = useSiteStore((state) => state.site)
  const tagsEnabled = Boolean(site?.tagConfig?.enabled)
  const maxTagsPerPost = useMemo(
    () => site?.tagConfig?.maxTagsPerPost ?? 3,
    [site?.tagConfig?.maxTagsPerPost]
  )

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const notFound = useNotFoundStore()

  const { t } = useTranslation()

  const filteredCateList = useMemo(
    () => cateList.filter((item) => item.contentForm?.frontId != 'chat'),
    [cateList]
  )

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
  const activeTagOptions = useMemo(
    () => tagOptions.filter((tag) => tag.status === 'active'),
    [tagOptions]
  )

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
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const tiptapRef = useRef<TipTapRef | null>(null)

  const checkPermit = useAuthedUserStore((state) => state.permit)

  const cacheKey = useMemo(() => {
    if (isEdit && article?.id) {
      if (isReply) {
        return `articleform-editreply-${article.id}`
      } else {
        return `articleform-edit-${article.id}`
      }
    } else if (paramCateId) {
      return `articleform-create-${paramCateId}`
    }
    return ''
  }, [isEdit, isReply, article?.id, paramCateId])

  const cacheEnabled = !isEdit && !!cacheKey
  const initialCache = useInitialCache(cacheKey, cacheEnabled)
  const cachedTags = useMemo(() => {
    if (!initialCache) return []
    return sanitizeTagNames(initialCache['tags'])
  }, [initialCache])

  const defaultArticleData: ArticleSchema =
    isEdit && article
      ? isReply
        ? {
            title: '',
            link: '',
            category: '',
            content: article.content,
            tags: extractArticleTagNames(article.tags),
          }
        : {
            title: article.title,
            link: article.link,
            category: article.categoryId,
            content: article.content,
            contentFormId: article.contentFormId || '0',
            pinnedScope: (article.pinnedScope as '') || '',
            pinnedExpireAt: article.pinnedExpireAt
              ? dayjs(article.pinnedExpireAt).format('YYYY-MM-DDTHH:mm')
              : '',
            tags: extractArticleTagNames(article.tags),
          }
      : {
          title: (initialCache?.title as string) || '',
          link: (initialCache?.link as string) || '',
          category:
            (initialCache?.category as string) ||
            searchParams.get('category_id') ||
            '',
          content: (initialCache?.content as string) || '',
          contentFormId:
            (initialCache?.contentFormId as string) ||
            categoryMap[paramCateId]?.contentFormId ||
            '0',
          pinnedScope: '',
          pinnedExpireAt: '',
          tags: cachedTags,
        }

  /* console.log('default form data: ', defaultArticleData) */

  const form = useForm<ArticleSchema>({
    resolver: isReply
      ? zodResolver(contentSchema)
      : zodResolver(
          articleSchema.extend({
            title: z
              .string()
              .trim()
              .min(1, t('inputTip', { field: t('title') }))
              .max(ARTICLE_MAX_TITILE_LEN),
            link: z
              .string()
              .optional()
              .transform((val) => {
                return val === undefined || val === '' ? undefined : val.trim()
              })
              .refine(
                (val) =>
                  val === undefined ||
                  z.string().trim().url().safeParse(val).success,
                t('formatError', { field: t('link') })
              ),
            category: z
              .string()
              .min(1, t('selectTip', { field: t('category') }))
              .trim(),
          })
        ),
    defaultValues: defaultArticleData,
  })

  const { clearCache } = useEditorCache(cacheKey, form, {
    enabled: cacheEnabled,
  })

  const formVals = form.watch()

  const categoryVal = useCallback(() => form.getValues('category'), [form])
  const getSelectedTags = useCallback(() => {
    const current = form.getValues('tags')
    if (!Array.isArray(current)) return []
    return current.filter(
      (tag): tag is string => typeof tag === 'string' && Boolean(tag)
    )
  }, [form])

  const handleTagToggle = useCallback(
    (tagName: string) => {
      const sanitized = tagName.trim()
      if (!sanitized) return

      const currentTags = getSelectedTags()
      if (currentTags.includes(sanitized)) {
        const nextTags = currentTags.filter((tag) => tag !== sanitized)
        form.setValue('tags', nextTags, { shouldDirty: true })
        return
      }

      if (currentTags.length >= maxTagsPerPost) {
        setTagSelectorOpen(false)
        return
      }

      const nextTags = [...currentTags, sanitized]
      form.setValue('tags', nextTags, { shouldDirty: true })
      if (nextTags.length >= maxTagsPerPost) {
        setTagSelectorOpen(false)
      }
    },
    [form, getSelectedTags, maxTagsPerPost]
  )

  const handleTagRemove = useCallback(
    (tagName: string) => {
      const currentTags = getSelectedTags()
      const nextTags = currentTags.filter((tag) => tag !== tagName)
      form.setValue('tags', nextTags, { shouldDirty: true })
    },
    [form, getSelectedTags]
  )
  const onSubmit = useCallback(
    async ({
      title,
      link,
      category,
      content,
      contentFormId,
      pinnedScope,
      pinnedExpireAt,
      tags,
    }: ArticleSchema) => {
      /* console.log('values: ', content)
       * console.log('isEdit:', isEdit)
       * console.log('isReply:', isReply) */

      if (!siteFrontId) return

      try {
        setLoading(true)

        let formattedExpireAt: string | undefined = undefined
        if (pinnedExpireAt && pinnedScope) {
          const localDate = new Date(pinnedExpireAt)
          formattedExpireAt = localDate.toISOString()
        }

        const sanitizedTags = sanitizeTagNames(tags)
        if (
          !isReply &&
          tagsEnabled &&
          maxTagsPerPost > 0 &&
          sanitizedTags.length > maxTagsPerPost
        ) {
          toast.error(
            t('tagLimitExceeded', {
              max: maxTagsPerPost,
            })
          )
          return
        }

        const payloadTags = !isReply && tagsEnabled ? sanitizedTags : undefined

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
              contentFormId,
              pinnedScope,
              formattedExpireAt,
              payloadTags,
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
            pinnedScope,
            formattedExpireAt,
            payloadTags,
            {
              siteFrontId,
            }
          )
        }

        if (!data.code) {
          if (site?.reviewBeforePublish && !checkPermit('article', 'review')) {
            toast.info(t('postReviewTip'))
          }
          clearCache()
          navigate(`/z/${siteFrontId}/articles/${data.data.id}`, {
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
      t,
      clearCache,
      tagsEnabled,
      maxTagsPerPost,
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

  const isComposingRef = useRef(false)

  useEffect(() => {
    isComposingRef.current = isComposing
  }, [isComposing])

  const onContentBoxResize = useCallback((_width: number, height: number) => {
    /* console.log('content height: ', height)
     * console.log('draggingRef: ', draggingRef.current) */

    if (!draggingRef.current.dragging || isComposingRef.current) return

    if (height < MIN_CONTENT_BOX_HEIGHT) {
      setContentBoxHeight(MIN_CONTENT_BOX_HEIGHT)
    } else {
      setContentBoxHeight(height)
    }
  }, [])

  const onSelectCategory = useCallback(
    (currentValue: string) => {
      const newVal = currentValue === categoryVal() ? '' : currentValue

      form.setValue('category', newVal, { shouldDirty: true })

      form.setValue('contentFormId', categoryMap[newVal]?.contentFormId || '0')
      setOpenCategoryList(false)
    },
    [categoryVal, form, categoryMap]
  )

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

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.currentTarget.files?.length) return

      const file = e.currentTarget.files[0]
      if (!file.type.startsWith('image/')) {
        toast.error(t('pleaseSelectImageFile'))
        return
      }

      setImageUploading(true)

      try {
        const reader = new FileReader()
        reader.onload = async (event) => {
          const imageData = event.target?.result as string
          if (!imageData) {
            setImageUploading(false)
            return
          }

          try {
            const uploadResponse = await uploadFileBase64(imageData)

            if (uploadResponse?.success && uploadResponse.data?.customUrl) {
              const imageUrl = uploadResponse.data.customUrl

              if (markdownMode) {
                const currentContent = form.getValues('content')
                const imageMarkdown = `![image](${imageUrl})`
                form.setValue('content', currentContent + imageMarkdown)
              } else {
                if (tiptapRef.current?.insertImage) {
                  tiptapRef.current.insertImage(imageUrl, 'image')
                }
              }
            } else {
              throw new Error('Upload failed')
            }
          } catch (error) {
            console.error('Upload error:', error)
            toast.error(t('failedToUploadImage'))
          } finally {
            setImageUploading(false)
          }
        }

        reader.readAsDataURL(file)
      } catch (error) {
        console.error('File read error:', error)
        toast.error(t('failedToReadFile'))
        setImageUploading(false)
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [markdownMode, form, t]
  )

  const onImageUploadClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      if (!imageUploading && fileInputRef.current) {
        fileInputRef.current.click()
      }
    },
    [imageUploading]
  )

  useDocumentTitle(isEdit ? t('editPost') : t('createPost'))

  useEffect(() => {
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  useEffect(() => {
    if (!isEdit) {
      if (categoryMap[formVals.category]?.contentFormId) {
        form.setValue(
          'contentFormId',
          categoryMap[formVals.category].contentFormId || '0'
        )
      }
    }
  }, [categoryMap, isEdit])

  useEffect(() => {
    if (!tagsEnabled || !siteFrontId) {
      setTagOptions([])
      setTagLoading(false)
      return
    }

    let ignore = false

    const fetchTags = async () => {
      try {
        setTagLoading(true)
        const { code, data } = await getSiteTags(
          siteFrontId,
          1,
          200,
          undefined,
          ['active']
        )
        if (!ignore) {
          if (!code && data?.list) {
            setTagOptions(data.list)
          } else {
            setTagOptions([])
          }
        }
      } catch (error) {
        if (!ignore) {
          console.error('fetch site tags error: ', error)
          setTagOptions([])
        }
      } finally {
        if (!ignore) {
          setTagLoading(false)
        }
      }
    }

    void fetchTags()

    return () => {
      ignore = true
    }
  }, [siteFrontId, tagsEnabled])

  useEffect(() => {
    if (isEdit && article && article.pinnedScope) {
      setIsPinned(true)
    }
  }, [isEdit, article])

  return (
    <Card className="p-3">
      {article && !isPreview && (
        <div className="py-2 mb-4 text-gray-500 text-sm">
          <BAvatar size={24} username={article.authorName} />{' '}
          <Link to={`/users/${article.authorName}`}>{article.authorName}</Link>{' '}
          {t('publishedAt', { time: timeAgo(article.createdAt) })}
        </div>
      )}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 mx-auto"
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
                        placeholder={t('inputTip', { field: t('title') })}
                        autoComplete="off"
                        state={fieldState.invalid ? 'invalid' : 'default'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-wrap items-center">
                <FormField
                  control={form.control}
                  name="category"
                  key="category"
                  render={({ fieldState }) => (
                    <FormItem
                      className="mr-4 my-1"
                      style={{ display: isPreview ? 'none' : '' }}
                    >
                      <div>
                        <FormLabel className="text-gray-500 mr-2">
                          {t('publishTo')}
                        </FormLabel>
                        <FormControl>
                          <Popover
                            open={openCategoryList}
                            onOpenChange={setOpenCategoryList}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant={
                                  fieldState.invalid ? 'invalid' : 'outline'
                                }
                                role="combobox"
                                aria-expanded={openCategoryList}
                                className={cn(
                                  'w-[200px] justify-between',
                                  !categoryVal() && 'text-text-secondary'
                                )}
                                disabled={
                                  loading ||
                                  (isEdit &&
                                    !checkPermit('article', 'edit_others'))
                                }
                                size={'sm'}
                              >
                                {categoryVal()
                                  ? filteredCateList.find(
                                      (cate) => cate.id === categoryVal()
                                    )?.name
                                  : t('pleaseSelect')}
                                <ChevronsUpDown className="opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                              <Command
                                filter={(val, search) =>
                                  categoryNameMap[val].includes(search) ? 1 : 0
                                }
                              >
                                <CommandInput
                                  placeholder={t('searchCategory')}
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    {t('noCategoryFound')}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {filteredCateList.map((cate) => (
                                      <CommandItem
                                        key={cate.id}
                                        value={cate.id}
                                        onSelect={onSelectCategory}
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
                                          <div className="text-text-secondary text-xs">
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
                    <FormItem
                      className="mr-4 my-1"
                      style={{ display: isPreview ? 'none' : '' }}
                    >
                      <div>
                        <FormLabel className="text-gray-500 mr-2">
                          {t('contentForm')}
                        </FormLabel>
                        <FormControl>
                          <ContentFormSelector
                            value={field.value || '0'}
                            onChange={field.onChange}
                            ref={field.ref}
                            disabled={Boolean(
                              categoryMap[formVals.category]?.contentFormId &&
                                categoryMap[formVals.category]?.contentFormId !=
                                  '0'
                            )}
                            selectedCategory={
                              categoryMap[formVals.category] || null
                            }
                            filterChatBasedOnCategory={true}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="mr-2 my-1"
                  style={{ display: isPreview ? 'none' : '' }}
                  onClick={(e) => {
                    e.preventDefault()
                    setShowLinkField((state) => !state)
                  }}
                >
                  + {t('sourceLink')}
                </Button>
              </div>
              {showLinkField && (
                <FormField
                  control={form.control}
                  name="link"
                  key="link"
                  render={({ field, fieldState }) => (
                    <FormItem style={{ display: isPreview ? 'none' : '' }}>
                      <FormControl>
                        <Input
                          placeholder={t('inputTip', {
                            field: t('sourceLink'),
                          })}
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
              )}
            </>
          )}
          {!isReply && tagsEnabled && (
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => {
                const selectedTags = Array.isArray(field.value)
                  ? field.value
                  : []
                const reachMax =
                  maxTagsPerPost > 0 && selectedTags.length >= maxTagsPerPost
                const selectorDisabled =
                  tagLoading || activeTagOptions.length === 0 || reachMax

                return (
                  <FormItem
                    className="w-full my-1"
                    style={{ display: isPreview ? 'none' : '' }}
                  >
                    <div className="flex flex-wrap items-center">
                      <FormLabel className="text-gray-500 mr-2">
                        {t('tags')}：
                      </FormLabel>
                      <FormControl>
                        <div className="flex flex-wrap items-center gap-2">
                          {selectedTags.length === 0 && (
                            <span className="text-sm text-text-secondary">
                              {t('selectTip', { field: t('tags') })}
                            </span>
                          )}
                          {selectedTags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="flex items-center gap-1 pl-2 pr-1.5"
                            >
                              <span>{tag}</span>
                              <button
                                type="button"
                                className="rounded-full p-0.5 text-text-secondary hover:bg-muted transition-colors"
                                onClick={() => handleTagRemove(tag)}
                                aria-label={t('remove')}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          <Popover
                            open={tagSelectorOpen}
                            onOpenChange={setTagSelectorOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={selectorDisabled}
                              >
                                {t('selectTags')}
                                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[240px] p-0">
                              {tagLoading ? (
                                <div className="flex items-center justify-center py-4">
                                  <Spinner className="size-4" />
                                </div>
                              ) : (
                                <Command>
                                  <CommandInput placeholder={t('searchTags')} />
                                  <CommandList>
                                    <CommandEmpty>{t('noTags')}</CommandEmpty>
                                    <CommandGroup>
                                      {activeTagOptions.map((tag) => (
                                        <CommandItem
                                          key={tag.id}
                                          value={tag.name}
                                          onSelect={() =>
                                            handleTagToggle(tag.name)
                                          }
                                        >
                                          {tag.name}
                                          <Check
                                            className={cn(
                                              'ml-auto',
                                              selectedTags.includes(tag.name)
                                                ? 'opacity-100'
                                                : 'opacity-0'
                                            )}
                                          />
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              )}
                            </PopoverContent>
                          </Popover>
                          {tagLoading && <Spinner className="size-4" />}
                          {!tagLoading && activeTagOptions.length === 0 && (
                            <span className="text-sm text-text-secondary">
                              {t('noTags')}
                            </span>
                          )}
                        </div>
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
          )}
          {/* 置顶功能 - 只有非回复且用户有置顶权限时才显示 */}
          {!isReply &&
            (checkPermit('article', 'pin') ||
              checkPermit('article', 'manage_platform')) && (
              <div
                className="flex flex-wrap items-center"
                style={{ display: isPreview ? 'none' : '' }}
              >
                <FormField
                  control={form.control}
                  name="pinnedScope"
                  render={({ field }) => (
                    <FormItem className="mr-4 my-1">
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={isPinned}
                            onCheckedChange={(checked) => {
                              setIsPinned(checked as boolean)
                              if (!checked) {
                                field.onChange('')
                                form.setValue('pinnedExpireAt', '')
                              } else {
                                field.onChange('category')
                                const defaultExpireTime = new Date()
                                defaultExpireTime.setDate(
                                  defaultExpireTime.getDate() + 7
                                )
                                form.setValue(
                                  'pinnedExpireAt',
                                  defaultExpireTime.toISOString().slice(0, 16)
                                )
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-gray-500 cursor-pointer">
                          {t('pinArticle')}
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                {isPinned && (
                  <>
                    <FormField
                      control={form.control}
                      name="pinnedScope"
                      render={({ field }) => (
                        <FormItem className="mr-4 my-1">
                          <FormControl>
                            <Popover
                              open={showPinScopeOptions}
                              onOpenChange={setShowPinScopeOptions}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  size="sm"
                                  className="w-[180px] justify-between"
                                >
                                  {field.value === 'category' &&
                                    t('pinScopeCategory')}
                                  {field.value === 'site' && t('pinScopeSite')}
                                  {field.value === 'platform' &&
                                    t('pinScopePlatform')}
                                  {!field.value && t('pleaseSelect')}
                                  <ChevronsUpDown className="opacity-50 w-4 h-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[180px] p-0">
                                <Command>
                                  <CommandList>
                                    <CommandGroup>
                                      <CommandItem
                                        value="category"
                                        onSelect={() => {
                                          field.onChange('category')
                                          setShowPinScopeOptions(false)
                                        }}
                                      >
                                        {t('pinScopeCategory')}
                                        <Check
                                          className={cn(
                                            'ml-auto h-4 w-4',
                                            field.value === 'category'
                                              ? 'opacity-100'
                                              : 'opacity-0'
                                          )}
                                        />
                                      </CommandItem>
                                      {checkPermit('article', 'pin') && (
                                        <CommandItem
                                          value="site"
                                          onSelect={() => {
                                            field.onChange('site')
                                            setShowPinScopeOptions(false)
                                          }}
                                        >
                                          {t('pinScopeSite')}
                                          <Check
                                            className={cn(
                                              'ml-auto h-4 w-4',
                                              field.value === 'site'
                                                ? 'opacity-100'
                                                : 'opacity-0'
                                            )}
                                          />
                                        </CommandItem>
                                      )}
                                      {checkPermit(
                                        'article',
                                        'manage_platform'
                                      ) && (
                                        <CommandItem
                                          value="platform"
                                          onSelect={() => {
                                            field.onChange('platform')
                                            setShowPinScopeOptions(false)
                                          }}
                                        >
                                          {t('pinScopePlatform')}
                                          <Check
                                            className={cn(
                                              'ml-auto h-4 w-4',
                                              field.value === 'platform'
                                                ? 'opacity-100'
                                                : 'opacity-0'
                                            )}
                                          />
                                        </CommandItem>
                                      )}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pinnedExpireAt"
                      render={({ field }) => (
                        <FormItem className="mr-4 my-1">
                          <div className="flex items-center space-x-2">
                            <FormLabel className="text-gray-500 whitespace-nowrap">
                              {t('pinExpireTime')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="datetime-local"
                                className="w-auto"
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  field.onChange(e.target.value)
                                }}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
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
                      placeholder={t('inputTip', { field: t('content') })}
                      style={{
                        display: !markdownMode ? 'none' : '',
                        height:
                          draggingRef.current.inputType == 'tiptap'
                            ? `${contentBoxHeight}px`
                            : '',
                      }}
                      onResize={onContentBoxResize}
                      onMouseDown={onMouseDown('textarea')}
                      onComposingChange={setIsComposing}
                    />

                    <TipTap
                      placeholder={t('inputTip', { field: t('content') })}
                      {...field}
                      ref={tiptapRef}
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
                      onComposingChange={setIsComposing}
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
            <div className="flex items-center">
              {!isPreview && (
                <>
                  <Button
                    variant={markdownMode ? 'default' : 'outline'}
                    size="icon"
                    onClick={onMarkdownModeClick}
                    title={t('xMode', { name: 'Markdown' })}
                    className={cn(
                      'mr-2 w-8 h-[24px] align-middle leading-5',
                      markdownMode
                        ? 'text-white dark:text-black'
                        : 'text-gray-500'
                    )}
                  >
                    M
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onImageUploadClick}
                    disabled={imageUploading}
                    title={imageUploading ? t('uploading') : t('addImage')}
                    className="w-8 h-[24px] text-gray-500"
                  >
                    {imageUploading ? <Spinner /> : <ImageIcon size={20} />}
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
                {isPreview ? t('continue') : t('preview')}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                size="sm"
                className="ml-2"
              >
                {loading && <Spinner />} {t('submit')}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      <Input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept="image/*"
        className="hidden"
        style={{ display: 'none' }}
      />
    </Card>
  )
}

export default ArticleForm
