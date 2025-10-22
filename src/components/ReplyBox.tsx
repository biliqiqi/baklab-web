import { zodResolver } from '@hookform/resolvers/zod'
import { AfterResponseHook } from 'ky'
import {
  ArrowDownToLineIcon,
  ExpandIcon,
  ImageIcon,
  ShrinkIcon,
  XIcon,
} from 'lucide-react'
import { escapeHtml } from 'markdown-it/lib/common/utils.mjs'
import {
  MouseEvent,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'

import { toSync } from '@/lib/fire-and-forget'
import { bus, cn, md2text, renderMD, summryText } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { submitArticle, submitReply, updateReply } from '@/api/article'
import { uploadFileBase64 } from '@/api/file'
import {
  ARTICLE_MAX_CONTENT_LEN,
  DEFAULT_INNER_CONTENT_WIDTH,
  EV_ON_EDIT_CLICK,
  EV_ON_REPLY_CLICK,
  NAV_HEIGHT,
} from '@/constants/constants'
import { I18n } from '@/constants/types'
import { useReplyBoxCache } from '@/hooks/use-editor-cache'
import i18n from '@/i18n'
import {
  useAuthedUserStore,
  useSiteStore,
  useUserUIStore,
} from '@/state/global'
import {
  Article,
  ArticleSubmitResponse,
  ReplyBoxProps,
  ResponseData,
} from '@/types/types'

import TipTap, { TipTapRef } from './TipTap'
import { Button } from './ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form'
import { Input } from './ui/input'
import { Spinner } from './ui/spinner'
import { Textarea } from './ui/textarea'

const contentSchema = (i: I18n) =>
  z
    .string()
    .trim()
    .min(1, i.t('inputTip', { field: i.t('content') }))
    .max(ARTICLE_MAX_CONTENT_LEN)

const articleSchema = z.object({
  content: contentSchema(i18n),
})

type ArticleSchema = z.infer<typeof articleSchema>

interface ReplyBoxData {
  startHeight: number
  startY: number
  isAdjusting: boolean
  handleMouseMove?: (e: globalThis.MouseEvent) => void
  handleMouseUp?: (e: globalThis.MouseEvent) => void
  handleReplyClick?: (x: Article) => void
  handleEditClick?: (x: Article) => void
}

const REPLY_BOX_MIN_HEIGHT = 40
const REPLY_BOX_INITIAL_HEIGHT = 40

const defaultBoxRef: ReplyBoxData = {
  startHeight: REPLY_BOX_INITIAL_HEIGHT,
  startY: 0,
  isAdjusting: false,
}

const ReplyBox = forwardRef<HTMLDivElement, ReplyBoxProps>(
  (
    {
      category,
      replyToArticle,
      editType,
      edittingArticle,
      onSuccess,
      onRemoveReply,
      disabled = false,
      className,
      bodyHeight,
      mainArticleId,
    },
    ref
  ) => {
    const [loading, setLoading] = useState(false)
    const [replyBoxHeight, setReplyBoxHeight] = useState(
      REPLY_BOX_INITIAL_HEIGHT
    )
    const [isActive, setIsActive] = useState(false)
    const [isPreview, setPreview] = useState(false)
    const [markdownMode, setMarkdownMode] = useState(false)
    const [updateRef, setUpdateRef] = useState(false)
    const [targetInputEl, setTargetInputEl] = useState<HTMLElement | null>(null)
    const [justSubmitted, setJustSubmitted] = useState(false)
    const [rateLimitResetSeconds, setRateLimitResetSeconds] = useState(0)
    const [imageUploading, setImageUploading] = useState(false)
    const [isComposing, setIsComposing] = useState(false)
    const [isMaximized, setIsMaximized] = useState(false)
    const [heightBeforeMaximize, setHeightBeforeMaximize] = useState(
      REPLY_BOX_INITIAL_HEIGHT
    )

    const { siteFrontId } = useParams()

    const site = useSiteStore((state) => state.site)
    const checkPermit = useAuthedUserStore((state) => state.permit)
    const { innerContentWidth: _innerContentWidth } = useUserUIStore(
      useShallow(({ innerContentWidth }) => ({
        innerContentWidth: innerContentWidth || DEFAULT_INNER_CONTENT_WIDTH,
      }))
    )

    const { t, i18n } = useTranslation()

    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const tiptapRef = useRef<TipTapRef | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const replyBoxRef = useRef<ReplyBoxData>({
      ...defaultBoxRef,
    })

    const targetArticle = useMemo(
      () =>
        editType == 'create'
          ? null
          : editType == 'edit'
            ? edittingArticle
            : replyToArticle,
      [editType, replyToArticle, edittingArticle]
    )

    const targetArticleInfo = useMemo(() => {
      if (!targetArticle) return null
      return {
        id: targetArticle.id,
        authorName: targetArticle.authorName,
        summary: summryText(md2text(targetArticle.content), 80),
        deleted: targetArticle.deleted,
      }
    }, [targetArticle])

    const { initialCache, saveCache, clearCache } = useReplyBoxCache(
      siteFrontId || '',
      editType,
      targetArticleInfo,
      category?.id,
      mainArticleId
    )

    const reset = (immediate = false) => {
      setLoading(false)
      setPreview(false)
      setJustSubmitted(false)
      setIsMaximized(false)

      if (immediate) {
        setReplyBoxHeight(REPLY_BOX_INITIAL_HEIGHT)
      } else {
        setTimeout(() => {
          setReplyBoxHeight(REPLY_BOX_INITIAL_HEIGHT)
        }, 100)
      }
    }

    const isEditting = useMemo(() => editType == 'edit', [editType])

    const form = useForm<ArticleSchema>({
      resolver: zodResolver(
        articleSchema.extend({
          content: contentSchema(i18n),
        })
      ),
      defaultValues: {
        content: initialCache?.content || '',
      },
    })

    /* const isReplyToRoot = () => replyToArticle && replyToArticle.replyToId == '0' */
    const readRateLimitData: AfterResponseHook = useCallback(
      (_req, _opt, resp) => {
        const rateLimitRemainingStr = resp.headers.get('X-Ratelimit-Remaining')

        if (rateLimitRemainingStr && rateLimitRemainingStr == '0') {
          const rateLimitResetSecondsStr = resp.headers.get('X-Ratelimit-Reset')
          if (!rateLimitResetSecondsStr) return

          const remainSeconds = parseInt(rateLimitResetSecondsStr, 10)
          if (isNaN(remainSeconds) || remainSeconds <= 0) return

          form.reset()
          setRateLimitResetSeconds(remainSeconds)
        }
      },
      [form]
    )

    const onSubmit = useCallback(
      async ({ content }: ArticleSchema) => {
        try {
          setLoading(true)

          let resp: ResponseData<ArticleSubmitResponse>
          if (editType == 'edit') {
            if (!edittingArticle || !edittingArticle.id)
              throw new Error('reply to aritcle id is required')

            resp = await updateReply(
              edittingArticle.id,
              content,
              edittingArticle.replyToId,
              edittingArticle.displayTitle,
              false,
              {
                siteFrontId: edittingArticle.siteFrontId,
                afterResponseHooks: [readRateLimitData],
              }
            )
          } else if (editType == 'reply') {
            if (!replyToArticle || !replyToArticle.id)
              throw new Error('reply to aritcle id is required')

            resp = await submitReply(replyToArticle.id, content, {
              siteFrontId,
              afterResponseHooks: [readRateLimitData],
            })
          } else {
            if (!category || category.contentForm?.frontId != 'chat')
              throw new Error('category data is required or not under chat')
            resp = await submitArticle(
              '',
              category.id,
              '',
              content,
              false,
              category.contentForm.id,
              {
                siteFrontId,
                afterResponseHooks: [readRateLimitData],
              }
            )
          }

          /* const data = await submitReply(replyToArticle.id, content) */
          if (!resp.code) {
            if (
              site?.reviewBeforePublish &&
              !checkPermit('article', 'review')
            ) {
              toast.info(t('postReviewTip'))
            }

            clearCache()
            setJustSubmitted(true)
            reset()
            form.reset({ content: '' })

            if (onSuccess && typeof onSuccess == 'function') {
              await onSuccess(resp, editType, replyBoxHeight)
            }

            if (
              (editType === 'reply' || editType === 'edit') &&
              onRemoveReply &&
              typeof onRemoveReply === 'function'
            ) {
              await onRemoveReply()
            }

            setTimeout(() => {
              setJustSubmitted(false)
            }, 300)
          }
        } catch (err) {
          console.error('submit reply error: ', err)
        } finally {
          setLoading(false)
        }
      },
      [
        replyToArticle,
        edittingArticle,
        form,
        onSuccess,
        onRemoveReply,
        siteFrontId,
        editType,
        category,
        replyBoxHeight,
        readRateLimitData,
        site,
        checkPermit,
        t,
        clearCache,
      ]
    )

    const onMouseMove = useCallback((e: globalThis.MouseEvent) => {
      const currData = replyBoxRef.current

      e.preventDefault()
      e.stopPropagation()

      /* console.log('is adjusting: ', currData.isAdjusting) */
      /* console.log('start Y: ', currData.startY) */
      if (!currData.isAdjusting) return
      /* console.log('mousemove: ', e) */
      const distance = currData.startY - e.pageY
      const maxHeight = window.innerHeight - NAV_HEIGHT
      /* console.log('distance: ', distance) */

      let newHeight = currData.startHeight + distance
      if (newHeight < REPLY_BOX_MIN_HEIGHT) {
        newHeight = REPLY_BOX_MIN_HEIGHT
      } else if (newHeight > maxHeight) {
        newHeight = maxHeight
      }
      setReplyBoxHeight(newHeight)
    }, [])

    if (!replyBoxRef.current.handleMouseMove)
      replyBoxRef.current.handleMouseMove = onMouseMove

    const onMouseUp = useCallback((e: globalThis.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const currData = replyBoxRef.current

      if (!currData.isAdjusting) {
        if (currData.handleMouseMove)
          window.removeEventListener('mousemove', currData.handleMouseMove)
        return
      }

      if (e.button < 3) {
        e.preventDefault()
      }
      currData.isAdjusting = false

      currData.startY = 0

      setTimeout(() => {
        if (currData.handleMouseMove)
          window.removeEventListener('mousemove', currData.handleMouseMove)
      }, 0)
    }, [])

    if (!replyBoxRef.current.handleMouseUp)
      replyBoxRef.current.handleMouseUp = onMouseUp

    const onTextareaFocus = () => {
      setIsActive(true)

      if (!targetInputEl) {
        const currentElement = markdownMode
          ? textareaRef.current
          : tiptapRef.current?.element
        if (currentElement) {
          setTargetInputEl(currentElement)
        }
      }
    }

    const onPreviewClick = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        setPreview(!isPreview)
      },
      [isPreview]
    )

    const onMarkdownModeClick = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        setMarkdownMode(!markdownMode)
      },
      [markdownMode]
    )

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

    const onMaximizeClick = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        if (!bodyHeight || !targetInputEl) return

        targetInputEl.classList.add('duration-200', 'transition-all')

        if (isMaximized) {
          setReplyBoxHeight(heightBeforeMaximize)
          setIsMaximized(false)
        } else {
          setHeightBeforeMaximize(replyBoxHeight)

          const container = targetInputEl.closest('.flex-grow')
          if (container) {
            const containerRect = container.getBoundingClientRect()
            const inputRect = targetInputEl.getBoundingClientRect()
            const otherElementsHeight = containerRect.height - inputRect.height
            const maxInputHeight = bodyHeight - otherElementsHeight
            setReplyBoxHeight(Math.max(maxInputHeight, REPLY_BOX_MIN_HEIGHT))
          } else {
            setReplyBoxHeight(bodyHeight)
          }
          setIsMaximized(true)
        }

        setTimeout(() => {
          if (targetInputEl)
            targetInputEl.classList.remove('duration-200', 'transition-all')
        }, 200)
      },
      [
        isMaximized,
        replyBoxHeight,
        heightBeforeMaximize,
        bodyHeight,
        targetInputEl,
      ]
    )

    const createSetupForm = (isMarkdownMode: boolean) => {
      return () => {
        setTimeout(() => {
          if (isMarkdownMode) {
            if (textareaRef.current) {
              textareaRef.current.focus()
            }
          } else {
            if (tiptapRef.current?.editor) {
              tiptapRef.current.editor.commands.focus()
            }
          }
        }, 100)
      }
    }

    const onReplyBoxBarMouseDown = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        const currData = replyBoxRef.current
        e.preventDefault()

        if (targetInputEl) currData.startHeight = targetInputEl.offsetHeight

        currData.isAdjusting = true
        currData.startY = e.pageY

        if (currData.handleMouseMove) {
          window.removeEventListener('mousemove', currData.handleMouseMove)
          window.addEventListener('mousemove', currData.handleMouseMove)
        }
      },
      [targetInputEl]
    )

    if (!replyBoxRef.current.handleReplyClick) {
      replyBoxRef.current.handleReplyClick = createSetupForm(markdownMode)
    }

    if (!replyBoxRef.current.handleEditClick) {
      replyBoxRef.current.handleEditClick = createSetupForm(markdownMode)
    }

    useEffect(() => {
      if (!targetInputEl || isComposing) return

      if (isActive) {
        const targetHeight = 80
        if (replyBoxHeight < targetHeight) {
          targetInputEl.classList.add('duration-200', 'transition-all')
          setReplyBoxHeight(targetHeight)
          setTimeout(() => {
            if (targetInputEl)
              targetInputEl.classList.remove('duration-200', 'transition-all')
          }, 200)
        }
      } else {
        form.clearErrors('content')
        if (
          replyBoxHeight != REPLY_BOX_INITIAL_HEIGHT &&
          !loading &&
          !justSubmitted
        ) {
          targetInputEl.classList.add('duration-200', 'transition-all')
          setReplyBoxHeight(REPLY_BOX_INITIAL_HEIGHT)
          setTimeout(() => {
            if (targetInputEl)
              targetInputEl.classList.remove('duration-200', 'transition-all')
          }, 200)
        }
      }
    }, [
      isActive,
      replyBoxHeight,
      targetInputEl,
      form,
      loading,
      justSubmitted,
      isComposing,
    ])

    useEffect(() => {
      if (isEditting && edittingArticle) {
        const contentToUse = initialCache?.content || edittingArticle.content

        form.reset({
          content: contentToUse,
        })

        setIsActive(true)

        if (initialCache?.replyBoxHeight) {
          setReplyBoxHeight(initialCache.replyBoxHeight)
        }

        if (!targetInputEl) {
          const currentElement = markdownMode
            ? textareaRef.current
            : tiptapRef.current?.element
          if (currentElement) {
            setTargetInputEl(currentElement)
          }
        }
      }
    }, [
      isEditting,
      edittingArticle,
      form,
      initialCache,
      targetInputEl,
      markdownMode,
    ])

    useEffect(() => {
      if (initialCache?.content && !isEditting) {
        setIsActive(true)

        if (initialCache.replyBoxHeight) {
          setReplyBoxHeight(initialCache.replyBoxHeight)
        }

        if (!targetInputEl) {
          const currentElement = markdownMode
            ? textareaRef.current
            : tiptapRef.current?.element
          if (currentElement) {
            setTargetInputEl(currentElement)
          }
        }
      }
    }, [initialCache, isEditting, targetInputEl, markdownMode])

    useEffect(() => {
      if (initialCache?.content && !isEditting) {
        form.reset({
          content: initialCache.content,
        })
      }
    }, [initialCache, isEditting, form])

    useEffect(() => {
      const timeoutRef = { current: null as NodeJS.Timeout | null }

      const subscription = form.watch((data) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
          if (data.content) {
            saveCache(data.content, replyBoxHeight)
          } else {
            clearCache()
          }
        }, 500)
      })

      return () => {
        subscription.unsubscribe()
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }, [form, saveCache, clearCache, replyBoxHeight])

    useEffect(() => {
      const currData = replyBoxRef.current

      /* console.log('listeners before bind: ', bus.listeners(EV_ON_REPLY_CLICK)) */
      if (currData.handleReplyClick) {
        bus.off(EV_ON_REPLY_CLICK, currData.handleReplyClick)
        bus.on(EV_ON_REPLY_CLICK, currData.handleReplyClick)
      }
      /* console.log('listeners after bind: ', bus.listeners(EV_ON_REPLY_CLICK)) */

      if (currData.handleEditClick) {
        bus.off(EV_ON_EDIT_CLICK, currData.handleEditClick)
        bus.on(EV_ON_EDIT_CLICK, currData.handleEditClick)
      }

      if (currData.handleMouseMove)
        window.removeEventListener('mousemove', currData.handleMouseMove)

      if (currData.handleMouseUp) {
        window.removeEventListener('mouseup', currData.handleMouseUp)
        window.addEventListener('mouseup', currData.handleMouseUp)
      }

      return () => {
        if (currData.handleMouseMove)
          window.removeEventListener('mousemove', currData.handleMouseMove)

        if (currData.handleMouseUp)
          window.removeEventListener('mouseup', currData.handleMouseUp)

        if (currData.handleReplyClick)
          bus.off(EV_ON_REPLY_CLICK, currData.handleReplyClick)

        if (currData.handleEditClick)
          bus.off(EV_ON_EDIT_CLICK, currData.handleEditClick)

        /* console.log('listeners unload: ', bus.listeners(EV_ON_REPLY_CLICK)) */
      }
    }, [form])

    useEffect(() => {
      const currData = replyBoxRef.current
      /* console.log('markdown mode change: ', markdownMode) */

      if (currData.handleReplyClick) {
        bus.off(EV_ON_REPLY_CLICK, currData.handleReplyClick)
      }
      currData.handleReplyClick = createSetupForm(markdownMode)
      bus.on(EV_ON_REPLY_CLICK, currData.handleReplyClick)

      if (currData.handleEditClick) {
        bus.off(EV_ON_EDIT_CLICK, currData.handleEditClick)
      }
      currData.handleEditClick = createSetupForm(markdownMode)
      bus.on(EV_ON_EDIT_CLICK, currData.handleEditClick)
    }, [markdownMode, updateRef])

    useEffect(() => {
      const currData = replyBoxRef.current
      /* console.log('textarea ref: ', textareaRef.current) */
      if (targetInputEl) {
        setReplyBoxHeight(targetInputEl.offsetHeight)
        currData.startHeight = targetInputEl.offsetHeight
      }
    }, [targetInputEl])

    useEffect(() => {
      const updateTargetElement = () => {
        if (markdownMode) {
          setTargetInputEl(textareaRef.current)
        } else {
          setTargetInputEl(tiptapRef.current?.element || null)
        }
      }

      updateTargetElement()

      // If TipTap mode but element not ready, retry with delay
      if (!markdownMode && !tiptapRef.current?.element) {
        const retryTimer = setTimeout(() => {
          updateTargetElement()
        }, 100)
        return () => clearTimeout(retryTimer)
      }
    }, [markdownMode, tiptapRef.current?.element])

    useEffect(() => {
      setUpdateRef(true)
    }, [])

    useEffect(() => {
      if (rateLimitResetSeconds <= 0) return

      const timer = setTimeout(() => {
        const newSeconds = rateLimitResetSeconds - 1
        setRateLimitResetSeconds(newSeconds <= 0 ? 0 : newSeconds)
      }, 1000)

      return () => {
        clearTimeout(timer)
      }
    }, [rateLimitResetSeconds])

    return (
      <div
        ref={ref}
        className={cn(
          'container mx-auto bottom-0 flex justify-center sticky left-0 right-0 z-50',
          className
        )}
      >
        <div
          className="flex-grow bg-white p-3 rounded-lg border-[1px]"
          style={{
            boxShadow:
              '0 0 15px -3px rgb(0 0 0 / 0.1), 0 0 6px -4px rgb(0 0 0 / 0.1)',
            maxWidth: `calc(100% - 1rem)`,
          }}
        >
          {disabled ? (
            <div className={cn('text-gray-500 text-sm')}>
              {t('lackPermission')}
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                onKeyUp={(e) => {
                  if (
                    e.ctrlKey &&
                    e.key == 'Enter' &&
                    !disabled &&
                    rateLimitResetSeconds <= 0
                  ) {
                    toSync(form.handleSubmit(onSubmit))()
                  }
                }}
              >
                <div
                  className="pt-3 cursor-ns-resize"
                  onMouseDown={onReplyBoxBarMouseDown}
                ></div>
                {(targetArticle || initialCache?.targetArticle) &&
                  !targetArticle?.asMainArticle && (
                    <div className="flex items-center justify-between bg-gray-100 rounded-sm py-1 px-2 mb-2 text-gray-500 text-sm">
                      <span>
                        {targetArticle?.deleted ||
                        initialCache?.targetArticle?.deleted ? (
                          <i className="text-gray-500 text-sm">
                            &lt;{t('deleted')}&gt;
                          </i>
                        ) : (
                          <span>
                            {targetArticle?.authorName ||
                              initialCache?.targetArticle?.authorName}
                            :{' '}
                            <span>
                              {targetArticle
                                ? summryText(md2text(targetArticle.content), 80)
                                : initialCache?.targetArticle?.summary}
                            </span>
                          </span>
                        )}
                      </span>
                      {!isPreview && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async (e) => {
                            e.preventDefault()
                            if (
                              onRemoveReply &&
                              typeof onRemoveReply == 'function'
                            )
                              await onRemoveReply()
                          }}
                        >
                          <XIcon size={20} />
                        </Button>
                      )}
                    </div>
                  )}
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormControl>
                        <>
                          <Textarea
                            {...field}
                            state={fieldState.invalid ? 'invalid' : 'default'}
                            ref={textareaRef}
                            style={{
                              height: replyBoxHeight + 'px',
                              display: isPreview || !markdownMode ? 'none' : '',
                            }}
                            onFocus={onTextareaFocus}
                            onComposingChange={setIsComposing}
                            disabled={disabled || rateLimitResetSeconds > 0}
                            placeholder={
                              rateLimitResetSeconds > 0
                                ? t('availableInSeconds', {
                                    seconds: rateLimitResetSeconds,
                                  })
                                : ''
                            }
                          />

                          <TipTap
                            {...field}
                            state={fieldState.invalid ? 'invalid' : 'default'}
                            ref={tiptapRef}
                            style={{
                              height: replyBoxHeight + 'px',
                              display: isPreview || markdownMode ? 'none' : '',
                              marginTop: 0,
                            }}
                            onFocus={onTextareaFocus}
                            onComposingChange={setIsComposing}
                            onChange={field.onChange}
                            value={escapeHtml(field.value)}
                            hideBubble={markdownMode}
                            disabled={disabled || rateLimitResetSeconds > 0}
                            className={cn(isActive && 'resize-y overflow-auto')}
                            placeholder={
                              rateLimitResetSeconds > 0
                                ? t('availableInSeconds', {
                                    seconds: rateLimitResetSeconds,
                                  })
                                : ''
                            }
                          />
                        </>
                      </FormControl>
                      {isPreview && (
                        <div
                          style={{
                            maxHeight: `calc(100vh - ${NAV_HEIGHT * 4}px)`,
                            overflowY: 'scroll',
                          }}
                          className="b-article-content"
                          dangerouslySetInnerHTML={{
                            __html: renderMD(field.value),
                          }}
                        ></div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isActive && (
                  <div className="flex justify-between mt-1 items-center">
                    <div className="flex items-center">
                      {!isPreview && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsActive(false)}
                            title={t('collape')}
                            className="mr-2 w-8 h-[24px] text-gray-500 px-0 align-middle"
                          >
                            <ArrowDownToLineIcon size={20} />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={onMaximizeClick}
                            title={isMaximized ? t('restore') : t('maximize')}
                            className="mr-2 w-8 h-[24px] text-gray-500 px-0 align-middle"
                          >
                            {isMaximized ? (
                              <ShrinkIcon size={20} />
                            ) : (
                              <ExpandIcon size={20} />
                            )}
                          </Button>
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
                            title={
                              imageUploading ? t('uploading') : t('addImage')
                            }
                            className="w-8 h-[24px] text-gray-500"
                          >
                            {imageUploading ? (
                              <Spinner />
                            ) : (
                              <ImageIcon size={20} />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center">
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
                        disabled={
                          loading || disabled || rateLimitResetSeconds > 0
                        }
                        className="mt-2 ml-2"
                        size="sm"
                      >
                        {loading && <Spinner />} {t('submit')}
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          )}

          {/* Hidden file input */}
          <Input
            type="file"
            ref={fileInputRef}
            onChange={onFileChange}
            accept="image/*"
            className="hidden"
            style={{ display: 'none' }}
          />
        </div>
      </div>
    )
  }
)

ReplyBox.displayName = 'ReplyBox'

export default ReplyBox
