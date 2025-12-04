import {
  CheckIcon,
  EllipsisIcon,
  HistoryIcon,
  LockIcon,
  LockOpenIcon,
  MessageSquare,
  PencilIcon,
  SmileIcon,
  Trash2Icon,
} from 'lucide-react'
import {
  HTMLAttributes,
  MouseEvent,
  MouseEventHandler,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import { cn, noop } from '@/lib/utils'

import {
  acceptAnswer,
  getArticleHistory,
  toggleReactArticle,
} from '@/api/article'
import { ArticleContext } from '@/contexts/ArticleContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { useRem2PxNum } from '@/hooks/use-rem-num'
import { useSiteParams } from '@/hooks/use-site-params'
import {
  useArticleHistoryStore,
  useAuthedUserStore,
  useReactOptionsStore,
} from '@/state/global'
import { Article, ArticleAction } from '@/types/types'

import SiteLink from './base/SiteLink'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

interface ChatControlsProps extends HTMLAttributes<HTMLDivElement> {
  disabled?: boolean
  article: Article
  upVote?: boolean
  downVote?: boolean
  bookmark?: boolean
  author?: boolean
  cornerLink?: boolean
  linkQrCode?: boolean
  notify?: boolean
  comment?: boolean
  history?: boolean
  isTopArticle?: boolean
  onCommentClick?: MouseEventHandler<HTMLButtonElement>
  onEditClick?: MouseEventHandler<HTMLElement>
  onDeleteClick?: MouseEventHandler<HTMLElement>
  onToggleLockClick?: MouseEventHandler<HTMLElement>
  /* onSaveClick?: MouseEventHandler<HTMLButtonElement> */
  /* onVoteUpClick?: MouseEventHandler<HTMLButtonElement>
   * onVoteDownClick?: MouseEventHandler<HTMLButtonElement> */
  onSuccess?: (
    a: ArticleAction,
    id?: string,
    updates?: Partial<Article>
  ) => void
  onReactOptionClick?: (reactId: string) => Promise<void> | void
}

const checkContentForm = (targetArticle: Article, contentForm: string) => {
  return targetArticle.contentForm?.frontId == contentForm
}

const ChatControls: React.FC<ChatControlsProps> = ({
  disabled = false,
  article,
  className,
  comment = true,
  history = false,
  isTopArticle = false,
  onCommentClick = noop,
  onEditClick = noop,
  onDeleteClick = noop,
  onToggleLockClick = noop,
  onSuccess = noop,
  onReactOptionClick,
  ...props
}) => {
  const [showChatMenu, setShowChatMenu] = useState(false)
  const { siteFrontId } = useSiteParams()

  const isRootArticle = useMemo(() => article.replyToId == '0', [article])
  const isPublished = useMemo(() => article.status == 'published', [article])
  const isMobile = useIsMobile()

  const articleHistory = useArticleHistoryStore()
  const checkPermit = useAuthedUserStore((state) => state.permit)
  const isMyself = useAuthedUserStore((state) => state.isMySelf)
  const loginWithDialog = useAuthedUserStore((state) => state.loginWithDialog)
  const isLogined = useAuthedUserStore((state) => state.isLogined)
  const { t } = useTranslation()

  /* console.log('curr article history: ', articleHistory) */

  const articleCtx = useContext(ArticleContext)
  const rem2pxNum = useRem2PxNum()

  const onShowHistoryClick = useCallback(
    async (e: MouseEvent<HTMLElement>) => {
      try {
        e.preventDefault()
        articleHistory.updateState({
          showDialog: true,
          article: article,
          history: [],
        })

        const { code, data } = await getArticleHistory(article.id, {
          siteFrontId,
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
    },
    [article, onSuccess, siteFrontId, articleHistory]
  )

  const onAcceptAnswerClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      const { code } = await acceptAnswer(article.replyToId, article.id)
      if (!code) {
        onSuccess('accept_answer')
      }
    },
    [article, onSuccess]
  )

  const handleCommentClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      try {
        e.preventDefault()

        // Check if user is logged in
        if (!isLogined()) {
          await loginWithDialog()
          return
        }

        onCommentClick(e)
      } catch (err) {
        console.error('toggle vote article failed: ', err)
      }
    },
    [isLogined, loginWithDialog, onCommentClick]
  )

  // Use children render pattern to dynamically check menu items
  const renderMenuItems = useCallback(() => {
    const items = []

    if (
      ((isMyself(article.authorId) && checkPermit('article', 'edit_mine')) ||
        checkPermit('article', 'edit_others')) &&
      !article.hasReviewing &&
      article.status == 'published' &&
      (!article.locked || checkPermit('site', 'manage'))
    ) {
      items.push(
        <DropdownMenuItem
          key="edit"
          className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
          onClick={(e) => {
            setShowChatMenu(false)
            onEditClick(e)
          }}
        >
          <PencilIcon size={20} className="inline-block" /> {t('edit')}
        </DropdownMenuItem>
      )
    }

    if (
      ((isMyself(article.authorId) && checkPermit('article', 'delete_mine')) ||
        checkPermit('article', 'delete_others')) &&
      (!article.locked || checkPermit('site', 'manage'))
    ) {
      items.push(
        <DropdownMenuItem
          key="delete"
          className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0 text-red-500"
          onClick={(e) => {
            setShowChatMenu(false)
            onDeleteClick(e)
          }}
        >
          <Trash2Icon size={20} className="inline-block" />
          {t('delete')}
        </DropdownMenuItem>
      )
    }

    if (checkPermit('article', 'lock')) {
      items.push(
        <DropdownMenuItem
          key="lock"
          className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
          onClick={(e) => {
            setShowChatMenu(false)
            onToggleLockClick(e)
          }}
        >
          {article.locked ? (
            <LockOpenIcon className="inline-block" size={20} />
          ) : (
            <LockIcon className="inline-block" size={20} />
          )}
          {article.locked ? t('unlock') : t('lock')}
        </DropdownMenuItem>
      )
    }

    if (checkPermit('article', 'manage')) {
      items.push(
        <DropdownMenuItem
          key="history"
          className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
          onClick={async (e) => {
            setShowChatMenu(false)
            await onShowHistoryClick(e)
          }}
        >
          <HistoryIcon size={20} className="inline-block" />
          {t('editHistory')}
        </DropdownMenuItem>
      )
    }

    return items
  }, [
    article,
    isMyself,
    checkPermit,
    onEditClick,
    onDeleteClick,
    onToggleLockClick,
    onShowHistoryClick,
    t,
  ])

  const hasMenuOptions = useMemo(() => {
    return renderMenuItems().length > 0
  }, [renderMenuItems])

  const reactOptions = useReactOptionsStore((state) => state.reactOptions)

  const onReactClick = useCallback(
    async (reactId: string) => {
      if (onReactOptionClick) {
        await onReactOptionClick(reactId)
        return
      }

      try {
        if (!isLogined()) {
          await loginWithDialog()
          return
        }

        const resp = await toggleReactArticle(article.id, reactId, {
          siteFrontId: article.siteFrontId,
        })
        if (!resp.code) {
          onSuccess('react')
        }
      } catch (err) {
        console.error('toggle react article failed: ', err)
      }
    },
    [article, onSuccess, isLogined, loginWithDialog, onReactOptionClick]
  )

  return (
    <div
      className={cn(
        'b-chat-controls flex flex-wrap justify-between text-sm text-gray-500',
        className
      )}
      {...props}
    >
      <div></div>
      <div className="b-chat-controls__btns rounded-sm flex flex-nowrap items-center whitespace-pre-wrap invisible bg-card shadow-md">
        {
          <>
            {comment && !article.locked && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCommentClick}
                className="mr-1 px-2.5"
                tabIndex={0}
              >
                <MessageSquare size={20} className="inline-block" />
              </Button>
            )}
            {checkPermit('article', 'react') &&
              isPublished &&
              !article.locked && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      className="mr-1"
                      title={t('reactPost')}
                    >
                      <SmileIcon size={rem2pxNum(1.25)} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="flex flex-row p-1 gap-1"
                  >
                    {reactOptions.map((react) => (
                      <Button
                        key={react.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => onReactClick(react.id)}
                        className="h-auto px-2 py-1 text-lg hover:bg-accent"
                        title={react.describe}
                      >
                        {react.emoji}
                      </Button>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            {comment && article.locked && (
              <Button
                variant="ghost"
                size="xsm"
                className="mr-1 px-2.5"
                disabled
                title={t('locked')}
              >
                <LockIcon size={16} className="inline-block" />
              </Button>
            )}
            {isLogined() && hasMenuOptions && (
              <DropdownMenu open={showChatMenu} onOpenChange={setShowChatMenu}>
                <DropdownMenuTrigger
                  asChild
                  onMouseUp={(e) => e.preventDefault()}
                  onTouchEnd={(e) => e.preventDefault()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mr-1 px-2.5"
                    tabIndex={0}
                  >
                    <EllipsisIcon size={20} className="inline-block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="px-0"
                  align="end"
                  side="bottom"
                  sideOffset={isMobile ? -46 : 10}
                  alignOffset={isMobile ? 46 : 0}
                >
                  {renderMenuItems()}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
        {history && checkPermit('article', 'manage') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowHistoryClick}
            disabled={disabled}
            className="mr-1"
          >
            <HistoryIcon size={20} className="mr-1" />
          </Button>
        )}
        {!isRootArticle &&
          isMyself(article.replyRootAuthorId) &&
          articleCtx.root &&
          checkContentForm(articleCtx.root, 'qna') &&
          articleCtx.root.acceptAnswerId == '0' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAcceptAnswerClick}
              disabled={disabled}
              className="mr-1"
            >
              <CheckIcon size={20} className="mr-1" />
              &nbsp;
              <span className="text-sm text-gray-500 font-normal">
                {t('markAsSolution')}
              </span>
            </Button>
          )}

        {!isRootArticle &&
          articleCtx.root &&
          checkContentForm(articleCtx.root, 'qna') &&
          articleCtx.root.acceptAnswerId == article.id && (
            <span className="inline-flex items-center mr-2 text-green-500 text-sm whitespace-nowrap">
              <CheckIcon size={20} className="mr-1 inline" />
              &nbsp;<span>{t('markedAsSolution')}</span>
            </span>
          )}

        {((isRootArticle &&
          articleCtx.root &&
          checkContentForm(articleCtx.root, 'qna') &&
          articleCtx.root.acceptAnswerId !== '0') ||
          (article.acceptAnswerId !== '0' &&
            article.contentForm?.frontId == 'qna')) && (
          <Button
            variant="ghost"
            size="sm"
            className="mr-1 text-green-500"
            asChild
            title={t('viewAnswer')}
          >
            <SiteLink
              to={`/articles/${(articleCtx.root || article).acceptAnswerId}`}
              siteFrontId={siteFrontId}
            >
              <CheckIcon size={20} className="mr-1" />
              &nbsp;
              <span className="text-sm font-normal">{t('solved')}</span>
            </SiteLink>
          </Button>
        )}
        {isTopArticle && (
          <span className="text-gray-500">
            {t('replyCount', { num: article.totalReplyCount })}
          </span>
        )}
      </div>
    </div>
  )
}

export default ChatControls
