import { HTMLAttributes } from 'react'
import { Link } from 'react-router-dom'

import { timeAgo, timeFmt } from '@/lib/dayjs-custom'
import { bus } from '@/lib/utils'

import { EV_ON_REPLY_CLICK } from '@/constants'
import {
  Article,
  ArticleCardType,
  ArticleSubmitResponse,
  ResponseData,
} from '@/types/types'

import ArticleControls from './ArticleControls'
import BAvatar from './base/BAvatar'
import { Card } from './ui/card'

interface ArticleCardProps extends HTMLAttributes<HTMLDivElement> {
  article: Article
  replyBox?: boolean
  type?: ArticleCardType
  onSuccess?: (data: ResponseData<ArticleSubmitResponse>) => void
}

const highlightElement = (element: HTMLElement) => {
  element.classList.add('b-highlight')
  setTimeout(() => {
    element.classList.remove('b-highlight')
  }, 2000)
}

const scrollToElement = (element: HTMLElement) => {
  if (!element) return

  const rectTop = element.getBoundingClientRect().y

  if (rectTop > 0) {
    highlightElement(element)
  } else {
    setTimeout(() => {
      location.hash = element.id
      highlightElement(element)
    }, 500)

    window.scrollTo({
      top: rectTop + window.scrollY,
      behavior: 'smooth',
    })
  }
}

const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onSuccess,
  type = 'item',
  ...props
}) => {
  /* const isRootArticle = type == 'item' && article.replyToId == '0' */
  /* const [replyBox, setReplyBox] = useState(isRootArticle) */

  /* const articleID = article.id */
  const parent = article.replyToArticle

  return (
    <div id={'comment' + article.id} {...props}>
      <Card className="p-3 my-2 mb-3">
        {article.asMainArticle && (
          <h1 className="mb-4 font-bold text-lg">
            {article.replyToId == '0' ? (
              article.displayTitle
            ) : (
              <Link to={'/articles/' + article.replyRootArticleId}>
                {article.displayTitle}
              </Link>
            )}
          </h1>
        )}
        <div className="flex items-center mb-4 text-sm text-gray-500">
          <Link to={'/users/' + article.authorName}>
            <BAvatar username={article.authorName} size={24} />{' '}
            {article.authorName}
          </Link>
          &nbsp;发布于&nbsp;
          <span title={timeFmt(article.createdAt, 'YYYY年M月D日 H时m分s秒')}>
            {timeAgo(article.createdAt)}
          </span>
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
                  scrollToElement(parentCommentEl)
                }
              }}
            >
              {parent.authorName}: {parent.summary}
              {parent.summary != parent.content && '...'}
            </div>
          )}
          <div
            dangerouslySetInnerHTML={{ __html: article.content }}
            className="whitespace-break-spaces mb-4"
          ></div>
        </div>
        <ArticleControls
          article={article}
          type={type}
          onCommentClick={() => {
            bus.emit(EV_ON_REPLY_CLICK, article)
          }}
        />
      </Card>
    </div>
  )
}

export default ArticleCard
