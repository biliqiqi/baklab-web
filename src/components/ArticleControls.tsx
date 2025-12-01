import ClipboardJS from 'clipboard'
import {
  BellIcon,
  BookmarkIcon,
  CheckIcon,
  EllipsisIcon,
  LinkIcon,
  MessageSquare,
  QrCode,
  Share2Icon,
  SmileIcon,
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
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { timeAgo, timeFmt } from '@/lib/dayjs-custom'
import { cn, genArticlePath, noop } from '@/lib/utils'

import {
  acceptAnswer,
  toggleReactArticle,
  toggleSaveArticle,
  toggleSubscribeArticle,
  toggleVoteArticle,
} from '@/api/article'
import { ArticleContext } from '@/contexts/ArticleContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { useRem2PxNum } from '@/hooks/use-rem-num'
import { buildRoutePath } from '@/hooks/use-route-match'
import { useSiteParams } from '@/hooks/use-site-params'
import { useAuthedUserStore, useReactOptionsStore } from '@/state/global'
import {
  Article,
  ArticleAction,
  ArticleCardType,
  SUBSCRIBE_ACTION,
  VoteType,
} from '@/types/types'

import BIconColorChar from './base/BIconColorChar'
import BSiteIcon from './base/BSiteIcon'
import SiteLink from './base/SiteLink'
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
  ctype = 'item',
  isTopArticle = false,
  onCommentClick = noop,
  onSuccess = noop,
  ...props
}) => {
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const { siteFrontId } = useSiteParams()
  const userState = useMemo(() => article.currUserState, [article])

  const isRootArticle = useMemo(() => article.replyToId == '0', [article])
  const isPublished = useMemo(() => article.status == 'published', [article])

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
  const articleUrl = useMemo(() => {
    const path = buildRoutePath(genArticlePath(article), article.siteFrontId)
    return window.location.origin + path
  }, [article])
  const copyBtnClass = useMemo(
    () => `copy-link-btn-${article.id}`,
    [article.id]
  )
  const reactOptions = useReactOptionsStore((state) => state.reactOptions)

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
    async (e: MouseEvent<HTMLDivElement>, voteType: VoteType) => {
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
        url:
          window.location.origin +
          buildRoutePath(genArticlePath(article), article.siteFrontId),
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

  const onReactClick = useCallback(
    async (reactId: string) => {
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
    [article, onSuccess, isLogined, loginWithDialog]
  )

  return (
    <div
      className={cn(
        'flex flex-wrap justify-between text-sm text-text-secondary',
        className
      )}
      {...props}
    >
      <div className="flex flex-wrap items-center whitespace-pre-wrap">
        {!article.locked && (
          <>
            {isPublished && upVote && (
              <div
                className={cn(
                  'mr-1 px-0 h-[1.5rem] inline-flex items-center gap-1',
                  !disabled && 'cursor-pointer hover:opacity-70'
                )}
                onClick={(e) => !disabled && onVoteClick(e, 'up')}
                title={t('upVotePost')}
              >
                <BIconTriangleUp
                  height={rem2pxNum(1.8)}
                  variant={userState?.voteType == 'up' ? 'full' : 'default'}
                />
                {article.voteUp > 0 && <span>{article.voteUp}</span>}
              </div>
            )}
            {checkPermit('article', 'vote_down') && isPublished && downVote && (
              <div
                className={cn(
                  'mr-1 px-0 h-[1.5rem] inline-flex items-center gap-1',
                  !disabled && 'cursor-pointer hover:opacity-70'
                )}
                onClick={(e) => !disabled && onVoteClick(e, 'down')}
                title={t('downVotePost')}
              >
                <BIconTriangleDown
                  height={rem2pxNum(1.8)}
                  variant={userState?.voteType == 'down' ? 'full' : 'default'}
                />
                {article.voteDown > 0 && <span>{article.voteDown}</span>}
              </div>
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
                  <SiteLink
                    to={genArticlePath(article)}
                    siteFrontId={article.siteFrontId}
                  >
                    <MessageSquare
                      size={rem2pxNum(1.25)}
                      className="inline-block mr-1"
                    />
                    {article.totalReplyCount > 0 && article.totalReplyCount}
                  </SiteLink>
                ) : (
                  <MessageSquare
                    size={rem2pxNum(1.25)}
                    className="inline-block mr-1"
                  />
                )}
              </Button>
            )}
          </>
        )}
        {article.locked && (
          <i className="inline-block mr-2 text-sm">&lt;{t('locked')}&gt;</i>
        )}

        {ctype == 'list' && (
          <>
            <Link to={'/users/' + article.authorName}>
              {article.authorName}
            </Link>
            {!isMobile && (
              <>
                &nbsp;·
                {siteFrontId ? (
                  <SiteLink
                    to={`/b/${article.category.frontId}`}
                    siteFrontId={article.siteFrontId}
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
                  </SiteLink>
                ) : (
                  <SiteLink
                    to="/"
                    siteFrontId={article.siteFrontId}
                    className="leading-3 mx-1"
                  >
                    <BSiteIcon
                      logoUrl={article.site.logoUrl}
                      name={article.site.name}
                      size={rem2pxNum(1.25)}
                      fontSize={12}
                      showSiteName
                    />
                  </SiteLink>
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
          <span className="inline-block mr-2">
            {t('replyCount', { num: article.totalReplyCount })}
          </span>
        )}
        {ctype !== 'list' && !isTopArticle && article.childrenCount > 0 && (
          <SiteLink
            to={`/articles/${article.id}`}
            siteFrontId={article.siteFrontId}
            className="inline-block mr-2 hover:underline"
          >
            {t('replyCount', { num: article.childrenCount })}
          </SiteLink>
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
            className="mr-1 h-[1.5rem] text-green-500 gap-0 tracking-normal"
            asChild
            title={t('viewAnswer')}
          >
            <SiteLink
              to={`/articles/${(articleCtx.root || article).acceptAnswerId}`}
              siteFrontId={article.siteFrontId}
            >
              <CheckIcon size={rem2pxNum(1.25)} />
              <span className="text-sm font-normal">{t('solved')}</span>
            </SiteLink>
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
              className="mr-1 h-[1.5rem] gap-0 tracking-normal"
            >
              <CheckIcon size={rem2pxNum(1.25)} />
              &nbsp;
              <span className="text-sm font-normal">{t('markAsSolution')}</span>
            </Button>
          )}

        {!isRootArticle &&
          articleCtx.root &&
          checkContentForm(articleCtx.root, 'qna') &&
          articleCtx.root.acceptAnswerId == article.id && (
            <span className="inline-flex items-center mr-2 text-green-500 text-sm whitespace-nowrap">
              <CheckIcon size={rem2pxNum(1.25)} className="inline" />
              &nbsp;<span>{t('markedAsSolution')}</span>
            </span>
          )}
      </div>

      <div className="flex flex-wrap items-center">
        {ctype === 'list' && article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap items-center mr-2">
            {article.tags.slice(0, 3).map((tag, index) => (
              <span key={tag.id} className="text-sm text-text-secondary">
                <SiteLink
                  to={`/tags/${encodeURIComponent(tag.name)}`}
                  siteFrontId={article.siteFrontId}
                  className="hover:text-primary transition-colors"
                >
                  {tag.name}
                </SiteLink>
                {index < Math.min(article.tags.length, 3) - 1 && (
                  <span className="mr-1.5">,</span>
                )}
              </span>
            ))}
          </div>
        )}
        {!article.locked && (
          <>
            {ctype !== 'list' &&
              isPublished &&
              article.reactCounts &&
              Object.keys(article.reactCounts).length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mr-1">
                  {reactOptions
                    .filter((react) => article.reactCounts[react.frontId] > 0)
                    .map((react) => {
                      const isActive = userState?.reactFrontId === react.frontId
                      return (
                        <Button
                          key={react.id}
                          variant="ghost"
                          size="sm"
                          onClick={() => onReactClick(react.id)}
                          disabled={
                            disabled ||
                            (isLogined() && !checkPermit('article', 'react'))
                          }
                          className={cn(
                            'h-[1.5rem] px-2 py-1 gap-1 text-sm',
                            isActive && 'bg-accent'
                          )}
                          title={react.describe}
                        >
                          <span className="text-base leading-none">
                            {react.emoji}
                          </span>
                          <span>{article.reactCounts[react.frontId]}</span>
                        </Button>
                      )
                    })}
                </div>
              )}
            {ctype !== 'list' &&
              checkPermit('article', 'react') &&
              isPublished && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      className="mr-1 h-[1.5rem]"
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
            {isPublished && ctype == 'item' && (
              <DropdownMenu
                open={showActionsMenu}
                onOpenChange={setShowActionsMenu}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="mr-1 h-[1.5rem]"
                    title={t('moreActions')}
                  >
                    <EllipsisIcon size={rem2pxNum(1.25)} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {checkPermit('article', 'subscribe') &&
                    notify &&
                    isRootArticle && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          setShowActionsMenu(false)
                          void onSubscribeClick(
                            e as unknown as MouseEvent<HTMLButtonElement>
                          )
                        }}
                      >
                        <BellIcon
                          size={rem2pxNum(1.25)}
                          className="mr-2"
                          fill={
                            userState?.subscribed
                              ? 'currentColor'
                              : 'transparent'
                          }
                        />
                        {userState?.subscribed
                          ? t('unsubscribe')
                          : t('subscribePost')}
                      </DropdownMenuItem>
                    )}
                  {checkPermit('article', 'save') && bookmark && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        setShowActionsMenu(false)
                        void onSaveClick(
                          e as unknown as MouseEvent<HTMLButtonElement>
                        )
                      }}
                    >
                      <BookmarkIcon
                        size={rem2pxNum(1.25)}
                        className="mr-2"
                        fill={userState?.saved ? 'currentColor' : 'transparent'}
                      />
                      {userState?.saved ? t('unsave') : t('savePost')}
                    </DropdownMenuItem>
                  )}
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
          </>
        )}
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
