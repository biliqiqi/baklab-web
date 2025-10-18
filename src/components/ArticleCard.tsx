import {
  HistoryIcon,
  LockIcon,
  LockOpenIcon,
  PencilIcon,
  SquareArrowOutUpRightIcon,
  Trash2Icon,
} from 'lucide-react'
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
import {
  bus,
  cn,
  extractDomain,
  highlightElement,
  md2text,
  noop,
  renderMD,
  scrollToElement,
} from '@/lib/utils'

import {
  deleteArticle,
  getArticleHistory,
  toggleLockArticle,
} from '@/api/article'
import { EV_ON_EDIT_CLICK, EV_ON_REPLY_CLICK } from '@/constants/constants'
import {
  useAlertDialogStore,
  useArticleHistoryStore,
  useAuthedUserStore,
} from '@/state/global'
import {
  ARTICLE_LOCK_ACTION,
  Article,
  ArticleAction,
  ArticleCardType,
} from '@/types/types'

import ArticleControls from './ArticleControls'
import ModerationForm, { ReasonSchema } from './ModerationForm'
import BAvatar from './base/BAvatar'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

interface ArticleCardProps extends HTMLAttributes<HTMLDivElement> {
  article: Article
  replyBox?: boolean
  ctype?: ArticleCardType
  onSuccess?: (a: ArticleAction) => void
  isTop?: boolean
  previewMode?: boolean
}

const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  ctype = 'item',
  onSuccess = noop,
  isTop = false,
  previewMode = false,
  ...props
}) => {
  const [alertOpen, setAlertOpen] = useState(false)

  const parent = article.replyToArticle

  /* const { siteFrontId } = useParams() */

  const authStore = useAuthedUserStore()
  const permit = useAuthedUserStore((state) => state.permit)
  const articleHistory = useArticleHistoryStore()
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

  const onShowHistoryClick = useCallback(async () => {
    try {
      articleHistory.updateState({
        showDialog: true,
        article: article,
        history: [],
      })

      const { code, data } = await getArticleHistory(article.id, {
        siteFrontId: article.siteFrontId,
      })
      if (!code && data.list) {
        articleHistory.updateState({
          showDialog: true,
          article: article,
          history: data.list,
        })

        onSuccess('show_history')
      }
    } catch (err) {
      console.error('toggle subscribe article failed: ', err)
    }
  }, [article, onSuccess, articleHistory])

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
    <div id={'comment' + article.id} {...props}>
      <div className="p-3">
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
                <Link
                  to={`/z/${article.replyRootArticleSiteFrontId}/articles/${article.replyRootArticleId}`}
                >
                  {article.displayTitle}
                </Link>
              )}

              {article.link && (
                <span className="text-gray-500 text-base font-normal">
                  &nbsp; (
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
        <div className="flex flex-wrap items-center mb-4 text-sm text-gray-500">
          {article.deleted && !authStore.permit('article', 'delete_others') ? (
            <span>{t('unknowUser')}</span>
          ) : (
            <>
              <Link to={`/users/${article.authorName}`}>
                <BAvatar username={article.authorName} size={24} showUsername />
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
            {timeAgo(article.createdAt)}
          </span>
          {article.status === 'pending' && (
            <>
              &nbsp;·&nbsp;
              <Badge variant="outline" className="text-yellow-600 font-normal">
                审核中
              </Badge>
            </>
          )}
          {((isMyself && permit('article', 'edit_mine')) ||
            permit('article', 'edit_others')) &&
            !previewMode &&
            !article.hasReviewing &&
            article.status == 'published' &&
            (!article.locked || permit('site', 'manage')) && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="mx-1"
                onClick={onEditClick}
                title={t('edit')}
              >
                <Link
                  to={`/z/${article.siteFrontId}/articles/${article.id}/edit`}
                >
                  <PencilIcon size={14} className="inline-block mr-1" />
                </Link>
              </Button>
            )}
          {((isMyself && permit('article', 'delete_mine')) ||
            permit('article', 'delete_others')) &&
            !previewMode &&
            (!article.locked || permit('site', 'manage')) && (
              <Button
                variant="ghost"
                size="sm"
                className="mx-1"
                onClick={onDelClick}
                title={t('delete')}
              >
                <Trash2Icon size={14} />
              </Button>
            )}
          {permit('article', 'lock') && !previewMode && (
            <Button
              variant={'ghost'}
              size={'sm'}
              className={cn('mx-1', article.locked && 'text-primary')}
              title={article.locked ? t('unlock') : t('lock')}
              onClick={onToggleLockClick}
            >
              {article.locked ? (
                <LockIcon size={14} />
              ) : (
                <LockOpenIcon size={14} />
              )}
            </Button>
          )}
          {permit('article', 'manage') && !previewMode && (
            <Button
              variant={'ghost'}
              size={'sm'}
              className="mx-1"
              title={t('editHistory')}
              onClick={onShowHistoryClick}
            >
              <HistoryIcon size={14} />
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
                  scrollToElement(parentCommentEl, () => {
                    highlightElement(parentCommentEl, 'b-highlight')
                  })
                }
              }}
            >
              {parent.deleted ? (
                <i className="text-gray-500 text-sm">&lt;{t('deleted')}&gt;</i>
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
              className="b-article-content mb-4"
            ></div>
          )}
        </div>
        {!article.deleted && !previewMode && article.status !== 'pending' && (
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

export const ArticleCardSkeleton = () => {
  return (
    <div className="p-3">
      <div className="flex flex-wrap items-center mb-4 text-sm text-gray-500">
        <Skeleton className="w-[40px] h-[24px] rounded-full mr-2" />
        <Skeleton className="w-[100px] h-[18px]" />
      </div>
      <div>
        <Skeleton className="w-full h-[200px] mb-4" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="w-[60px] h-[32px]" />
        <Skeleton className="w-[60px] h-[32px]" />
        <Skeleton className="w-[60px] h-[32px]" />
      </div>
    </div>
  )
}

export default ArticleCard
