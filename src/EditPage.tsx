import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import BContainer from './components/base/BContainer'

import ArticleForm from './components/ArticleForm'

import { getArticle } from './api/article'
import { toSync } from './lib/fire-and-forget'
import { useAuthedUserStore, useNotFoundStore } from './state/global'
import { Article } from './types/types'

export default function EditPage() {
  const [loading, setLoading] = useState(false)
  const [article, setArticle] = useState<Article | null>(null)
  const { articleID } = useParams()
  const { updateNotFound } = useNotFoundStore()
  const authState = useAuthedUserStore()

  console.log('article id: ', articleID)

  const fetchArticle = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true)
        }

        if (articleID) {
          const resp = await getArticle(
            articleID,
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

            if (
              !authState.isLogined() ||
              authState.userID != article.authorId
            ) {
              updateNotFound(true)
              return
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
    [articleID]
  )

  const fetchArticleSync = toSync(fetchArticle)

  useEffect(() => {
    fetchArticleSync()
  }, [articleID])

  return (
    <BContainer
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
