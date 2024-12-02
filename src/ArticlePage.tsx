import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getArticle } from './api/article'
import ArticleCard from './components/ArticleCard'
import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'
import ReplyBox from './components/ReplyBox'
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'
import { EV_ON_REPLY_CLICK } from './constants'
import { toSync } from './lib/fire-and-forget'
import { bus } from './lib/utils'
import { Article, ArticleListSort } from './types/types'

export default function ArticlePage() {
  const [loading, setLoading] = useState(false)
  const [article, setArticle] = useState<Article | null>(null)
  const [replyBox, setReplyBox] = useState(true)
  const [replyToID, setReplyToID] = useState('0')

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
          setReplyToID(resp.data.article.id)
          setArticle(resp.data.article)
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

  const onReplyClick = (replyToID: string) => {
    console.log('on reply click: ', replyToID)
    setReplyToID(replyToID)
    setReplyBox(true)
  }

  useEffect(() => {
    fetchArticleSync()
    bus.off(EV_ON_REPLY_CLICK, onReplyClick)
    bus.on(EV_ON_REPLY_CLICK, onReplyClick)
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
      >
        {article && (
          <>
            <ArticleCard key={article.id} article={article} className="mb-4" />
            {article.totalReplyCount > 0 && (
              <div
                id="comments"
                className="flex justify-between items-center border-b border-gray-300 py-3 mb-4"
              >
                <span className="font-bold">
                  {article.totalReplyCount} 回复
                </span>
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
            articleID={replyToID}
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
          />
        )}
      </BContainer>
    </>
  )
}
