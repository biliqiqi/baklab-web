import {
  BellIcon,
  BookmarkIcon,
  HistoryIcon,
  MessageSquare,
  QrCode,
} from 'lucide-react'
import {
  HTMLAttributes,
  MouseEvent,
  MouseEventHandler,
  useCallback,
  useMemo,
} from 'react'
import { Link, useParams } from 'react-router-dom'

import { timeAgo, timeFmt } from '@/lib/dayjs-custom'
import { cn, genArticlePath, noop } from '@/lib/utils'

import {
  getArticleHistory,
  toggleSaveArticle,
  toggleSubscribeArticle,
  toggleVoteArticle,
} from '@/api/article'
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
import { BIconTriangleDown } from './icon/TriangleDown'
import { BIconTriangleUp } from './icon/TriangleUp'
import { Button } from './ui/button'

interface ArticleControlsProps extends HTMLAttributes<HTMLDivElement> {
  disabled?: boolean
  article: Article
  ctype: ArticleCardType
  upVote?: boolean
  downVote?: boolean // 是否显示踩按钮
  bookmark?: boolean // 是否显示书签（收藏）按钮
  author?: boolean
  cornerLink?: boolean // 右下角链接
  linkQrCode?: boolean // 是否显示直达链接二维码
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

const ArticleControls: React.FC<ArticleControlsProps> = ({
  disabled = false,
  article,
  className,
  upVote = true,
  downVote = false,
  bookmark = true,
  author = true,
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

  /* console.log('curr article history: ', articleHistory) */

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

  const onVoteClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>, voteType: VoteType) => {
      try {
        e.preventDefault()
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
    [article, onSuccess]
  )

  return (
    <div
      className={cn(
        'flex flex-wrap justify-between text-sm text-gray-500',
        className
      )}
      {...props}
    >
      <div className="flex flex-wrap items-center">
        {!article.locked && (
          <>
            {checkPermit('article', 'vote_up') && isPublished && upVote && (
              <Button
                variant="ghost"
                size="sm"
                className="mr-1 p-0 w-[36px] h-[36px]"
                onClick={(e) => onVoteClick(e, 'up')}
                disabled={disabled}
              >
                {/* <ThumbsUp size={20} className="inline-block mr-1" /> */}
                <BIconTriangleUp
                  size={28}
                  variant={userState?.voteType == 'up' ? 'full' : 'default'}
                />
                {article.voteUp > 0 && article.voteUp}
              </Button>
            )}
            {checkPermit('article', 'vote_down') && isPublished && downVote && (
              <Button
                variant="ghost"
                size="sm"
                className="mr-1 p-0 w-[36px] h-[36px]"
                onClick={(e) => onVoteClick(e, 'down')}
                disabled={disabled}
              >
                <BIconTriangleDown
                  size={28}
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
                onClick={onCommentClick}
                className="mr-1"
              >
                {ctype == 'list' ? (
                  <Link to={genArticlePath(article)}>
                    <MessageSquare size={20} className="inline-block mr-1" />
                    {article.totalReplyCount > 0 && article.totalReplyCount}
                  </Link>
                ) : (
                  <MessageSquare size={20} className="inline-block mr-1" />
                )}
              </Button>
            )}
            {checkPermit('article', 'save') && isPublished && bookmark && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSaveClick}
                disabled={disabled}
              >
                <BookmarkIcon
                  size={20}
                  fill={userState.saved ? 'currentColor' : 'transparent'}
                  className={cn('mr-1', userState.saved && 'text-primary')}
                />
                {article.totalSavedCount > 0 && article.totalSavedCount}
              </Button>
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
                  className="mr-1"
                >
                  <BellIcon
                    size={20}
                    fill={userState.subscribed ? 'currentColor' : 'transparent'}
                    className={cn(
                      'mr-1',
                      userState.subscribed && 'text-primary'
                    )}
                  />
                </Button>
              )}
          </>
        )}
        {article.locked && (
          <i className="inline-block mr-2 text-sm text-gray-500">
            &lt;已锁定&gt;
          </i>
        )}
        {history && checkPermit('article', 'manage') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowHistoryClick}
            disabled={disabled}
            className="mr-1"
          >
            <HistoryIcon size={20} className={'mr-1'} />
          </Button>
        )}
        {ctype == 'list' && (
          <>
            {author && (
              <span>
                {article.replyToId == '0' || !article.replyToArticle ? (
                  <>
                    <Link
                      to={'/users/' + article.authorName}
                      className="text-gray-700"
                    >
                      {article.authorName}
                    </Link>
                    &nbsp;发布于
                  </>
                ) : (
                  <>
                    <Link
                      to={'/users/' + article.authorName}
                      className="text-gray-700"
                    >
                      {article.authorName}
                    </Link>
                    &nbsp;回复&nbsp;
                    <Link
                      to={'/users/' + article.authorName}
                      className="text-gray-700"
                    >
                      {article.replyToArticle.authorName}
                    </Link>
                    于
                  </>
                )}
              </span>
            )}
            <span className="whitespace-nowrap">
              {siteFrontId ? (
                <Link
                  to={`/${article.siteFrontId}/bankuai/${article.category.frontId}`}
                >
                  <BIconColorChar
                    iconId={article.categoryFrontId}
                    char={article.category.iconContent}
                    color={article.category.iconBgColor}
                    size={20}
                    fontSize={12}
                    className="align-[-5px] mx-1"
                  />
                  {article.category.name}
                </Link>
              ) : (
                <Link to={`/${article.siteFrontId}`} className="leading-3 mx-1">
                  <BSiteIcon
                    logoUrl={article.site.logoUrl}
                    name={article.site.name}
                    size={20}
                    fontSize={12}
                    showSiteName
                  />
                </Link>
              )}
              &nbsp;·&nbsp;
              <span
                title={timeFmt(article.createdAt, 'YYYY年M月D日 H时m分s秒')}
              >
                {timeAgo(article.createdAt)}
              </span>
            </span>
          </>
        )}
        {isTopArticle && (
          <span className="text-gray-500">{article.totalReplyCount} 回复</span>
        )}
      </div>
      <div className="flex items-center">
        {article.replyToId == '0' && (
          <>
            {linkQrCode && (
              <Button size="sm" variant="ghost">
                <QrCode size={20} />
              </Button>
            )}
            {cornerLink && (
              <Button size="sm" variant="link">
                <a href={article.link} target="_blank">
                  来源 {article.link}
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
