import { zodResolver } from '@hookform/resolvers/zod'
import { PencilIcon, SquareArrowOutUpRightIcon, Trash2Icon } from 'lucide-react'
import {
  HTMLAttributes,
  MouseEvent,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { timeAgo, timeFmt } from '@/lib/dayjs-custom'
import { bus, cn, extractDomain, md2text, noop, renderMD } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { deleteArticle } from '@/api/article'
import { EV_ON_EDIT_CLICK, EV_ON_REPLY_CLICK } from '@/constants/constants'
import { useAlertDialogStore, useAuthedUserStore } from '@/state/global'
import { Article, ArticleAction, ArticleCardType } from '@/types/types'

import ArticleControls from './ArticleControls'
import BAvatar from './base/BAvatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form'
import { Input } from './ui/input'

interface ArticleCardProps extends HTMLAttributes<HTMLDivElement> {
  article: Article
  replyBox?: boolean
  ctype?: ArticleCardType
  onSuccess?: (a: ArticleAction) => void
  isTop?: boolean
}

const delReasonScheme = z.object({
  reason: z.string().min(1, '请输入删除原因').max(500, '不要超过500各字符'),
})

type DelReasonScheme = z.infer<typeof delReasonScheme>

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
  ctype = 'item',
  onSuccess = noop,
  isTop = false,
  ...props
}) => {
  const [alertOpen, setAlertOpen] = useState(false)
  const parent = article.replyToArticle
  const authStore = useAuthedUserStore()
  const permit = useAuthedUserStore((state) => state.permit)

  const navigate = useNavigate()
  const isMyself = useMemo(
    () => authStore.isMySelf(article.authorId),
    [authStore, article]
  )

  const alertDialog = useAlertDialogStore()

  const form = useForm<DelReasonScheme>({
    resolver: zodResolver(delReasonScheme),
    defaultValues: {
      reason: '',
    },
  })

  const onEditClick = useCallback(
    (e: MouseEvent) => {
      if (!article.asMainArticle) {
        e.preventDefault()
        bus.emit(EV_ON_EDIT_CLICK, article)
      }
    },
    [article]
  )

  const onDelClick = useCallback(
    async (e: MouseEvent) => {
      try {
        e.preventDefault()
        if (!authStore.isMySelf(article.authorId)) {
          setAlertOpen(true)
          return
        }

        const confirmed = await alertDialog.confirm(
          '确认',
          authStore.permit('article', 'delete_others')
            ? '确定删除？'
            : '确定删除？删除后无法撤销',
          'danger'
        )

        /* console.log('confirmed: ', confirmed) */
        if (confirmed) {
          const resp = await deleteArticle(article.id, authStore.username)
          if (!resp.code) {
            /* navigate(-1) */
            onSuccess('delete')
          }
        }
      } catch (err) {
        console.error('delete article failed: ', err)
      }
    },
    [article, navigate]
  )

  const onDelConfirmCancel = useCallback(() => {
    form.reset({ reason: '' })
    setAlertOpen(false)
  }, [form])

  const onDelConfirmClick = useCallback(
    async ({ reason }: DelReasonScheme) => {
      try {
        const resp = await deleteArticle(article.id, authStore.username, reason)
        if (!resp.code) {
          /* navigate(-1) */
          form.reset({ reason: '' })
          setAlertOpen(false)
          onSuccess('delete')
        }
      } catch (err) {
        console.error('confirm delete error: ', err)
      }
    },
    [article, navigate, form]
  )

  /* console.log('isMyself', isMyself)
   * console.log(
   *   "permit('article', 'delete_mine')",
   *   permit('article', 'delete_mine')
   * ) */

  return (
    <div id={'comment' + article.id} {...props}>
      <Card className="p-3 my-2 mb-3">
        {article.asMainArticle && (
          <>
            <h1
              className={cn(
                'mb-2 font-bold text-lg',
                article.replyToId != '0' &&
                  'bg-gray-100 py-1 px-2 text-gray-500'
              )}
            >
              {article.replyToId == '0' ? (
                article.displayTitle
              ) : (
                <Link to={'/articles/' + article.replyRootArticleId}>
                  {article.displayTitle}
                </Link>
              )}

              {article.link && (
                <span className="text-gray-500 text-base font-normal">
                  &nbsp; (来源&nbsp;
                  <a
                    href={article.link}
                    target="_blank"
                    title={article.link}
                    className="break-all"
                  >
                    <SquareArrowOutUpRightIcon size={14} className="inline" />
                    &nbsp;
                    {extractDomain(article.link)}...
                  </a>
                  )
                </span>
              )}
            </h1>
          </>
        )}
        <div className="flex items-center mb-4 text-sm text-gray-500">
          {article.deleted && !authStore.permit('article', 'delete_others') ? (
            <span>未知用户</span>
          ) : (
            <Link to={'/users/' + article.authorName}>
              <BAvatar username={article.authorName} size={24} />{' '}
              {article.authorName}
            </Link>
          )}
          &nbsp;发布于&nbsp;
          <span title={timeFmt(article.createdAt, 'YYYY年M月D日 H时m分s秒')}>
            {timeAgo(article.createdAt)}
          </span>
          {((isMyself && permit('article', 'edit_mine')) ||
            permit('article', 'edit_others')) && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="mx-1"
              onClick={onEditClick}
              title="编辑"
            >
              <Link to={`/articles/${article.id}/edit`}>
                <PencilIcon size={14} className="inline-block mr-1" />
              </Link>
            </Button>
          )}
          {((isMyself && permit('article', 'delete_mine')) ||
            permit('article', 'delete_others')) && (
            <Button
              variant="ghost"
              size="sm"
              className="mx-1"
              onClick={onDelClick}
              title="删除"
            >
              <Trash2Icon size={14} />
            </Button>
          )}
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
              {parent.deleted ? (
                <i className="text-gray-500 text-sm">&lt;已删除&gt;</i>
              ) : (
                <span>
                  {parent.authorName}: {md2text(parent.summary)} ...
                </span>
              )}
            </div>
          )}
          {article.deleted ? (
            <>
              <i className="text-gray-500 text-sm">&lt;已删除&gt;</i>
              {authStore.permit('article', 'delete_others') && (
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderMD(article.content),
                  }}
                  className="b-article-content mb-4"
                ></div>
              )}
            </>
          ) : (
            <div
              dangerouslySetInnerHTML={{ __html: renderMD(article.content) }}
              className="b-article-content mb-4"
            ></div>
          )}
        </div>
        {!article.deleted && (
          <ArticleControls
            isTopArticle={isTop}
            article={article}
            ctype={ctype}
            onCommentClick={(e) => {
              e.preventDefault()
              bus.emit(EV_ON_REPLY_CLICK, article)
            }}
            onSuccess={onSuccess}
          />
        )}
      </Card>

      <AlertDialog
        defaultOpen={false}
        open={alertOpen}
        onOpenChange={setAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认</AlertDialogTitle>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onDelConfirmClick)}
                className="py-4"
              >
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="请输入删除原因"
                          state={fieldState.invalid ? 'invalid' : 'default'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                ></FormField>
              </form>
            </Form>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onDelConfirmCancel}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={form.handleSubmit(onDelConfirmClick)}
              className="bg-red-600 hover:bg-red-500"
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ArticleCard
