import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getArticle } from './api/article'
import ArticleControls from './components/ArticleControls'
import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'
import BNav from './components/base/BNav'
import { Card } from './components/ui/card'
import { timeAgo, timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { Article } from './types/types'

/* const articleList = mockArticleList as Article[] */

export default function ArticlePage() {
  /* const { articleID } = useParams() */

  /* const article = articleList[0] */
  const [loading, setLoading] = useState(false)
  const [article, setArticle] = useState<Article | null>(null)
  const { articleID } = useParams()
  const navigate = useNavigate()

  const fetchArticle = toSync(async () => {
    try {
      setLoading(true)
      if (articleID) {
        const resp = await getArticle(articleID, {
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
        console.log('article resp: ', resp)
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

  useEffect(() => {
    fetchArticle()
  }, [articleID])

  return (
    <>
      <BNav />
      <BContainer>
        {loading && (
          <div className="flex justify-center py-2">
            <BLoader />
          </div>
        )}
        {article && (
          <Card className="p-3 my-2">
            <h1 className="mb-4 font-bold text-lg">{article.title}</h1>
            <div className="mb-4 text-sm text-gray-500">
              <Link to={'/users/' + article.authorName}>
                {article.authorName}
              </Link>
              发布于
              <span title={timeFmt(article.createdAt, 'YYYY-M-D H:m:s')}>
                {timeAgo(article.createdAt)}
              </span>
            </div>
            <div
              dangerouslySetInnerHTML={{ __html: article.content }}
              className="whitespace-break-spaces mb-4"
            ></div>

            <ArticleControls article={article} showCategoryAndTime={false} />
          </Card>
        )}
      </BContainer>
    </>
  )
}
