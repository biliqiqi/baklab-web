import { submitReply } from '@/api/article'
import { ARTICLE_MAX_CONTENT_LEN, EV_ON_REPLY_CLICK } from '@/constants'
import { toSync } from '@/lib/fire-and-forget'
import { bus } from '@/lib/utils'
import { z } from '@/lib/zod-custom'
import { ArticleSubmitResponse, ResponseData } from '@/types/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import BLoader from './base/BLoader'
import { Button } from './ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form'
import { Textarea } from './ui/textarea'

const articleScheme = z.object({
  content: z.string().trim().min(1, '请输入内容').max(ARTICLE_MAX_CONTENT_LEN),
})

type ArticleScheme = z.infer<typeof articleScheme>

interface ReplyBoxProps {
  articleID: string
  onSuccess?: (data: ResponseData<ArticleSubmitResponse>) => void
}

interface ReplyBoxData {
  startHeight: number
  startY: number
  isAdjusting: boolean
  handleMouseMove?: (e: MouseEvent) => void
  handleMouseUp?: (e: MouseEvent) => void
}

const REPLY_BOX_MIN_HEIGHT = 80

const ReplyBox: React.FC<ReplyBoxProps> = ({ articleID, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [replyBoxHeight, setReplyBoxHeight] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const replyBoxRef = useRef<ReplyBoxData>({
    startHeight: 80,
    startY: 0,
    isAdjusting: false,
  })

  const form = useForm<ArticleScheme>({
    resolver: zodResolver(articleScheme),
    defaultValues: {
      content: '',
    },
  })

  const onSubmit = async ({ content }: ArticleScheme) => {
    /* console.log('values: ', values) */
    try {
      setLoading(true)
      if (!articleID) throw new Error('aritcle id is required')

      const data = await submitReply(articleID, content)
      if (!data.code) {
        /* toast.info('提交成功') */
        form.reset({ content: '' })
        if (onSuccess && typeof onSuccess == 'function') {
          onSuccess(data)
        }
      }
    } catch (err) {
      console.error('submit reply error: ', err)
    } finally {
      setLoading(false)
    }
  }

  const onReplyClick = () => {
    setTimeout(() => {
      form.setFocus('content', { shouldSelect: true })
    }, 0)
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

  replyBoxRef.current.handleMouseUp = onMouseUp

  useEffect(() => {
    const currData = replyBoxRef.current

    bus.off(EV_ON_REPLY_CLICK, onReplyClick)
    bus.on(EV_ON_REPLY_CLICK, onReplyClick)

    /* console.log('textarea ref: ', textareaRef.current) */
    if (textareaRef.current) {
      /* console.log(
       *   'textarea ref offsetHeight: ',
       *   textareaRef.current.offsetHeight
       * ) */
      setReplyBoxHeight(textareaRef.current.offsetHeight)
      currData.startHeight = textareaRef.current.offsetHeight
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
    }
  }, [form])

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-[800px] mx-auto sticky bottom-4 bg-white px-3 pb-3 rounded-lg border-[1px]"
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

            {
              /* console.log('mousedown: ', e)
            console.log('curr data: ', currData) */
            }

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

        <div>
          <Button
            type="submit"
            disabled={loading}
            className="mt-2 mr-2"
            size="sm"
          >
            {loading ? <BLoader /> : '提交'}
          </Button>
          <Button
            variant="outline"
            disabled={loading}
            className="mt-2"
            size="sm"
          >
            预览
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default ReplyBox
