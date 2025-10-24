import { SquareArrowOutUpRightIcon } from 'lucide-react'
import MarkdownIt from 'markdown-it'
import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

import { updateArticleState } from '@/lib/article-utils'
import { parseImageMetadataFromUrl, thumbHashToPreview } from '@/lib/thumbhash'
import {
  cn,
  extractDomain,
  genArticlePath,
  getArticleStatusName,
  md2text,
  setupLazyLoadImages,
  summaryText,
} from '@/lib/utils'

import { useIsMobile } from '@/hooks/use-mobile'
import { useRem2PxNum } from '@/hooks/use-rem-num'
import { useAuthedUserStore } from '@/state/global'
import { Article, ArticleListMode } from '@/types/types'

import ArticleControls from './ArticleControls'
import BIconColorChar from './base/BIconColorChar'
import BSiteIcon from './base/BSiteIcon'
import { Badge } from './ui/badge'

interface ArticleListItemProps {
  article: Article
  siteFrontId?: string
  onUpdate?: (updatedArticle: Article) => void
  mode?: ArticleListMode
}

const THUMB_IMG_WIDTH = 400
const THUMB_IMG_HEIGHT = 400

const md = new MarkdownIt()

/**
   @description extract image from markdown strings
   @param mdStr {string} original markdown string
   @param limit {number} number of image to be extraced
   @return {string} img in span tags html string
*/
const extractImgFromMD = (mdStr: string, limit = 3) => {
  const parsedData = md.parseInline(mdStr, {})

  if (
    parsedData.length == 0 ||
    !parsedData[0].children ||
    parsedData[0].children.length == 0
  )
    return ''

  return parsedData[0].children
    .filter((item) => item.type == 'image')
    .slice(0, limit)
    .map((item, index, array) => {
      const span = document.createElement('span')
      const img = new Image()

      img.alt = item.content

      if (item.attrs) {
        for (const attr of item.attrs) {
          if (attr[0] === 'src') {
            const urlWithParams =
              attr[1] +
              `?w=${THUMB_IMG_WIDTH}&h=${THUMB_IMG_HEIGHT}&q=80&crop=1`
            img.src = urlWithParams
            img.dataset.originalSrc = urlWithParams
            img.dataset.thumbnailSrc = urlWithParams
          } else if (attr[0] === 'title') {
            img.title = attr[1]
          }
        }
      }

      span.className =
        index === array.length - 1 ? 'flex-1 shrink' : 'flex-1 shrink pr-1'
      span.appendChild(img)

      return span.outerHTML
    })
    .join('')
}

const ArticleListItem: React.FC<ArticleListItemProps> = ({
  article,
  siteFrontId,
  onUpdate,
  mode = 'compact',
}) => {
  const isMySelf = useAuthedUserStore((state) => state.isMySelf)
  const checkPermit = useAuthedUserStore((state) => state.permit)
  const rem2pxNum = useRem2PxNum()
  const isMobile = useIsMobile()
  const previewImagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mode !== 'preview' || !previewImagesRef.current) return

    const container = previewImagesRef.current
    const images = container.querySelectorAll('img')

    images.forEach((img) => {
      const originalSrc = img.dataset.originalSrc || img.src
      const metadata = parseImageMetadataFromUrl(originalSrc)

      img.style.width = `${THUMB_IMG_WIDTH}px`
      img.style.aspectRatio = `${THUMB_IMG_WIDTH} / ${THUMB_IMG_HEIGHT}`
      img.style.objectFit = 'cover'

      if (metadata.thumbhash && img.dataset.loaded !== 'thumbhash') {
        try {
          const thumbDataUrl = thumbHashToPreview(metadata.thumbhash)
          img.src = thumbDataUrl
          img.dataset.loaded = 'thumbhash'
        } catch (error) {
          console.warn('Failed to generate thumbhash preview:', error)
        }
      }
    })

    const cleanupLazyLoad = setupLazyLoadImages(container)

    return () => {
      cleanupLazyLoad()
    }
  }, [article.content, mode])

  return (
    <div className="p-3 hover:bg-hover-bg border-b-[1px] rounded-sm">
      {isMobile && (
        <div className="mb-3 text-sm text-text-secondary">
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
            <Link to={`/z/${article.siteFrontId}`} className="leading-3 mx-1">
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
          <Link
            className={cn('mr-2', mode == 'preview' && 'font-bold')}
            to={genArticlePath(article)}
          >
            {article.title}
          </Link>
          {article.link && (
            <span className="text-sm text-primary">
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
        {mode == 'preview' && (
          <div className="mb-1 break-words">
            {summaryText(md2text(article.content), 500)}

            <div
              ref={previewImagesRef}
              className="my-2 flex"
              dangerouslySetInnerHTML={{
                __html: extractImgFromMD(article.content),
              }}
            ></div>
          </div>
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
