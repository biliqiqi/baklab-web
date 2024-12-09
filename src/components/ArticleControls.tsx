import {
  BookmarkIcon,
  MessageSquare,
  PencilIcon,
  QrCode,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { HTMLAttributes } from 'react'
import { Link } from 'react-router-dom'

import { timeAgo, timeFmt } from '@/lib/dayjs-custom'
import { cn } from '@/lib/utils'

import { Article, ArticleCardType } from '@/types/types'

import { Button } from './ui/button'

interface ArticleControlsProps extends HTMLAttributes<HTMLDivElement> {
  article: Article
  type: ArticleCardType
  downVote?: boolean // 是否显示踩按钮
  bookmark?: boolean // 是否显示书签（收藏）按钮
  edit?: boolean // 是否显示编辑按钮
  summary?: boolean // 是否显示概览
  link?: boolean // 是否显示直达链接
  linkQrCode?: boolean // 是否显示直达链接二维码
  onCommentClick?: () => void
}

const ArticleControls: React.FC<ArticleControlsProps> = ({
  article,
  className,
  downVote = false,
  bookmark = false,
  edit = false,
  link = false,
  linkQrCode = false,
  type = 'item',
  onCommentClick = () => {},
  ...props
}) => {
  return (
    <div
      className={cn(
        'flex flex-wrap justify-between text-sm text-gray-500',
        className
      )}
      {...props}
    >
      <div className="flex items-center">
        <Button variant="ghost" size="sm" className="mr-1">
          <ThumbsUp size={20} className="inline-block mr-1" />
          {article.voteUp > 0 && article.voteUp}
        </Button>
        {downVote && (
          <Button variant="ghost" size="sm" className="mr-1">
            <ThumbsDown size={20} className="inline-block mr-1" />
            {article.voteDown > 0 && article.voteDown}
          </Button>
        )}
        {bookmark && (
          <Button variant="ghost" size="sm">
            <BookmarkIcon size={20} className="inline-block mr-1" />
            {article.totalSavedCount > 0 && article.totalSavedCount}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          asChild={type == 'list'}
          onClick={onCommentClick}
        >
          {type == 'list' ? (
            <Link to={'/articles/' + article.id}>
              <MessageSquare size={20} className="inline-block mr-1" />
              {article.totalReplyCount > 0 && article.totalReplyCount}
            </Link>
          ) : (
            <MessageSquare size={20} className="inline-block mr-1" />
          )}
        </Button>
        {edit && (
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/articles/${article.id}/edit`}>
              <PencilIcon size={20} className="inline-block mr-1" />
            </Link>
          </Button>
        )}

        {type == 'list' && (
          <div className="ml-2">
            <Link
              to={'/categories/' + article.category.frontId}
              className="font-bold"
            >
              {article.category.name}
            </Link>
            &nbsp;·&nbsp;
            <span title={timeFmt(article.createdAt, 'YYYY年M月D日 H时m分s秒')}>
              {timeAgo(article.createdAt)}
            </span>
          </div>
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
            {link && (
              <Button size="sm" variant="link">
                <a href="https://example.com/" target="_blank">
                  京东购买 ¥{(Math.random() * 100).toFixed(2)}
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
