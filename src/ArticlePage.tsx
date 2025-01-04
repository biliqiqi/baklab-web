import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'

import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'

import ArticleCard from './components/ArticleCard'
import { ListPagination } from './components/ListPagination'
import ReplyBox, { ReplyBoxProps } from './components/ReplyBox'

import {
  DEFAULT_PAGE_SIZE,
  EV_ON_EDIT_CLICK,
  EV_ON_REPLY_CLICK,
} from '@/constants/constants'

import { getArticle } from './api/article'
import { toSync } from './lib/fire-and-forget'
import { bus } from './lib/utils'
import { useNotFoundStore } from './state/global'
import { Article, ArticleListSort, ArticleListState } from './types/types'

type ReplyBoxState = Pick<
  ReplyBoxProps,
  'isEditting' | 'edittingArticle' | 'replyToArticle'
>

export default function ArticlePage() {
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [article, setArticle] = useState<Article | null>(null)

  const [pageState, setPageState] = useState<ArticleListState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const [replyBoxState, setReplyBoxState] = useState<ReplyBoxState>({
    isEditting: false,
    edittingArticle: null,
    replyToArticle: null,
  })

  const replyHandlerRef = useRef<((x: Article) => void) | null>(null)
  const editHandlerRef = useRef<((x: Article) => void) | null>(null)

  const [params, setParams] = useSearchParams()
  const { updateNotFound } = useNotFoundStore()

  const sort = (params.get('sort') as ArticleListSort | null) || 'oldest'

  const { articleID } = useParams()

  const fetchArticle = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true)
        }

        const page = Number(params.get('page')) || 1
        const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE

        if (articleID) {
          const resp = await getArticle(
            articleID,
            sort,
            {},
            { showNotFound: true },
            false,
            page,
            pageSize
          )
          /* console.log('article resp: ', resp.data) */
          if (!resp.code) {
            /* setReplyToID(resp.data.article.id) */
            const { article } = resp.data

            article.asMainArticle = true

            setArticle(article)

            setInitialized(true)

            /* setReplyToArticle(article) */
            setReplyBoxState({
              isEditting: false,
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
          }
        } else {
          updateNotFound(true)
          return
        }
      } catch (err) {
        console.error('fetch article error: ', err)
      } finally {
        setLoading(false)
      }
    },
    [articleID, params]
  )

  const fetchArticleSync = toSync(fetchArticle)

  const onSwitchTab = (val: string) => {
    setParams((prevParams) => {
      prevParams.set('sort', val)
      return prevParams
    })
  }

  const onReplyClick = useCallback((article: Article) => {
    /* setReplyToArticle(article)
     * setIsEditting(false) */
    setReplyBoxState({
      isEditting: false,
      replyToArticle: article,
      edittingArticle: null,
    })
  }, [])

  if (!replyHandlerRef.current) {
    replyHandlerRef.current = onReplyClick
  }

  const onEditClick = useCallback((article: Article) => {
    /* setReplyToArticle(parent)
     * setEdittingArticle(article)
     * setIsEditting(true) */
    setReplyBoxState({
      isEditting: true,
      edittingArticle: article,
      replyToArticle: article.replyToArticle,
    })
  }, [])

  if (!editHandlerRef.current) {
    editHandlerRef.current = onEditClick
  }

  useEffect(() => {
    fetchArticleSync(true)

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
  }, [articleID])

  useEffect(() => {
    if (initialized) {
      fetchArticleSync(false)
    }
  }, [params, initialized])

  return (
    <>
      <BContainer
        category={
          article
            ? {
                frontId: article.category.frontId,
                name: article.category.name,
                describe: article.category.describe,
                isFront: false,
              }
            : undefined
        }
        goBack
        style={{ paddingBottom: 0 }}
        loading={loading}
      >
        {article && (
          <>
            <ArticleCard
              isTop
              key={article.id}
              article={article}
              className="mb-4"
              onSuccess={() => fetchArticleSync(false)}
            />
            {article.totalReplyCount > 0 && (
              <div id="comments" className="py-3 mb-4">
                <Tabs
                  defaultValue="oldest"
                  value={sort}
                  onValueChange={onSwitchTab}
                >
                  <TabsList>
                    <TabsTrigger value="oldest">时间顺序</TabsTrigger>
                    <TabsTrigger value="latest">最新</TabsTrigger>
                    <TabsTrigger value="best">最佳</TabsTrigger>
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
                    onSuccess={() => fetchArticleSync(false)}
                  />
                ))
            )}
          </>
        )}

        {pageState.totalPage > 1 && <ListPagination pageState={pageState} />}

        {article && !article.deleted && (
          <ReplyBox
            {...replyBoxState}
            onSuccess={(_resp, actionType) =>
              fetchArticle(false).then(() => {
                if (actionType == 'reply') {
                  setTimeout(() => {
                    window.scrollTo({
                      top: document.body.scrollHeight,
                      behavior: 'smooth',
                    })
                  }, 0)
                }
              })
            }
            onRemoveReply={() => {
              setReplyBoxState({
                isEditting: false,
                edittingArticle: null,
                replyToArticle: article,
              })
            }}
          />
        )}
      </BContainer>
    </>
  )
}
