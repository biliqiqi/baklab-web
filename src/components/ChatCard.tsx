import { SquareArrowOutUpRightIcon } from 'lucide-react'
import {
  HTMLAttributes,
  MouseEvent,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { timeAgo, timeFmt } from '@/lib/dayjs-custom'
import { bus, cn, extractDomain, md2text, noop, renderMD } from '@/lib/utils'

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

interface ChatCardProps extends HTMLAttributes<HTMLDivElement> {
  article: Article
  onSuccess?: (a: ArticleAction) => void
  isTop?: boolean
  previewMode?: boolean
}

const highlightElement = (element: HTMLElement) => {
  element.classList.add('b-chat-highlight')
  setTimeout(() => {
    element.classList.remove('b-chat-highlight')
  }, 2000)
}

const scrollToElement = (element: HTMLElement) => {
  if (!element) return

  const rectTop = element.getBoundingClientRect().y

  if (rectTop > 0) {
    highlightElement(element)
  } else {
    setTimeout(() => {
      /* location.hash = element.id */
      highlightElement(element)
    }, 500)

    window.scrollTo({
      top: rectTop + window.scrollY - NAV_HEIGHT,
      behavior: 'smooth',
    })
  }
}

const ChatCard: React.FC<ChatCardProps> = ({
  article,
  onSuccess = noop,
  isTop = false,
  previewMode = false,
  className,
  ...props
}) => {
  const [alertOpen, setAlertOpen] = useState(false)

  const parent = article.replyToArticle

  /* const { siteFrontId } = useParams() */

  const authStore = useAuthedUserStore()
  const permit = useAuthedUserStore((state) => state.permit)
  const { t } = useTranslation()

  const isMyself = useMemo(
    () => authStore.isMySelf(article.authorId),
    [authStore, article]
  )

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
            onSuccess('delete')
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
        article.locked ? ARTICLE_LOCK_ACTION.Unlock : ARTICLE_LOCK_ACTION.Lock,
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
          onSuccess('delete')
        }
      } catch (err) {
        console.error('confirm delete error: ', err)
      }
    },
    [article, onSuccess, authStore.username]
  )

  return (
    <div
      id={'comment' + article.id}
      className={cn('b-chat-card flex items-start px-2', className)}
      {...props}
    >
      <div className="flex pt-3 pr-2">
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
        <div className="flex h-[40px] flex-wrap items-center text-sm text-gray-500">
          {article.deleted && !authStore.permit('article', 'delete_others') ? (
            <span>{t('unknowUser')}</span>
          ) : (
            <>
              <Link to={`/users/${article.authorName}`} className="font-bold">
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
        </div>
        <Card
          className="b-chat-card__card flex-grow-0 relative p-3 pb-2 mb-3"
          tabIndex={0}
        >
          {article.asMainArticle && (
            <>
              <h1
                className={cn(
                  'mb-2 font-bold',
                  article.replyToId != '0' &&
                    'bg-gray-100 py-1 px-2 text-gray-500'
                )}
              >
                {article.replyToId == '0' ? (
                  article.displayTitle
                ) : (
                  <Link
                    to={`/${article.replyRootArticleSiteFrontId}/articles/${article.replyRootArticleId}`}
                  >
                    {article.displayTitle}
                  </Link>
                )}

                {article.link && (
                  <span className="text-gray-500 text-base font-normal">
                    &nbsp; ({t('source')}&nbsp;
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
                  <i className="text-gray-500 text-sm">
                    &lt;{t('deleted')}&gt;
                  </i>
                ) : (
                  <span>
                    {parent.authorName}: {md2text(parent.summary)} ...
                  </span>
                )}
              </div>
            )}
            {article.deleted ? (
              <>
                <i className="text-gray-500 text-sm">&lt;{t('deleted')}&gt;</i>
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
              className="absolute left-[calc(100%+theme(space.1))] bottom-2"
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

export default ChatCard
