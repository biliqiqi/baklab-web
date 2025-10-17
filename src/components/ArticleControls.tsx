import ClipboardJS from 'clipboard'
import {
  BellIcon,
  BookmarkIcon,
  CheckIcon,
  HistoryIcon,
  LinkIcon,
  MessageSquare,
  QrCode,
  Share2Icon,
} from 'lucide-react'
import {
  HTMLAttributes,
  MouseEvent,
  MouseEventHandler,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { timeAgo, timeFmt } from '@/lib/dayjs-custom'
import { cn, genArticlePath, noop } from '@/lib/utils'

import {
  acceptAnswer,
  getArticleHistory,
  toggleSaveArticle,
  toggleSubscribeArticle,
  toggleVoteArticle,
} from '@/api/article'
import { ArticleContext } from '@/contexts/ArticleContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { useRem2PxNum } from '@/hooks/use-rem-num'
import { useArticleHistoryStore, useAuthedUserStore } from '@/state/global'
import {
  Article,
  ArticleAction,
  ArticleCardType,
  SUBSCRIBE_ACTION,
  VoteType,
} from '@/types/types'

import BIconColorChar from './base/BIconColorChar'
import BSiteIcon from './base/BSiteIcon'
import { BIconForward } from './icon/Forward'
import { BIconTriangleDown } from './icon/TriangleDown'
import { BIconTriangleUp } from './icon/TriangleUp'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

interface ArticleControlsProps extends HTMLAttributes<HTMLDivElement> {
  disabled?: boolean
  article: Article
  ctype?: ArticleCardType
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
  /* onSaveClick?: MouseEventHandler<HTMLButtonElement> */
  /* onVoteUpClick?: MouseEventHandler<HTMLButtonElement>
   * onVoteDownClick?: MouseEventHandler<HTMLButtonElement> */
  onSuccess?: (a: ArticleAction) => void
}

const checkContentForm = (targetArticle: Article, contentForm: string) => {
  return targetArticle.contentForm?.frontId == contentForm
}

const ArticleControls: React.FC<ArticleControlsProps> = ({
  disabled = false,
  article,
  className,
  upVote = true,
  downVote = false,
  bookmark = true,
  author: _author = true,
  linkQrCode = false,
  cornerLink = false,
  notify = true,
  comment = true,
  history = true,
  ctype = 'item',
  isTopArticle = false,
  onCommentClick = noop,
  onSuccess = noop,
  ...props
}) => {
  const { siteFrontId } = useParams()
  const userState = useMemo(() => article.currUserState, [article])

  const isRootArticle = useMemo(() => article.replyToId == '0', [article])
  const isPublished = useMemo(() => article.status == 'published', [article])

  const articleHistory = useArticleHistoryStore()
  const checkPermit = useAuthedUserStore((state) => state.permit)
  const isMyself = useAuthedUserStore((state) => state.isMySelf)
  const isLogined = useAuthedUserStore((state) => state.isLogined)
  const loginWithDialog = useAuthedUserStore((state) => state.loginWithDialog)
  const { t } = useTranslation()
  const rem2pxNum = useRem2PxNum()
  const isMobile = useIsMobile()

  /* console.log('curr article history: ', articleHistory) */

  const articleCtx = useContext(ArticleContext)

  const clipboardRef = useRef<ClipboardJS | null>(null)
  const articleUrl = useMemo(
    () => window.location.origin + genArticlePath(article),
    [article]
  )
  const copyBtnClass = useMemo(
    () => `copy-link-btn-${article.id}`,
    [article.id]
  )

  useEffect(() => {
    if (!clipboardRef.current) {
      clipboardRef.current = new ClipboardJS(`.${copyBtnClass}`, {
        text: () => articleUrl,
      })

      clipboardRef.current.on('success', () => {
        toast.success(t('copySuccess'))
      })

      clipboardRef.current.on('error', () => {
        toast.error(t('copyFailed'))
      })
    }

    return () => {
      if (clipboardRef.current) {
        clipboardRef.current.destroy()
        clipboardRef.current = null
      }
    }
  }, [copyBtnClass, articleUrl, t])

  const onSaveClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      try {
        e.preventDefault()
        const resp = await toggleSaveArticle(article.id, {
          siteFrontId: article.siteFrontId,
        })
        if (!resp.code) {
          onSuccess('save')
        }
      } catch (err) {
        console.error('toggle save article failed: ', err)
      }
    },
    [article, onSuccess]
  )

  const onSubscribeClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      try {
        e.preventDefault()
        const resp = await toggleSubscribeArticle(
          article.id,
          SUBSCRIBE_ACTION.Toggle,
          { siteFrontId: article.siteFrontId }
        )
        if (!resp.code) {
          onSuccess('subscribe')
        }
      } catch (err) {
        console.error('toggle subscribe article failed: ', err)
      }
    },
    [article, onSuccess]
  )

  const onShowHistoryClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
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

  const onVoteClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>, voteType: VoteType) => {
      try {
        e.preventDefault()

        // Check if user is logged in
        if (!isLogined()) {
          await loginWithDialog()
          return
        }

        const resp = await toggleVoteArticle(article.id, voteType, {
          siteFrontId: article.siteFrontId,
        })
        if (!resp.code) {
          onSuccess(voteType)
        }
      } catch (err) {
        console.error('toggle vote article failed: ', err)
      }
    },
    [article, onSuccess, isLogined, loginWithDialog]
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

  const handleNativeShare = useCallback(
    async (e: MouseEvent<HTMLDivElement>) => {
      const shareData = {
        title: article.title,
        text: '',
        url: window.location.origin + genArticlePath(article),
      }

      if (navigator.canShare && navigator.canShare(shareData)) {
        e.preventDefault()
        try {
          await navigator.share(shareData)
        } catch (err) {
          console.error('native share failed: ', err)
        }
      }
    },
    [article]
  )

  return (
    <div
      className={cn(
        'flex flex-wrap justify-between text-sm text-gray-500',
        className
      )}
      {...props}
    >
      <div className="flex flex-wrap items-center whitespace-pre-wrap">
        {!article.locked && (
          <>
            {isPublished && upVote && (
              <Button
                variant="ghost"
                size="sm"
                className="mr-1 p-0 h-[1.5rem]"
                onClick={(e) => onVoteClick(e, 'up')}
                disabled={disabled}
                title={t('upVotePost')}
              >
                <BIconTriangleUp
                  size={rem2pxNum(1.8)}
                  variant={userState?.voteType == 'up' ? 'full' : 'default'}
                />
                {article.voteUp > 0 && article.voteUp}
              </Button>
            )}
            {checkPermit('article', 'vote_down') && isPublished && downVote && (
              <Button
                variant="ghost"
                size="sm"
                className="mr-1 p-0 h-[1.5rem]"
                onClick={(e) => onVoteClick(e, 'down')}
                disabled={disabled}
                title={t('downVotePost')}
              >
                <BIconTriangleDown
                  size={rem2pxNum(1.8)}
                  variant={userState?.voteType == 'down' ? 'full' : 'default'}
                />
                {article.voteDown > 0 && article.voteDown}
              </Button>
            )}
            {comment && (
              <Button
                variant="ghost"
                size="sm"
                asChild={ctype == 'list'}
                onClick={ctype == 'list' ? noop : handleCommentClick}
                className="mr-1 h-[1.5rem]"
                title={t('replyPost')}
              >
                {ctype == 'list' ? (
                  <Link to={genArticlePath(article)}>
                    <MessageSquare
                      size={rem2pxNum(1.25)}
                      className="inline-block mr-1"
                    />
                    {article.totalReplyCount > 0 && article.totalReplyCount}
                  </Link>
                ) : (
                  <MessageSquare
                    size={rem2pxNum(1.25)}
                    className="inline-block mr-1"
                  />
                )}
              </Button>
            )}
            {checkPermit('article', 'save') && isPublished && bookmark && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSaveClick}
                disabled={disabled}
                className="mr-1 h-[1.5rem]"
                title={t('savePost')}
              >
                <BookmarkIcon
                  size={rem2pxNum(1.25)}
                  fill={userState?.saved ? 'currentColor' : 'transparent'}
                  className={cn(userState?.saved && 'text-primary')}
                />
                {article.totalSavedCount > 0 && article.totalSavedCount}
              </Button>
            )}
            {isPublished && ctype == 'item' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="mr-1 h-[1.5rem]"
                    title={t('sharePost')}
                  >
                    <BIconForward size={rem2pxNum(1.25)} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem asChild>
                    <button className={copyBtnClass}>
                      <LinkIcon size={rem2pxNum(1.25)} className="mr-2" />
                      {t('copyLink')}
                    </button>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleNativeShare}>
                    <Share2Icon size={rem2pxNum(1.25)} className="mr-2" />
                    {t('share')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {checkPermit('article', 'subscribe') &&
              isPublished &&
              notify &&
              isRootArticle && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSubscribeClick}
                  disabled={disabled}
                  className="mr-1 h-[1.5rem]"
                  title={t('subscribePost')}
                >
                  <BellIcon
                    size={rem2pxNum(1.25)}
                    fill={
                      userState?.subscribed ? 'currentColor' : 'transparent'
                    }
                    className={cn(userState?.subscribed && 'text-primary')}
                  />
                </Button>
              )}
          </>
        )}
        {article.locked && (
          <i className="inline-block mr-2 text-sm text-gray-500">
            &lt;{t('locked')}&gt;
          </i>
        )}
        {history && checkPermit('article', 'manage') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowHistoryClick}
            disabled={disabled}
            className="mr-1 h-[1.5rem]"
            title={t('editHistory')}
          >
            <HistoryIcon size={rem2pxNum(1.25)} />
          </Button>
        )}

        {ctype == 'list' && (
          <>
            <Link to={'/users/' + article.authorName} className="text-gray-700">
              {article.authorName}
            </Link>
            {!isMobile && (
              <>
                &nbsp;·
                {siteFrontId ? (
                  <Link
                    to={`/z/${article.siteFrontId}/bankuai/${article.category.frontId}`}
                  >
                    <BIconColorChar
                      iconId={article.categoryFrontId}
                      char={article.category.iconContent}
                      color={article.category.iconBgColor}
                      size={rem2pxNum(1.25)}
                      fontSize={12}
                      className="align-[-5px] mx-1"
                    />
                    {article.category.name}
                  </Link>
                ) : (
                  <Link
                    to={`/z/${article.siteFrontId}`}
                    className="leading-3 mx-1"
                  >
                    <BSiteIcon
                      logoUrl={article.site.logoUrl}
                      name={article.site.name}
                      size={rem2pxNum(1.25)}
                      fontSize={12}
                      showSiteName
                    />
                  </Link>
                )}
              </>
            )}
            &nbsp;·&nbsp;
            <span title={timeFmt(article.createdAt, 'YYYY-M-D H:m:s')}>
              {timeAgo(article.createdAt)}
            </span>
          </>
        )}
        {isTopArticle && (
          <span className="text-gray-500">
            {t('replyCount', { num: article.totalReplyCount })}
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
            className="mr-1 h-[1.5rem] text-green-500"
            asChild
            title={t('viewAnswer')}
          >
            <Link
              to={`/z/${article.siteFrontId}/articles/${(articleCtx.root || article).acceptAnswerId}`}
            >
              <CheckIcon size={rem2pxNum(1.25)} />
              &nbsp;
              <span className="text-sm font-normal">{t('solved')}</span>
            </Link>
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
              className="mr-1 h-[1.5rem]"
            >
              <CheckIcon size={rem2pxNum(1.25)} />
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
              <CheckIcon size={rem2pxNum(1.25)} className="mr-1 inline" />
              &nbsp;<span>{t('markedAsSolution')}</span>
            </span>
          )}
      </div>

      <div className="flex items-center">
        {article.replyToId == '0' && (
          <>
            {linkQrCode && (
              <Button size="sm" variant="ghost">
                <QrCode size={rem2pxNum(1.25)} />
              </Button>
            )}
            {cornerLink && (
              <Button size="sm" variant="link">
                <a href={article.link} target="_blank">
                  {article.link}
                </a>
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ArticleControls
