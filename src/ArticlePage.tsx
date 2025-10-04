import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'

import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'

import ArticleCard from './components/ArticleCard'
import { ListPagination } from './components/ListPagination'

import {
  DEFAULT_PAGE_SIZE,
  EV_ON_EDIT_CLICK,
  EV_ON_REPLY_CLICK,
  REPLY_BOX_PLACEHOLDER_HEIGHT,
} from '@/constants/constants'

import { getArticle } from './api/article'
import { ArticleContext } from './contexts/ArticleContext'
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

  const authStore = useAuthedUserStore()
  const { forceState } = useForceUpdate()
  const siteStore = useSiteStore()
  const { setCategoryFrontId } = useCurrentArticleStore()

  const sort = (params.get('sort') as ArticleListSort | null) || 'oldest'

  const { siteFrontId, articleId } = useParams()

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
      authStore.isLogined() &&
      (siteStore.site?.currUserState.isMember ||
        authStore.permit('site', 'manage'))
    ) {
      setShowReplyBox(true)
    } else {
      setShowReplyBox(false)
    }

    return () => {
      setShowReplyBox(false)
    }
  }, [article, authStore, siteStore, setShowReplyBox])

  useEffect(() => {
    setReplyBoxState({
      disabled: !authStore.permit('article', 'reply'),
    })
  }, [authStore, setReplyBoxState])

  useEffect(() => {
    setReplyBoxState({
      mode: 'reply',
      category: null,
      editType: 'reply',
      edittingArticle: null,
      replyToArticle: article,
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
        })
      },
    })
  }, [article, setReplyBoxState, fetchArticle])

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
        {article && (
          <ArticleContext.Provider
            value={{
              root: article.replyToId == '0' ? article : rootArticle,
              top: article,
            }}
          >
            <ArticleCard
              isTop
              key={article.id}
              article={article}
              className="mb-4"
              onSuccess={(action) => {
                if (['up', 'down', 'save', 'subscribe'].includes(action)) {
                  setArticle((prev) => prev ? updateArticleState(prev, action) : prev)
                } else {
                  fetchArticleSync(false)
                }
              }}
            />
            {article.totalReplyCount > 0 && (
              <div id="comments" className="py-3 mb-4">
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
            )}

            {loading ? (
              <div className="flex justify-center py-2">
                <BLoader />
              </div>
            ) : (
              article.replies?.list &&
              article.replies.list
                .filter((item) => !(item.deleted && item.childrenCount == 0))
                .map((item) => (
                  <ArticleCard
                    key={item.id}
                    article={item}
                    onSuccess={(action) => {
                      if (['up', 'down', 'save', 'subscribe'].includes(action)) {
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
          </ArticleContext.Provider>
        )}
        {pageState.totalPage > 1 && <ListPagination pageState={pageState} />}
      </BContainer>
    </>
  )
}
