import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import BContainer from './components/base/BContainer'

import ArticleForm from './components/ArticleForm'

import { getArticle } from './api/article'
import { toSync } from './lib/fire-and-forget'
import { useAuthedUserStore, useNotFoundStore } from './state/global'
import { Article } from './types/types'

export default function EditPage() {
  const [loading, setLoading] = useState(false)
  const [article, setArticle] = useState<Article | null>(null)
  const { articleId } = useParams()
  const { updateNotFound } = useNotFoundStore()
  const authState = useAuthedUserStore()
  const navigate = useNavigate()

  /* console.log('article id: ', articleId) */

  const fetchArticle = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true)
        }

        if (articleId) {
          const resp = await getArticle(
            articleId,
            'latest',
            {},
            { showNotFound: true },
            true
          )
          console.log('article resp: ', resp.data)
          if (!resp.code) {
            /* setReplyToID(resp.data.article.id) */
            const { article } = resp.data

            article.asMainArticle = true

            if (authState.isMySelf(article.authorId)) {
              if (!authState.permit('article', 'edit_mine')) {
                toast.error('禁止访问')
                navigate('/', { replace: true, flushSync: true })
              }
            } else {
              if (!authState.permit('article', 'edit_others')) {
                toast.error('禁止访问')
                navigate('/', { replace: true, flushSync: true })
              }
            }

            setArticle(article)
            /* setReplyToArticle(article) */
          }
        } else {
          updateNotFound(true)
        }
      } catch (err) {
        console.error('fetch article error: ', err)
      } finally {
        setLoading(false)
      }
    },
    [articleId, navigate]
  )

  const fetchArticleSync = toSync(fetchArticle)

  useEffect(() => {
    fetchArticleSync()
  }, [articleId, navigate])

  return (
    <BContainer
      key="edit_article"
      title="提交"
      category={{
        frontId: 'edit',
        name: '编辑帖子',
        describe: '',
        isFront: true,
      }}
      goBack
      loading={loading}
    >
      {article && <ArticleForm article={article} />}
    </BContainer>
  )
}
