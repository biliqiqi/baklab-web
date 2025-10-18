import { PenIcon } from 'lucide-react'
import {
  HTMLAttributes,
  MouseEvent,
  forwardRef,
  useCallback,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { timeAgo, timeFmt } from '@/lib/dayjs-custom'
import {
  bus,
  cn,
  highlightElement,
  md2text,
  noop,
  renderMD,
  scrollToElement,
  summryText,
} from '@/lib/utils'

import { deleteArticle, toggleLockArticle } from '@/api/article'
import {
  EV_ON_EDIT_CLICK,
  EV_ON_REPLY_CLICK,
  NAV_HEIGHT,
} from '@/constants/constants'
import { useAlertDialogStore, useAuthedUserStore } from '@/state/global'
import { ARTICLE_LOCK_ACTION, Article, ArticleAction } from '@/types/types'

import ChatControls from './ChatControls'
import ModerationForm, { ReasonSchema } from './ModerationForm'
import BAvatar from './base/BAvatar'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { Skeleton } from './ui/skeleton'

interface ChatCardProps extends HTMLAttributes<HTMLDivElement> {
  article: Article
  onSuccess?: (a: ArticleAction, id?: string) => void
  isTop?: boolean
  previewMode?: boolean
}

const ChatCard = forwardRef<HTMLDivElement, ChatCardProps>(
  (
    {
      article,
      onSuccess = noop,
      isTop = false,
      previewMode = false,
      className,
      ...props
    },
    ref
  ) => {
    const [alertOpen, setAlertOpen] = useState(false)

    const parent = article.replyToArticle

    /* const { siteFrontId } = useParams() */

    const authStore = useAuthedUserStore()
    /* const permit = useAuthedUserStore((state) => state.permit) */
    const { t } = useTranslation()

    /* const isMyself = useMemo(
     *   () => authStore.isMySelf(article.authorId),
     *   [authStore, article]
     * ) */

    const alertDialog = useAlertDialogStore()

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
            t('confirm'),
            authStore.permit('article', 'delete_others')
              ? t('deleteCofirm')
              : t('irrevocableDeleteConfirm'),
            'danger'
          )

          /* console.log('confirmed: ', confirmed) */
          if (confirmed) {
            const resp = await deleteArticle(
              article.id,
              '',
              '',
              authStore.username,
              {
                siteFrontId: article.siteFrontId,
              }
            )
            if (!resp.code) {
              /* navigate(-1) */
              onSuccess('delete', article.id)
            }
          }
        } catch (err) {
          console.error('delete article failed: ', err)
        }
      },
      [article, alertDialog, authStore, onSuccess, t]
    )

    const onToggleLockClick = useCallback(async () => {
      const confirmed = await alertDialog.confirm(
        t('confirm'),
        article.locked ? t('unlockPostConfirm') : t('lockPostConfirm')
      )
      if (confirmed) {
        const { code } = await toggleLockArticle(
          article.id,
          article.displayTitle,
          article.locked
            ? ARTICLE_LOCK_ACTION.Unlock
            : ARTICLE_LOCK_ACTION.Lock,
          {
            siteFrontId: article.siteFrontId,
          }
        )
        if (!code) {
          onSuccess('lock')
        }
      }
    }, [alertDialog, article, onSuccess, t])

    const onDelConfirmCancel = useCallback(() => {
      setAlertOpen(false)
    }, [])

    const onDelConfirm = useCallback(
      async ({ reason, extra }: ReasonSchema) => {
        try {
          const resp = await deleteArticle(
            article.id,
            article.displayTitle,
            `${reason}\n\n${extra}`,
            authStore.username,
            {
              siteFrontId: article.siteFrontId,
            }
          )
          if (!resp.code) {
            setAlertOpen(false)
            onSuccess('delete', article.id)
          }
        } catch (err) {
          console.error('confirm delete error: ', err)
        }
      },
      [article, onSuccess, authStore.username]
    )

    return (
      <div
        id={'message' + article.id}
        className={cn(
          'b-chat-card relative flex items-start px-2 mb-4',
          className
        )}
        {...props}
        ref={ref}
      >
        <div className="sticky flex pr-2" style={{ top: `${NAV_HEIGHT}px` }}>
          {article.deleted && !authStore.permit('article', 'delete_others') ? (
            <span>{t('unknowUser')}</span>
          ) : (
            <Link to={`/users/${article.authorName}`}>
              <BAvatar
                username={article.authorName}
                size={40}
                showUsername={false}
              />
            </Link>
          )}
        </div>
        <div className="max-w-[80%] flex flex-col items-start">
          <Card
            className="b-chat-card__card max-w-full flex-grow-0 relative px-3 py-2"
            tabIndex={0}
          >
            <div className="flex flex-wrap items-center text-sm text-text-secondary mb-2">
              {article.deleted &&
              !authStore.permit('article', 'delete_others') ? (
                <span>{t('unknowUser')}</span>
              ) : (
                <>
                  <Link
                    to={`/users/${article.authorName}`}
                    className="font-bold"
                  >
                    {article.authorName}
                  </Link>
                  {article.showAuthorRoleName && (
                    <Badge
                      variant={'secondary'}
                      className="ml-2 font-normal text-gray-500 whitespace-nowrap"
                    >
                      {article.authorRoleName}
                    </Badge>
                  )}
                </>
              )}
              &nbsp;·&nbsp;
              <span title={timeFmt(article.createdAt, 'YYYY-M-D H:m:s')}>
                {timeAgo(article.createdAt, 'YYYY-M-D H:m')}
              </span>
              {article.updatedAt != article.createdAt && (
                <span
                  title={t('editAt', {
                    time: timeFmt(article.updatedAt, 'YYYY-M-D H:m:s'),
                  })}
                >
                  &nbsp;&nbsp;
                  <PenIcon className="inline-block" size={14} />
                </span>
              )}
            </div>

            <div>
              {parent && (
                <div
                  className="bg-gray-100 rounded-sm py-1 px-2 text-gray-500 text-sm cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault()
                    const parentCommentEl = document.getElementById(
                      'message' + parent.id
                    )

                    if (parentCommentEl) {
                      scrollToElement(parentCommentEl, () => {
                        highlightElement(parentCommentEl, 'b-chat-highlight')
                      })
                    }
                  }}
                >
                  {parent.deleted ? (
                    <i className="text-gray-500 text-sm">
                      &lt;{t('deleted')}&gt;
                    </i>
                  ) : (
                    <span>
                      {parent.authorName}:{' '}
                      {summryText(md2text(parent.content), 100)}
                    </span>
                  )}
                </div>
              )}
              {article.deleted ? (
                <>
                  <i className="text-gray-500 text-sm">
                    &lt;{t('deleted')}&gt;
                  </i>
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
                  dangerouslySetInnerHTML={{
                    __html: renderMD(article.content),
                  }}
                  className="b-article-content mb-2"
                ></div>
              )}
            </div>
            {!article.deleted && !previewMode && (
              <ChatControls
                isTopArticle={isTop}
                article={article}
                onCommentClick={(e) => {
                  e.preventDefault()
                  bus.emit(EV_ON_REPLY_CLICK, article)
                }}
                onEditClick={onEditClick}
                onDeleteClick={onDelClick}
                onToggleLockClick={onToggleLockClick}
                onSuccess={onSuccess}
                className="absolute left-[calc(100%+theme(space.1))] max-md:left-auto max-md:right-[theme(space.1)] bottom-0 max-md:-bottom-[46px] z-50"
                tabIndex={0}
              />
            )}
          </Card>
        </div>

        <AlertDialog
          defaultOpen={false}
          open={alertOpen}
          onOpenChange={setAlertOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('confirm')}</AlertDialogTitle>
            </AlertDialogHeader>
            <ModerationForm
              reasonLable={t('deleteReason')}
              destructive
              onSubmit={onDelConfirm}
              onCancel={onDelConfirmCancel}
            />
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }
)

export const ChatCardSkeleton = () => {
  const placeholderText = 'placeholder '.repeat(20)

  return (
    <div className="b-chat-card relative flex items-start px-2 mb-4">
      <div className="sticky flex pr-2" style={{ top: `${NAV_HEIGHT}px` }}>
        <Skeleton className="w-[40px] h-[40px] rounded-full" />
      </div>
      <div className="max-w-[80%] flex flex-col items-start">
        <Card className="b-chat-card__card max-w-full flex-grow-0 relative px-3 py-2">
          <div className="flex flex-wrap items-center text-sm text-text-secondary mb-2">
            <Skeleton className="w-[120px] h-[18px]" />
          </div>
          <div className="b-article-content mb-2">
            <Skeleton>
              <p className="opacity-0">{placeholderText}</p>
            </Skeleton>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default ChatCard
