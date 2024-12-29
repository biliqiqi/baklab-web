import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDownToLineIcon, XIcon } from 'lucide-react'
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

import { toSync } from '@/lib/fire-and-forget'
import { bus, md2text, renderMD, summryText } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { submitReply, updateReply } from '@/api/article'
import {
  ARTICLE_MAX_CONTENT_LEN,
  EV_ON_EDIT_CLICK,
  EV_ON_REPLY_CLICK,
  NAV_HEIGHT,
} from '@/constants/constants'
import { Article, ArticleSubmitResponse, ResponseData } from '@/types/types'

import TipTap, { TipTapRef } from './TipTap'
import BLoader from './base/BLoader'
import { Button } from './ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form'
import { Textarea } from './ui/textarea'

const articleScheme = z.object({
  content: z.string().trim().min(1, '请输入内容').max(ARTICLE_MAX_CONTENT_LEN),
})

type ArticleScheme = z.infer<typeof articleScheme>

export interface ReplyBoxProps {
  /* articleID: string */
  replyToArticle: Article | null
  isEditting?: boolean
  edittingArticle?: Article | null
  onSuccess?: (
    data: ResponseData<ArticleSubmitResponse>,
    type?: 'edit' | 'reply'
  ) => void
  onRemoveReply?: () => void
}

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

const ReplyBox: React.FC<ReplyBoxProps> = ({
  replyToArticle,
  isEditting,
  edittingArticle,
  onSuccess,
  onRemoveReply,
}) => {
  const [loading, setLoading] = useState(false)
  const [replyBoxHeight, setReplyBoxHeight] = useState(REPLY_BOX_INITIAL_HEIGHT)
  const [isActive, setIsActive] = useState(false)
  const [isPreview, setPreview] = useState(false)
  const [markdownMode, setMarkdownMode] = useState(false)
  const [updateRef, setUpdateRef] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const tiptapRef = useRef<TipTapRef | null>(null)

  const replyBoxRef = useRef<ReplyBoxData>({
    ...defaultBoxRef,
  })

  const targetInputEl: HTMLElement | null = useMemo(() => {
    let targetEl: HTMLElement
    if (markdownMode) {
      if (!textareaRef.current) return null
      targetEl = textareaRef.current
    } else {
      if (!tiptapRef.current?.element) return null
      targetEl = tiptapRef.current.element
    }

    return targetEl
  }, [markdownMode, updateRef])

  const reset = () => {
    setLoading(false)
    setReplyBoxHeight(REPLY_BOX_INITIAL_HEIGHT)
    setPreview(false)
  }

  const targetArticle = useMemo(
    () => (isEditting ? edittingArticle : replyToArticle),
    [isEditting, replyToArticle, edittingArticle]
  )

  /* console.log('isEditting: ', isEditting) */
  /* console.log('edittingArticle: ', edittingArticle) */

  const form = useForm<ArticleScheme>({
    resolver: zodResolver(articleScheme),
    defaultValues: {
      content: '',
    },
  })

  /* const isReplyToRoot = () => replyToArticle && replyToArticle.replyToId == '0' */

  const onSubmit = useCallback(
    async ({ content }: ArticleScheme) => {
      /* console.log('values: ', values) */
      try {
        setLoading(true)

        let resp: ResponseData<ArticleSubmitResponse>
        if (isEditting) {
          if (!edittingArticle || !edittingArticle.id)
            throw new Error('reply to aritcle id is required')

          resp = await updateReply(
            edittingArticle.id,
            content,
            edittingArticle.replyToId
          )
        } else {
          if (!replyToArticle || !replyToArticle.id)
            throw new Error('reply to aritcle id is required')

          resp = await submitReply(replyToArticle.id, content)
        }

        /* const data = await submitReply(replyToArticle.id, content) */
        if (!resp.code) {
          /* toast.info('提交成功') */
          reset()
          form.reset({ content: '' })

          if (onSuccess && typeof onSuccess == 'function') {
            onSuccess(resp, isEditting ? 'edit' : 'reply')
          }
        }
      } catch (err) {
        console.error('submit reply error: ', err)
      } finally {
        setLoading(false)
      }
    },
    [replyToArticle, isEditting, edittingArticle, form, onSuccess]
  )

  const onMouseMove = useCallback((e: globalThis.MouseEvent) => {
    const currData = replyBoxRef.current

    e.preventDefault()
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
    const currData = replyBoxRef.current
    e.preventDefault()
    currData.isAdjusting = false

    /* console.log('mouseup: ', e) */
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

  const createSetupForm = (isMarkdownMode: boolean) => {
    return () => {
      /* console.log('onclick, markdown mode: ', isMarkdownMode) */
      setTimeout(() => {
        if (isMarkdownMode) {
          if (textareaRef.current) {
            textareaRef.current.focus()
          }
        } else {
          if (tiptapRef.current?.editor) {
            /* console.log('clicked set focus !', tiptapRef.current) */
            tiptapRef.current.editor.commands.focus()
          }
        }
      }, 100)
    }
  }

  if (!replyBoxRef.current.handleReplyClick) {
    replyBoxRef.current.handleReplyClick = createSetupForm(markdownMode)
  }

  if (!replyBoxRef.current.handleEditClick) {
    replyBoxRef.current.handleEditClick = createSetupForm(markdownMode)
  }

  useEffect(() => {
    /* console.log('replyBoxHeight: ', targetInputEl) */
    if (!targetInputEl) return

    /* console.log('replyBoxHeight: ', replyBoxHeight) */

    if (isActive) {
      if (replyBoxHeight < 80) {
        targetInputEl.classList.add('duration-200', 'transition-all')
        setReplyBoxHeight(80)
        setTimeout(() => {
          if (targetInputEl)
            targetInputEl.classList.remove('duration-200', 'transition-all')
        }, 200)
      }
    } else {
      form.clearErrors('content')
      if (replyBoxHeight > REPLY_BOX_INITIAL_HEIGHT) {
        targetInputEl.classList.add('duration-200', 'transition-all')
        setReplyBoxHeight(REPLY_BOX_INITIAL_HEIGHT)
        setTimeout(() => {
          if (targetInputEl)
            targetInputEl.classList.remove('duration-200', 'transition-all')
        }, 200)
      }
    }
  }, [isActive, replyBoxHeight, targetInputEl, form])

  useEffect(() => {
    /* console.log('editting: ', isEditting) */
    form.reset({
      content: isEditting && edittingArticle ? edittingArticle.content : '',
    })
  }, [isEditting, edittingArticle, form])

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
    setUpdateRef(true)
  }, [])

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-[800px] -mx-2 sticky bottom-0 bg-white px-3 pb-3 rounded-lg border-[1px]"
        style={{
          boxShadow:
            '0 0 15px -3px rgb(0 0 0 / 0.1), 0 0 6px -4px rgb(0 0 0 / 0.1)',
        }}
        onKeyUp={(e) => {
          if (e.ctrlKey && e.key == 'Enter') {
            toSync(form.handleSubmit(onSubmit))()
          }
        }}
      >
        <div
          className="pt-3 cursor-ns-resize"
          onMouseDown={(e) => {
            const currData = replyBoxRef.current
            e.preventDefault()

            if (targetInputEl) currData.startHeight = targetInputEl.offsetHeight

            currData.isAdjusting = true
            currData.startY = e.pageY

            if (currData.handleMouseMove) {
              window.removeEventListener('mousemove', currData.handleMouseMove)
              window.addEventListener('mousemove', currData.handleMouseMove)
            }
          }}
        ></div>
        {targetArticle && !targetArticle.asMainArticle && (
          <div className="flex items-center justify-between bg-gray-100 rounded-sm py-1 px-2 mb-2 text-gray-500 text-sm">
            <span>
              {targetArticle.deleted ? (
                <i className="text-gray-500 text-sm">&lt;已删除&gt;</i>
              ) : (
                <span>
                  {targetArticle.authorName}:{' '}
                  <span>{summryText(md2text(targetArticle.content), 80)}</span>
                </span>
              )}
            </span>
            {!isPreview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  if (onRemoveReply && typeof onRemoveReply == 'function')
                    onRemoveReply()
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
                    onChange={field.onChange}
                    value={escapeHtml(field.value)}
                    hideBubble={markdownMode}
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
                  dangerouslySetInnerHTML={{ __html: renderMD(field.value) }}
                ></div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {isActive && (
          <div className="flex justify-between mt-1 items-center">
            <div>
              {!isPreview && (
                <>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setIsActive(false)}
                    title="收起"
                    className="h-[24px] text-gray-500 px-0 align-middle"
                  >
                    <ArrowDownToLineIcon size={18} /> 收起
                  </Button>
                  <Button
                    variant={markdownMode ? 'default' : 'ghost'}
                    size="icon"
                    onClick={onMarkdownModeClick}
                    title="Markdown模式"
                    className="mx-2 w-8 h-[24px] align-middle"
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
                className="mt-2 ml-2"
                size="sm"
              >
                {loading ? <BLoader /> : '提交'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Form>
  )
}

export default ReplyBox
