import { z } from '@/lib/zod-custom'

import { ARTICLE_MAX_CONTENT_LEN } from '@/constants'
import { timeAgo, timeFmt } from '@/lib/dayjs-custom'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form'
import { Textarea } from './ui/textarea'

import { submitReply } from '@/api/article'
import { toSync } from '@/lib/fire-and-forget'
import {
  Article,
  ArticleCardType,
  ArticleSubmitResponse,
  ResponseData,
} from '@/types/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { HTMLAttributes, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import ArticleControls from './ArticleControls'
import BLoader from './base/BLoader'

const articleScheme = z.object({
  content: z.string().trim().min(1, '请输入内容').max(ARTICLE_MAX_CONTENT_LEN),
})

type ArticleScheme = z.infer<typeof articleScheme>

interface ArticleCardProps extends HTMLAttributes<HTMLDivElement> {
  article: Article
  replyBox?: boolean
  type?: ArticleCardType
  onSuccess?: (data: ResponseData<ArticleSubmitResponse>) => void
}

const highlightElement = (element: HTMLElement) => {
  element.classList.add('b-highlight')
  setTimeout(() => {
    element.classList.remove('b-highlight')
  }, 2000)
}

const scrollToElement = (element: HTMLElement) => {
  if (!element) return

  const rectTop = element.getBoundingClientRect().y

  if (rectTop > 0) {
    highlightElement(element)
  } else {
    setTimeout(() => {
      location.hash = element.id
      highlightElement(element)
    }, 500)

    window.scrollTo({
      top: rectTop + window.scrollY,
      behavior: 'smooth',
    })
  }
}

const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onSuccess,
  type = 'item',
  ...props
}) => {
  const [loading, setLoading] = useState(false)

  const isRootArticle = type == 'item' && article.replyToId == '0'
  const [replyBox, setReplyBox] = useState(isRootArticle)

  const form = useForm<ArticleScheme>({
    resolver: zodResolver(articleScheme),
    defaultValues: {
      content: '',
    },
  })

  const articleID = article.id
  const parent = article.replyToArticle

  const onSubmit = async ({ content }: ArticleScheme) => {
    /* console.log('values: ', values) */
    try {
      setLoading(true)
      if (!articleID) throw new Error('aritcle id is required')

      const data = await submitReply(articleID, content)
      if (!data.code) {
        /* toast.info('提交成功') */
        form.reset({ content: '' })
        if (!isRootArticle) {
          setReplyBox(false)
        }
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

  return (
    <div id={'comment' + article.id} {...props}>
      <Card className="p-3 my-2 mb-3">
        {article.title && (
          <h1 className="mb-4 font-bold text-lg">{article.title}</h1>
        )}
        <div className="mb-4 text-sm text-gray-500">
          <Link to={'/users/' + article.authorName}>{article.authorName}</Link>
          &nbsp;发布于&nbsp;
          <span title={timeFmt(article.createdAt, 'YYYY-M-D H:m:s')}>
            {timeAgo(article.createdAt)}
          </span>
        </div>
        <div>
          {parent && (
            <div
              className="bg-gray-100 rounded-sm py-1 px-2 text-gray-500 text-sm cursor-pointer"
              onClick={(e) => {
                e.preventDefault()
                const parentCommentEl = document.getElementById(
                  'comment' + parent.id
                )

                if (parentCommentEl) {
                  scrollToElement(parentCommentEl)
                }
              }}
            >
              {parent.authorName}: {parent.summary}
              {parent.summary != parent.content && '...'}
            </div>
          )}
          <div
            dangerouslySetInnerHTML={{ __html: article.content }}
            className="whitespace-break-spaces mb-4"
          ></div>
        </div>
        <ArticleControls
          article={article}
          type={type}
          onCommentClick={() => {
            setReplyBox(!replyBox)
            if (!replyBox) {
              setTimeout(() => {
                form.setFocus('content', { shouldSelect: true })
              }, 0)
            }
          }}
        />
      </Card>
      {replyBox && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-3 max-w-[800px] mx-auto"
            onKeyUp={(e) => {
              if (e.ctrlKey && e.key == 'Enter') {
                toSync(form.handleSubmit(onSubmit))()
              }
            }}
          >
            <FormField
              control={form.control}
              name="content"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      state={fieldState.invalid ? 'invalid' : 'default'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? <BLoader /> : '提交'}
            </Button>
          </form>
        </Form>
      )}
    </div>
  )
}

export default ArticleCard
