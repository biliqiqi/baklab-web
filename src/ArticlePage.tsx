import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'

import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'

import ArticleCard from './components/ArticleCard'
import ReplyBox from './components/ReplyBox'

import { getArticle } from './api/article'
import { EV_ON_REPLY_CLICK } from './constants'
import { toSync } from './lib/fire-and-forget'
import { bus } from './lib/utils'
import { Article, ArticleListSort } from './types/types'

export default function ArticlePage() {
  const [loading, setLoading] = useState(false)
  const [article, setArticle] = useState<Article | null>(null)
  const [replyBox, setReplyBox] = useState(true)
  /* const [replyToID, setReplyToID] = useState('0') */
  const [replyToArticle, setReplyToArticle] = useState<Article | null>(null)
  const replyHandlerRef = useRef<((x: Article) => void) | null>(null)

  const [params, setParams] = useSearchParams()

  const sort = (params.get('sort') as ArticleListSort | null) || 'oldest'

  const { articleID } = useParams()
  const navigate = useNavigate()

  const fetchArticle = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }

      if (articleID) {
        const resp = await getArticle(articleID, sort, {
          hooks: {
            afterResponse: [
              (_req, _opt, resp) => {
                if (!resp.ok && resp.status == 404) {
                  navigate('/404')
                }
              },
            ],
          },
        })
        /* console.log('article resp: ', resp.data) */
        if (!resp.code) {
          /* setReplyToID(resp.data.article.id) */
          setArticle(resp.data.article)
          setReplyToArticle(resp.data.article)
        }
      } else {
        navigate('/404')
      }
    } catch (err) {
      console.error('fetch article error: ', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchArticleSync = toSync(fetchArticle)

  const onSwitchTab = (val: string) => {
    setParams((prevParams) => {
      prevParams.set('sort', val)
      return prevParams
    })
  }

  const onReplyClick = useCallback((article: Article) => {
    setReplyToArticle(article)
    setReplyBox(true)
  }, [])

  if (!replyHandlerRef.current) {
    replyHandlerRef.current = onReplyClick
  }

  useEffect(() => {
    fetchArticleSync()

    if (replyHandlerRef.current) {
      bus.off(EV_ON_REPLY_CLICK, replyHandlerRef.current)
      bus.on(EV_ON_REPLY_CLICK, replyHandlerRef.current)
    }

    return () => {
      if (replyHandlerRef.current) {
        bus.off(EV_ON_REPLY_CLICK, replyHandlerRef.current)
      }
    }
  }, [articleID, params])

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
      >
        {article && (
          <>
            <ArticleCard key={article.id} article={article} className="mb-4" />
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
              Boolean(article.replies.list) &&
              article.replies.list.map((item) => (
                <ArticleCard key={item.id} article={item} />
              ))
            )}
          </>
        )}

        {replyBox && (
          <ReplyBox
            replyToArticle={replyToArticle}
            onSuccess={() =>
              fetchArticle(false).then(() => {
                setTimeout(() => {
                  window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: 'smooth',
                  })
                }, 0)
              })
            }
            onRemoveReply={() => {
              setReplyToArticle(article)
            }}
          />
        )}
      </BContainer>
    </>
  )
}
