import { timeAgo, timeFmt } from '@/lib/dayjs-custom'
import { cn } from '@/lib/utils'
import { Article, ArticleCardType } from '@/types/types'
import {
  BookmarkIcon,
  MessageSquare,
  QrCode,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { HTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { Button } from './ui/button'

interface ArticleControlsProps extends HTMLAttributes<HTMLDivElement> {
  article: Article
  type: ArticleCardType
  onCommentClick?: () => void
}

const ArticleControls: React.FC<ArticleControlsProps> = ({
  article,
  className,
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
        <Button
          variant="outline"
          size="sm"
          className="mr-[-1px] rounded-r-none"
        >
          <ThumbsUp size={20} className="inline-block mr-1" />
          {article.voteUp > 0 && article.voteUp}
        </Button>
        <Button variant="outline" size="sm" className="rounded-l-none">
          <ThumbsDown size={20} className="inline-block mr-1" />
          {article.voteDown > 0 && article.voteDown}
        </Button>
        <Button variant="ghost" size="sm">
          {/* TODO: saved count */}
          <BookmarkIcon size={20} className="inline-block mr-1" />3
        </Button>
        <Button variant="ghost" size="sm" onClick={onCommentClick}>
          {type == 'list' ? (
            <Link to={'/articles/' + article.id + '#comments'}>
              <MessageSquare size={20} className="inline-block mr-1" />
              {article.totalReplyCount > 0 && article.totalReplyCount}
            </Link>
          ) : (
            <MessageSquare size={20} className="inline-block mr-1" />
          )}
        </Button>

        {type == 'list' && (
          <div className="ml-2">
            <Link to="" className="font-bold">
              {article.category.name}
            </Link>
            &nbsp;·&nbsp;
            <span title={timeFmt(article.createdAt, 'YYYY-M-D H:m:s')}>
              {timeAgo(article.createdAt)}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center">
        {Boolean(article.price) && (
          <>
            <Button variant="ghost" className="ml-1">
              <QrCode />
            </Button>
            <Button size="sm">
              <a href="https://example.com/" target="_blank">
                京东购买 ¥{(Math.random() * 100).toFixed(2)}
              </a>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default ArticleControls
