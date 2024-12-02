import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getArticle } from './api/article'
import ArticleCard from './components/ArticleCard'
import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'
import { toSync } from './lib/fire-and-forget'
import { Article, ArticleListSort } from './types/types'

export default function ArticlePage() {
  const [loading, setLoading] = useState(false)
  const [article, setArticle] = useState<Article | null>(null)

  const [params, setParams] = useSearchParams()

  const sort = (params.get('sort') as ArticleListSort | null) || 'oldest'

  const { articleID } = useParams()
  const navigate = useNavigate()

  const fetchArticle = toSync(async (showLoading = true) => {
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
        console.log('article resp: ', resp.data)
        if (!resp.code) {
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
  })

  const onSwitchTab = (val: string) => {
    setParams((prevParams) => {
      prevParams.set('sort', val)
      return prevParams
    })
  }

  useEffect(() => {
    fetchArticle()
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
            <ArticleCard
              key={article.id}
              article={article}
              onSuccess={fetchArticle}
              className="mb-4"
            />
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
                <ArticleCard
                  key={item.id}
                  article={item}
                  onSuccess={() => fetchArticle(false)}
                />
              ))
            )}
          </>
        )}
      </BContainer>
    </>
  )
}
