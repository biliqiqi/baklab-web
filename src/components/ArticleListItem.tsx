import { SquareArrowOutUpRightIcon } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'

import { updateArticleState } from '@/lib/article-utils'
import {
  extractDomain,
  genArticlePath,
  getArticleStatusName,
  renderMD,
} from '@/lib/utils'

import { Card } from '@/components/ui/card'

import { useIsMobile } from '@/hooks/use-mobile'
import { useRem2PxNum } from '@/hooks/use-rem-num'
import { useAuthedUserStore } from '@/state/global'
import { Article } from '@/types/types'

import ArticleControls from './ArticleControls'
import BIconColorChar from './base/BIconColorChar'
import BSiteIcon from './base/BSiteIcon'
import { Badge } from './ui/badge'

interface ArticleListItemProps {
  article: Article
  showSummary?: boolean
  siteFrontId?: string
  onUpdate?: (updatedArticle: Article) => void
}

const ArticleListItem: React.FC<ArticleListItemProps> = ({
  article,
  showSummary = false,
  siteFrontId,
  onUpdate,
}) => {
  const isMySelf = useAuthedUserStore((state) => state.isMySelf)
  const checkPermit = useAuthedUserStore((state) => state.permit)
  const rem2pxNum = useRem2PxNum()
  const isMobile = useIsMobile()

  return (
    <div className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900 border-b-[1px]">
      {isMobile && (
        <div className="mb-3 text-sm text-gray-500">
          {siteFrontId ? (
            <Link
              to={`/${article.siteFrontId}/bankuai/${article.category.frontId}`}
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
            <Link to={`/${article.siteFrontId}`} className="leading-3 mx-1">
              <BSiteIcon
                logoUrl={article.site.logoUrl}
                name={article.site.name}
                size={rem2pxNum(1.25)}
                fontSize={12}
                showSiteName
              />
            </Link>
          )}
        </div>
      )}

      <div className="mb-3">
        <div className="mb-1">
          <Link className="mr-2" to={genArticlePath(article)}>
            {article.title}
          </Link>
          {article.link && (
            <span className="text-sm text-gray-500">
              (
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
        </div>
        <div>{isMySelf(article.authorId)}</div>
        {(isMySelf(article.authorId) || checkPermit('article', 'manage')) &&
          article.status != 'published' && (
            <div className="py-1">
              <Badge variant={'secondary'}>
                {getArticleStatusName(article.status)}
              </Badge>
            </div>
          )}
        {showSummary && (
          <div
            className="mb-1 break-words"
            dangerouslySetInnerHTML={{ __html: renderMD(article.summary) }}
          ></div>
        )}
        {article.picURL && (
          <div className="w-[120px] h-[120px] rounded mr-4 bg-gray-200 shrink-0 overflow-hidden">
            <a href="#">
              <img
                alt={article.title}
                src={article.picURL}
                className="max-w-full"
              />
            </a>
          </div>
        )}
      </div>
      <ArticleControls
        article={article}
        ctype="list"
        bookmark={false}
        notify={false}
        history={false}
        onSuccess={(action) => {
          if (onUpdate) {
            onUpdate(updateArticleState(article, action))
          }
        }}
      />
    </div>
  )
}

export default ArticleListItem
