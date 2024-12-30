import {
  BellIcon,
  BookmarkCheckIcon,
  BookmarkIcon,
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
import { Link } from 'react-router-dom'

import { timeAgo, timeFmt } from '@/lib/dayjs-custom'
import { cn, noop } from '@/lib/utils'

import {
  toggleSaveArticle,
  toggleSubscribeArticle,
  toggleVoteArticle,
} from '@/api/article'
import {
  Article,
  ArticleAction,
  ArticleCardType,
  VoteType,
} from '@/types/types'

import BIconColorChar from './base/BIconColorChar'
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
  ctype = 'item',
  isTopArticle = false,
  onCommentClick = noop,
  onSuccess = noop,
  ...props
}) => {
  const userState = useMemo(() => article.currUserState, [article])
  const onSaveClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      try {
        e.preventDefault()
        const resp = await toggleSaveArticle(article.id)
        if (!resp.code) {
          onSuccess('save')
        }
      } catch (err) {
        console.error('toggle save article failed: ', err)
      }
    },
    [article]
  )

  const onSubscribeClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      try {
        e.preventDefault()
        const resp = await toggleSubscribeArticle(article.id)
        if (!resp.code) {
          onSuccess('subscribe')
        }
      } catch (err) {
        console.error('toggle subscribe article failed: ', err)
      }
    },
    [article]
  )

  const onVoteClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>, voteType: VoteType) => {
      try {
        e.preventDefault()
        const resp = await toggleVoteArticle(article.id, voteType)
        if (!resp.code) {
          onSuccess(voteType)
        }
      } catch (err) {
        console.error('toggle vote article failed: ', err)
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
      <div className="flex flex-wrap items-center">
        {upVote && (
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
        {downVote && (
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
        <Button
          variant="ghost"
          size="sm"
          asChild={ctype == 'list'}
          onClick={onCommentClick}
          className="mr-1"
        >
          {ctype == 'list' ? (
            <Link to={'/articles/' + article.id}>
              <MessageSquare size={20} className="inline-block mr-1" />
              {article.totalReplyCount > 0 && article.totalReplyCount}
            </Link>
          ) : (
            <MessageSquare size={20} className="inline-block mr-1" />
          )}
        </Button>
        {bookmark && (
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
        {notify && (
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
              className={cn('mr-1', userState.subscribed && 'text-primary')}
            />
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
              <Link to={'/categories/' + article.category.frontId}>
                <BIconColorChar
                  iconId={article.categoryFrontId}
                  char={article.category.name}
                  size={20}
                  fontSize={12}
                  className="align-[-5px] mx-1"
                />
                {article.category.name}
              </Link>
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
          <span className="text-gray-500">
            {article.totalReplyCount} 个回复
          </span>
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
