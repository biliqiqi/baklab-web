import { PenIcon } from 'lucide-react'
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'
import {
  HTMLAttributes,
  MouseEvent,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { timeAgo, timeFmt } from '@/lib/dayjs-custom'
import { createPhotoSwipeLightbox } from '@/lib/photoswipe-utils'
import {
  buildThumbnailUrl,
  calculateThumbnailDimensions,
  parseImageMetadataFromUrl,
  thumbHashToPreview,
} from '@/lib/thumbhash'
import {
  bus,
  cn,
  highlightElement,
  md2text,
  noop,
  renderMD,
  scrollToElement,
  setupLazyLoadImages,
  summaryText,
} from '@/lib/utils'

import {
  deleteArticle,
  toggleLockArticle,
  toggleReactArticle,
} from '@/api/article'
import {
  EV_ON_EDIT_CLICK,
  EV_ON_REPLY_CLICK,
  NAV_HEIGHT,
} from '@/constants/constants'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useReactOptionsStore,
} from '@/state/global'
import { defaultCurrState } from '@/constants/defaults'
import {
  ARTICLE_LOCK_ACTION,
  Article,
  ArticleAction,
  ArticleReact,
} from '@/types/types'

import ChatControls from './ChatControls'
import ModerationForm, { ReasonSchema } from './ModerationForm'
import BAvatar from './base/BAvatar'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Skeleton } from './ui/skeleton'

interface ChatCardProps extends HTMLAttributes<HTMLDivElement> {
  article: Article
  onSuccess?: (a: ArticleAction, id?: string, updates?: Partial<Article>) => void
  isTop?: boolean
  previewMode?: boolean
}

const ChatCard = forwardRef<HTMLDivElement, ChatCardProps>(
  (
    {
      article,
      onSuccess = noop,
      isTop = false,
      previewMode = false,
      className,
      ...props
    },
    ref
  ) => {
    const [alertOpen, setAlertOpen] = useState(false)
    const contentRef = useRef<HTMLDivElement>(null)
    const lightboxRef = useRef<PhotoSwipeLightbox | null>(null)

    const isMobile = useIsMobile()

    const parent = article.replyToArticle

    /* const { siteFrontId } = useSiteParams() */

    const authStore = useAuthedUserStore()
    /* const permit = useAuthedUserStore((state) => state.permit) */
    const { t } = useTranslation()

    /* const isMyself = useMemo(
     *   () => authStore.isMySelf(article.authorId),
     *   [authStore, article]
     * ) */

    const alertDialog = useAlertDialogStore()
    const isLogined = useAuthedUserStore((state) => state.isLogined)
    const loginWithDialog = useAuthedUserStore((state) => state.loginWithDialog)
    const checkPermit = useAuthedUserStore((state) => state.permit)

    const reactOptions = useReactOptionsStore((state) => state.reactOptions)
    const reactOptionMap = useMemo(() => {
      return reactOptions.reduce((map, react) => {
        map.set(react.id, react)
        return map
      }, new Map<string, ArticleReact>())
    }, [reactOptions])

    const onEditClick = useCallback(
      (e: MouseEvent) => {
        if (!article.asMainArticle) {
          e.preventDefault()
          bus.emit(EV_ON_EDIT_CLICK, article)
        }
      },
      [article]
    )

    const onDelClick = useCallback(
      async (e: MouseEvent) => {
        try {
          e.preventDefault()
          if (!authStore.isMySelf(article.authorId)) {
            setAlertOpen(true)
            return
          }

          const confirmed = await alertDialog.confirm(
            t('confirm'),
            authStore.permit('article', 'delete_others')
              ? t('deleteCofirm')
              : t('irrevocableDeleteConfirm'),
            'danger'
          )

          /* console.log('confirmed: ', confirmed) */
          if (confirmed) {
            const resp = await deleteArticle(
              article.id,
              '',
              '',
              authStore.username,
              {
                siteFrontId: article.siteFrontId,
              }
            )
            if (!resp.code) {
              /* navigate(-1) */
              onSuccess('delete', article.id)
            }
          }
        } catch (err) {
          console.error('delete article failed: ', err)
        }
      },
      [article, alertDialog, authStore, onSuccess, t]
    )

    const onToggleLockClick = useCallback(async () => {
      const confirmed = await alertDialog.confirm(
        t('confirm'),
        article.locked ? t('unlockPostConfirm') : t('lockPostConfirm')
      )
      if (confirmed) {
        const { code } = await toggleLockArticle(
          article.id,
          article.displayTitle,
          article.locked
            ? ARTICLE_LOCK_ACTION.Unlock
            : ARTICLE_LOCK_ACTION.Lock,
          {
            siteFrontId: article.siteFrontId,
          }
        )
        if (!code) {
          onSuccess('lock')
        }
      }
    }, [alertDialog, article, onSuccess, t])

    const onDelConfirmCancel = useCallback(() => {
      setAlertOpen(false)
    }, [])

    const onDelConfirm = useCallback(
      async ({ reason, extra }: ReasonSchema) => {
        try {
          const resp = await deleteArticle(
            article.id,
            article.displayTitle,
            `${reason}\n\n${extra}`,
            authStore.username,
            {
              siteFrontId: article.siteFrontId,
            }
          )
          if (!resp.code) {
            setAlertOpen(false)
            onSuccess('delete', article.id)
          }
        } catch (err) {
          console.error('confirm delete error: ', err)
        }
      },
      [article, onSuccess, authStore.username]
    )

    const onReactClick = useCallback(
      async (reactId: string) => {
        try {
          if (!isLogined()) {
            await loginWithDialog()
            return
          }

          const reactOption = reactOptionMap.get(reactId)
          if (!reactOption) {
            console.warn('React option not found for id:', reactId)
            return
          }

          const resp = await toggleReactArticle(article.id, reactId, {
            siteFrontId: article.siteFrontId,
          })
          if (!resp.code) {
            const currentCounts = article.reactCounts || {}
            const nextCounts = { ...currentCounts }
            const prevFrontId = article.currUserState?.reactFrontId || ''

            if (prevFrontId) {
              const updatedPrevCount = (nextCounts[prevFrontId] || 0) - 1
              if (updatedPrevCount <= 0) {
                delete nextCounts[prevFrontId]
              } else {
                nextCounts[prevFrontId] = updatedPrevCount
              }
            }

            let nextFrontId = prevFrontId
            if (prevFrontId === reactOption.frontId) {
              nextFrontId = ''
            } else {
              nextFrontId = reactOption.frontId
              nextCounts[reactOption.frontId] =
                (nextCounts[reactOption.frontId] || 0) + 1
            }

            const nextCurrUserState = {
              ...(article.currUserState || { ...defaultCurrState }),
              reactFrontId: nextFrontId,
            }

            onSuccess('react', article.id, {
              reactCounts: nextCounts,
              currUserState: nextCurrUserState,
            })
          }
        } catch (err) {
          console.error('toggle react article failed: ', err)
        }
      },
      [
        article.currUserState,
        article.id,
        article.reactCounts,
        article.siteFrontId,
        reactOptionMap,
        onSuccess,
        isLogined,
        loginWithDialog,
      ]
    )

    useEffect(() => {
      if (!contentRef.current) return

      const galleryId = `gallery-${article.id}`
      const imageHandlers = new Map<HTMLImageElement, () => void>()

      const images = contentRef.current.querySelectorAll('img')
      images.forEach((img) => {
        const parent = img.parentElement
        if (parent && !parent.classList.contains('pswp-gallery-item')) {
          const originalSrc = img.src
          const metadata = parseImageMetadataFromUrl(originalSrc)

          img.dataset.originalSrc = originalSrc

          if (metadata.width && metadata.height) {
            const thumbnailDimensions = calculateThumbnailDimensions(
              metadata.width,
              metadata.height,
              isMobile
            )

            img.style.width = `${thumbnailDimensions.width}px`
            img.style.aspectRatio = `${metadata.width} / ${metadata.height}`
            img.style.objectFit = 'cover'

            const thumbnailUrl = buildThumbnailUrl(
              originalSrc,
              thumbnailDimensions.width,
              thumbnailDimensions.height
            )
            img.dataset.thumbnailSrc = thumbnailUrl
          }

          if (metadata.thumbhash) {
            try {
              const thumbDataUrl = thumbHashToPreview(metadata.thumbhash)
              img.src = thumbDataUrl
              img.dataset.loaded = 'thumbhash'
            } catch (error) {
              console.warn('Failed to generate thumbhash preview:', error)
            }
          }

          const wrapper = document.createElement('a')
          wrapper.href = originalSrc
          wrapper.classList.add('pswp-gallery-item')
          wrapper.style.cursor = 'zoom-in'

          if (metadata.thumbhash) {
            try {
              const thumbDataUrl = thumbHashToPreview(metadata.thumbhash)
              wrapper.dataset.pswpMsrc = thumbDataUrl
            } catch (error) {
              console.warn('Failed to set PhotoSwipe thumbnail:', error)
            }
          }

          if (metadata.width && metadata.height) {
            wrapper.dataset.pswpWidth = String(metadata.width)
            wrapper.dataset.pswpHeight = String(metadata.height)
          } else {
            const updateSize = () => {
              if (img.naturalWidth && img.naturalHeight) {
                wrapper.dataset.pswpWidth = String(img.naturalWidth)
                wrapper.dataset.pswpHeight = String(img.naturalHeight)
              }
            }

            if (img.complete && img.naturalWidth) {
              updateSize()
            } else {
              const loadHandler = () => {
                updateSize()
                img.removeEventListener('load', loadHandler)
              }
              img.addEventListener('load', loadHandler)
              imageHandlers.set(img, loadHandler)
            }
          }

          img.parentNode?.insertBefore(wrapper, img)
          wrapper.appendChild(img)
        }
      })

      const cleanupLazyLoad = setupLazyLoadImages(contentRef.current)

      lightboxRef.current = createPhotoSwipeLightbox({
        galleryId,
        isMobile,
      })
      lightboxRef.current.init()

      return () => {
        imageHandlers.forEach((handler, img) => {
          img.removeEventListener('load', handler)
        })
        imageHandlers.clear()
        cleanupLazyLoad()
        lightboxRef.current?.destroy()
        lightboxRef.current = null
      }
    }, [article.id, article.content, isMobile])

    return (
      <div
        id={'message' + article.id}
        className={cn(
          'b-chat-card relative flex items-start px-2 mb-4',
          className
        )}
        {...props}
        ref={ref}
      >
        <div className="sticky flex pr-2" style={{ top: `${NAV_HEIGHT}px` }}>
          {article.deleted && !authStore.permit('article', 'delete_others') ? (
            <span>{t('unknowUser')}</span>
          ) : (
            <Link to={`/users/${article.authorName}`}>
              <BAvatar
                username={article.authorName}
                size={40}
                showUsername={false}
              />
            </Link>
          )}
        </div>
        <div className="max-w-[80%] flex flex-col items-start">
          <Card
            className="b-chat-card__card max-w-full flex-grow-0 relative px-3 py-2"
            tabIndex={0}
          >
            <div className="flex flex-wrap items-center text-sm text-text-secondary mb-2">
              {article.deleted &&
              !authStore.permit('article', 'delete_others') ? (
                <span>{t('unknowUser')}</span>
              ) : (
                <>
                  <Link
                    to={`/users/${article.authorName}`}
                    className="font-bold"
                  >
                    {article.authorName}
                  </Link>
                  {article.showAuthorRoleName && (
                    <Badge
                      variant={'secondary'}
                      className="ml-2 font-normal text-gray-500 whitespace-nowrap"
                    >
                      {article.authorRoleName}
                    </Badge>
                  )}
                </>
              )}
              &nbsp;·&nbsp;
              <span title={timeFmt(article.createdAt, 'YYYY-M-D H:m:s')}>
                {timeAgo(article.createdAt, 'YYYY-M-D H:m')}
              </span>
              {article.updatedAt != article.createdAt && (
                <span
                  title={t('editAt', {
                    time: timeFmt(article.updatedAt, 'YYYY-M-D H:m:s'),
                  })}
                >
                  &nbsp;&nbsp;
                  <PenIcon className="inline-block" size={14} />
                </span>
              )}
            </div>

            <div>
              {parent && (
                <div
                  className="bg-gray-100 rounded-sm py-1 px-2 text-gray-500 text-sm cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault()
                    const parentCommentEl = document.getElementById(
                      'message' + parent.id
                    )

                    if (parentCommentEl) {
                      scrollToElement(parentCommentEl, () => {
                        highlightElement(parentCommentEl, 'b-chat-highlight')
                      })
                    }
                  }}
                >
                  {parent.deleted ? (
                    <i className="text-gray-500 text-sm">
                      &lt;{t('deleted')}&gt;
                    </i>
                  ) : (
                    <span>
                      {parent.authorName}:{' '}
                      {summaryText(md2text(parent.content), 100)}
                    </span>
                  )}
                </div>
              )}
              {article.deleted ? (
                <>
                  <i className="text-gray-500 text-sm">
                    &lt;{t('deleted')}&gt;
                  </i>
                  {authStore.permit('article', 'delete_others') && (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: renderMD(article.content),
                      }}
                      className="b-article-content mb-4"
                    ></div>
                  )}
                </>
              ) : (
                <>
                  <div
                    ref={contentRef}
                    id={`gallery-${article.id}`}
                    dangerouslySetInnerHTML={{
                      __html: renderMD(article.content),
                    }}
                    className="b-article-content mb-2"
                  ></div>
                  {article.reactCounts &&
                    Object.keys(article.reactCounts).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mr-1">
                      {reactOptions
                        .filter(
                          (react) => (article.reactCounts?.[react.frontId] || 0) > 0
                        )
                        .map((react) => {
                          const isActive =
                            article.currUserState?.reactFrontId === react.frontId
                          return (
                            <Button
                              key={react.id}
                              variant="ghost"
                              size="sm"
                              onClick={() => onReactClick(react.id)}
                              disabled={
                                isLogined() && !checkPermit('article', 'react')
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
                              <span>{article.reactCounts?.[react.frontId]}</span>
                            </Button>
                          )
                        })}
                    </div>
                  )}
                </>
              )}
            </div>
            {!article.deleted && !previewMode && (
              <ChatControls
                isTopArticle={isTop}
                article={article}
                onReactOptionClick={onReactClick}
                onCommentClick={(e) => {
                  e.preventDefault()
                  bus.emit(EV_ON_REPLY_CLICK, article)
                }}
                onEditClick={onEditClick}
                onDeleteClick={onDelClick}
                onToggleLockClick={onToggleLockClick}
                onSuccess={onSuccess}
                className="absolute left-[calc(100%+theme(space.1))] max-md:left-auto max-md:right-[theme(space.1)] bottom-0 max-md:-bottom-[46px] z-50"
                tabIndex={0}
              />
            )}
          </Card>
        </div>

        <AlertDialog
          defaultOpen={false}
          open={alertOpen}
          onOpenChange={setAlertOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('confirm')}</AlertDialogTitle>
            </AlertDialogHeader>
            <ModerationForm
              reasonLable={t('deleteReason')}
              destructive
              onSubmit={onDelConfirm}
              onCancel={onDelConfirmCancel}
            />
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }
)

export const ChatCardSkeleton = () => {
  const placeholderText = 'placeholder '.repeat(20)

  return (
    <div className="b-chat-card relative flex items-start px-2 mb-4">
      <div className="sticky flex pr-2" style={{ top: `${NAV_HEIGHT}px` }}>
        <Skeleton className="w-[40px] h-[40px] rounded-full" />
      </div>
      <div className="max-w-[80%] flex flex-col items-start">
        <Card className="b-chat-card__card max-w-full flex-grow-0 relative px-3 py-2">
          <div className="flex flex-wrap items-center text-sm text-text-secondary mb-2">
            <Skeleton className="w-[120px] h-[18px]" />
          </div>
          <div className="b-article-content mb-2">
            <Skeleton>
              <p className="opacity-0">{placeholderText}</p>
            </Skeleton>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default ChatCard
