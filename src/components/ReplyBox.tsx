import { zodResolver } from '@hookform/resolvers/zod'
import { XIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { toSync } from '@/lib/fire-and-forget'
import { bus } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { submitReply, updateReply } from '@/api/article'
import {
  ARTICLE_MAX_CONTENT_LEN,
  EV_ON_EDIT_CLICK,
  EV_ON_REPLY_CLICK,
} from '@/constants/constants'
import { Article, ArticleSubmitResponse, ResponseData } from '@/types/types'

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
  onSuccess?: (data: ResponseData<ArticleSubmitResponse>) => void
  onRemoveReply?: () => void
}

interface ReplyBoxData {
  startHeight: number
  startY: number
  isAdjusting: boolean
  handleMouseMove?: (e: MouseEvent) => void
  handleMouseUp?: (e: MouseEvent) => void
  handleReplyClick?: (x: Article) => void
  handleEditClick?: (x: Article) => void
}

const REPLY_BOX_MIN_HEIGHT = 80

const ReplyBox: React.FC<ReplyBoxProps> = ({
  replyToArticle,
  isEditting,
  edittingArticle,
  onSuccess,
  onRemoveReply,
}) => {
  const [loading, setLoading] = useState(false)
  const [replyBoxHeight, setReplyBoxHeight] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const replyBoxRef = useRef<ReplyBoxData>({
    startHeight: 80,
    startY: 0,
    isAdjusting: false,
  })

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
          form.reset({ content: '' })

          if (onSuccess && typeof onSuccess == 'function') {
            onSuccess(resp)
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

  const setupForm = useCallback(() => {
    setTimeout(() => {
      if (textareaRef.current) {
        /* console.log('clicked set focus !', textareaRef.current) */
        textareaRef.current.focus()
      }
    }, 100)
  }, [textareaRef])

  if (!replyBoxRef.current.handleReplyClick) {
    replyBoxRef.current.handleReplyClick = setupForm
  }

  if (!replyBoxRef.current.handleEditClick) {
    replyBoxRef.current.handleEditClick = setupForm
  }

  const onMouseMove = useCallback((e: MouseEvent) => {
    const currData = replyBoxRef.current

    e.preventDefault()
    /* console.log('is adjusting: ', currData.isAdjusting) */
    /* console.log('start Y: ', currData.startY) */
    if (!currData.isAdjusting) return
    /* console.log('mousemove: ', e) */
    const distance = currData.startY - e.pageY
    /* console.log('distance: ', distance) */

    let newHeight = currData.startHeight + distance
    if (newHeight < REPLY_BOX_MIN_HEIGHT) {
      newHeight = REPLY_BOX_MIN_HEIGHT
    }
    setReplyBoxHeight(newHeight)
  }, [])

  if (!replyBoxRef.current.handleMouseMove)
    replyBoxRef.current.handleMouseMove = onMouseMove

  const onMouseUp = useCallback((e: MouseEvent) => {
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

  useEffect(() => {
    /* console.log('editting: ', isEditting) */
    form.reset({
      content: isEditting && edittingArticle ? edittingArticle.content : '',
    })
  }, [isEditting, edittingArticle])

  useEffect(() => {
    const currData = replyBoxRef.current

    /* console.log('textarea ref: ', textareaRef.current) */
    if (textareaRef.current) {
      setReplyBoxHeight(textareaRef.current.offsetHeight)
      currData.startHeight = textareaRef.current.offsetHeight
    }

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

            if (textareaRef.current)
              currData.startHeight = textareaRef.current.offsetHeight

            currData.isAdjusting = true
            currData.startY = e.pageY

            if (currData.handleMouseMove) {
              window.removeEventListener('mousemove', currData.handleMouseMove)
              window.addEventListener('mousemove', currData.handleMouseMove)
            }
          }}
        ></div>
        {replyToArticle && !replyToArticle.asMainArticle && (
          <div className="flex items-center justify-between bg-gray-100 rounded-sm py-1 px-2 mb-2 text-gray-500 text-sm">
            <span>
              {replyToArticle.authorName}: {replyToArticle.summary}
              {replyToArticle.summary != replyToArticle.content && '...'}
            </span>
            {!isEditting && (
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
                <Textarea
                  {...field}
                  state={fieldState.invalid ? 'invalid' : 'default'}
                  ref={textareaRef}
                  style={{
                    height: replyBoxHeight + 'px',
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between mt-1 items-center">
          <div>
            <span className="text-gray-500 text-sm">
              <kbd>Ctrl+Enter</kbd> 提交
            </span>
          </div>
          <div>
            <Button
              variant="outline"
              disabled={loading}
              className="mt-2"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
              }}
            >
              预览
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
      </form>
    </Form>
  )
}

export default ReplyBox
