import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { Card } from './components/ui/card'
import { Skeleton } from './components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'

import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'

import ArticleCard, { ArticleCardSkeleton } from './components/ArticleCard'
import { ListPagination } from './components/ListPagination'

import {
  DEFAULT_PAGE_SIZE,
  EV_ON_EDIT_CLICK,
  EV_ON_REPLY_CLICK,
  REPLY_BOX_PLACEHOLDER_HEIGHT,
} from '@/constants/constants'
import { useSiteParams } from '@/hooks/use-site-params'

import { getArticle, readManyArticle } from './api/article'
import { ArticleContext } from './contexts/ArticleContext'
import { usePermit } from './hooks/use-auth'
import { useRawReplyBoxCache } from './hooks/use-editor-cache'
import useDocumentTitle from './hooks/use-page-title'
import { updateArticleState } from './lib/article-utils'
import { toSync } from './lib/fire-and-forget'
import { bus, scrollToBottom } from './lib/utils'
import {
  useAuthedUserStore,
  useCurrentArticleStore,
  useForceUpdate,
  useLoading,
  useNotFoundStore,
  useReplyBoxStore,
  useSiteStore,
} from './state/global'
import {
  Article,
  ArticleListSort,
  ArticleListState,
  Category,
} from './types/types'

export default function ArticlePage() {
  /* const [loading, setLoading] = useState(false) */
  const [initialized, setInitialized] = useState(false)

  const [article, setArticle] = useState<Article | null>(null)
  const [rootArticle, setRootArticle] = useState<Article | null>(null)
  const [articleCategory, setArticleCategory] = useState<Category | null>(null)

  const { loading, setLoading } = useLoading()
  const { t } = useTranslation()

  const [pageState, setPageState] = useState<ArticleListState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const replyHandlerRef = useRef<((x: Article) => void) | null>(null)
  const editHandlerRef = useRef<((x: Article) => void) | null>(null)

  const [params, setParams] = useSearchParams()
  const { updateNotFound } = useNotFoundStore()

  const { setShowReplyBox, setReplyBoxState } = useReplyBoxStore(
    useShallow(({ setShow, setState }) => ({
      setShowReplyBox: setShow,
      setReplyBoxState: setState,
    }))
  )

  const { isLogined, permit } = useAuthedUserStore(
    useShallow(({ isLogined, permit }) => ({ isLogined, permit }))
  )
  const { forceState } = useForceUpdate()
  const site = useSiteStore((state) => state.site)
  const { setCategoryFrontId } = useCurrentArticleStore()
  const hasReplyPermit = usePermit('article', 'reply')

  const sort = (params.get('sort') as ArticleListSort | null) || 'oldest'

  const { siteFrontId, articleId } = useSiteParams()

  const loadRawCache = useRawReplyBoxCache(siteFrontId || '')

  const fetchArticle = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true)
        }

        const page = Number(params.get('page')) || 1
        const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE

        if (!articleId) {
          updateNotFound(true)
          return
        }

        const resp = await getArticle(
          articleId,
          sort,
          {},
          { showNotFound: true, siteFrontId },
          false,
          page,
          pageSize
        )
        /* console.log('article resp: ', resp.data) */
        if (!resp.code) {
          /* setReplyToID(resp.data.article.id) */
          const { article, category } = resp.data

          article.asMainArticle = true

          setArticle(article)
          setArticleCategory(category)
          setCategoryFrontId(category?.frontId || null)

          setInitialized(true)

          /* setReplyToArticle(article) */
          setReplyBoxState({
            editType: 'reply',
            replyToArticle: article,
            edittingArticle: null,
          })

          if (article.replies) {
            setPageState({
              currPage: article.replies.currPage,
              pageSize: article.replies.pageSize,
              total: article.replies.total,
              totalPage: article.replies.totalPage,
            })
          } else {
            setPageState({
              currPage: 1,
              pageSize: DEFAULT_PAGE_SIZE,
              total: 0,
              totalPage: 0,
            })
          }

          if (article.replyToId != '0') {
            const { code, data } = await getArticle(
              article.replyToId,
              'latest',
              {},
              {},
              true,
              1,
              1
            )
            if (!code) {
              setRootArticle(data.article)
            }
          }

          // Record view statistics for the article and its replies
          const viewedIds: string[] = [article.id]
          if (article.replies?.list) {
            viewedIds.push(...article.replies.list.map((reply) => reply.id))
          }
          readManyArticle(viewedIds).catch((err) => {
            console.error('Failed to record article view:', err)
          })
        }
      } catch (err) {
        console.error('fetch article error: ', err)
      } finally {
        setLoading(false)
      }
    },
    [
      params,
      siteFrontId,
      sort,
      updateNotFound,
      articleId,
      setLoading,
      setReplyBoxState,
      setCategoryFrontId,
    ]
  )

  const fetchArticleSync = toSync(fetchArticle)

  const onSwitchTab = (val: string) => {
    setParams((prevParams) => {
      prevParams.set('sort', val)
      return prevParams
    })
  }

  const onReplyClick = useCallback(
    (article: Article) => {
      setReplyBoxState({
        editType: 'reply',
        replyToArticle: article,
        edittingArticle: null,
      })
    },
    [setReplyBoxState]
  )

  if (!replyHandlerRef.current) {
    replyHandlerRef.current = onReplyClick
  }

  const onEditClick = useCallback(
    (article: Article) => {
      /* setReplyToArticle(parent)
       * setEdittingArticle(article)
       * setIsEditting(true) */
      setReplyBoxState({
        editType: 'edit',
        edittingArticle: article,
        replyToArticle: article.replyToArticle,
      })
    },
    [setReplyBoxState]
  )

  if (!editHandlerRef.current) {
    editHandlerRef.current = onEditClick
  }

  useDocumentTitle(article?.displayTitle || '')

  useEffect(() => {
    if (articleId) {
      fetchArticleSync(true)
    }

    if (replyHandlerRef.current) {
      bus.off(EV_ON_REPLY_CLICK, replyHandlerRef.current)
      bus.on(EV_ON_REPLY_CLICK, replyHandlerRef.current)
    }

    if (editHandlerRef.current) {
      bus.off(EV_ON_EDIT_CLICK, editHandlerRef.current)
      bus.on(EV_ON_EDIT_CLICK, editHandlerRef.current)
    }

    return () => {
      if (replyHandlerRef.current) {
        bus.off(EV_ON_REPLY_CLICK, replyHandlerRef.current)
      }

      if (editHandlerRef.current) {
        bus.off(EV_ON_EDIT_CLICK, editHandlerRef.current)
      }
    }
  }, [articleId])

  useEffect(() => {
    if (initialized && articleId) {
      fetchArticleSync(false)
    }
  }, [params, initialized, forceState, articleId])

  useEffect(() => {
    if (
      article &&
      !article.deleted &&
      !article.locked &&
      article.status == 'published' &&
      isLogined() &&
      (site?.currUserState?.isMember || permit('site', 'manage'))
    ) {
      setShowReplyBox(true)
    } else {
      setShowReplyBox(false)
    }

    return () => {
      setShowReplyBox(false)
    }
  }, [article, isLogined, site, permit, setShowReplyBox])

  useEffect(() => {
    setReplyBoxState({
      disabled: !hasReplyPermit,
    })
  }, [hasReplyPermit, setReplyBoxState])

  useEffect(() => {
    setReplyBoxState({
      mode: 'reply',
      category: null,
      editType: 'reply',
      edittingArticle: null,
      replyToArticle: article,
      mainArticleId: article?.id,
      onSuccess(_resp, actionType) {
        toSync(fetchArticle, () => {
          if (actionType == 'reply') {
            scrollToBottom('smooth')
          }
        })(false)
        /* fetchArticleSync(false) */
      },
      onRemoveReply() {
        setReplyBoxState({
          editType: 'reply',
          edittingArticle: null,
          replyToArticle: article,
          mainArticleId: article?.id,
        })
      },
    })
  }, [article, setReplyBoxState, fetchArticle])

  useEffect(() => {
    if (!article || !initialized) return

    const rawCache = loadRawCache()
    if (rawCache) {
      const cacheData = rawCache as {
        editType?: string
        content?: string
        targetArticle?: {
          id: string
          authorName: string
          summary: string
          deleted: boolean
        }
        mainArticleId?: string
      }

      if (cacheData.editType === 'reply') {
        if (
          cacheData.content &&
          cacheData.targetArticle &&
          cacheData.mainArticleId === article.id
        ) {
          if (cacheData.targetArticle.id !== article.id) {
            const cachedTargetArticle: Article = {
              id: cacheData.targetArticle.id,
              authorName: cacheData.targetArticle.authorName,
              summary: cacheData.targetArticle.summary,
              deleted: cacheData.targetArticle.deleted,
              content: cacheData.targetArticle.summary,
            } as Article

            onReplyClick(cachedTargetArticle)
          }
        }
      }
    }

    if (article.replies?.list) {
      for (const reply of article.replies.list) {
        const editCacheKey = `editor-cache-replybox-${siteFrontId}-edit-${reply.id}`
        try {
          const cached = localStorage.getItem(editCacheKey)
          if (cached) {
            const parsed: unknown = JSON.parse(cached)
            if (
              typeof parsed === 'object' &&
              parsed !== null &&
              'data' in parsed
            ) {
              const cacheData = (parsed as { data: unknown }).data as {
                editType?: string
                content?: string
                targetArticle?: {
                  id: string
                  authorName: string
                  summary: string
                  deleted: boolean
                }
                mainArticleId?: string
              }

              if (
                cacheData.editType === 'edit' &&
                cacheData.content &&
                cacheData.targetArticle?.id === reply.id &&
                cacheData.mainArticleId === article.id
              ) {
                onEditClick(reply)
                break
              }
            }
          }
        } catch (error) {
          console.error('Failed to load edit cache:', error)
        }
      }
    }
  }, [
    article,
    loadRawCache,
    initialized,
    onReplyClick,
    onEditClick,
    siteFrontId,
  ])

  useEffect(() => {
    return () => {
      setCategoryFrontId(null)
    }
  }, [setCategoryFrontId])

  return (
    <>
      <BContainer
        category={
          article && articleCategory
            ? {
                frontId: articleCategory.frontId,
                name: articleCategory.name,
                describe: articleCategory.describe,
                siteFrontId: articleCategory.siteFrontId,
                isFront: false,
              }
            : undefined
        }
        goBack
        style={{ paddingBottom: `${REPLY_BOX_PLACEHOLDER_HEIGHT}px` }}
        loading={loading}
      >
        {!initialized ? (
          <>
            <Card className="mb-3">
              <ArticleCardSkeleton />
            </Card>
            <div className="py-1 mb-3">
              <Skeleton className="w-[210px] h-[44px]"></Skeleton>
            </div>
            <Card>
              <ArticleCardSkeleton />
              <ArticleCardSkeleton />
              <ArticleCardSkeleton />
            </Card>
          </>
        ) : article ? (
          <ArticleContext.Provider
            value={{
              root: article.replyToId == '0' ? article : rootArticle,
              top: article,
            }}
          >
            <Card className="mb-3">
              <ArticleCard
                isTop
                key={article.id}
                article={article}
                onSuccess={(action) => {
                  if (['up', 'down', 'save', 'subscribe'].includes(action)) {
                    setArticle((prev) =>
                      prev ? updateArticleState(prev, action) : prev
                    )
                  } else {
                    fetchArticleSync(false)
                  }
                }}
              />
            </Card>
            {article.totalReplyCount > 0 && (
              <>
                <div id="comments" className="py-1 mb-3">
                  <Tabs
                    defaultValue="oldest"
                    value={sort}
                    onValueChange={onSwitchTab}
                  >
                    <TabsList>
                      <TabsTrigger value="oldest">{t('timeOrder')}</TabsTrigger>
                      <TabsTrigger value="latest">{t('latest')}</TabsTrigger>
                      <TabsTrigger value="best">{t('best')}</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <Card>
                  {loading ? (
                    <div className="flex justify-center py-2">
                      <BLoader />
                    </div>
                  ) : (
                    article.replies?.list &&
                    article.replies.list.map((item) => (
                      <ArticleCard
                        key={item.id}
                        article={item}
                        className="border-b-[1px]"
                        onSuccess={(action) => {
                          if (
                            ['up', 'down', 'save', 'subscribe'].includes(action)
                          ) {
                            setArticle((prev) => {
                              if (!prev?.replies) return prev
                              return {
                                ...prev,
                                replies: {
                                  ...prev.replies,
                                  list: prev.replies.list.map((reply) =>
                                    reply.id === item.id
                                      ? updateArticleState(reply, action)
                                      : reply
                                  ),
                                },
                              }
                            })
                          } else {
                            fetchArticleSync(false)
                          }
                        }}
                      />
                    ))
                  )}
                </Card>
              </>
            )}
          </ArticleContext.Provider>
        ) : null}
        {pageState.totalPage > 1 && <ListPagination pageState={pageState} />}
      </BContainer>
    </>
  )
}
