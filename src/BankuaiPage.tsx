import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import BContainer from './components/base/BContainer'

import { DEFAULT_PAGE_SIZE } from '@/constants/constants'

import ArticleListPage from './ArticleListPage'
import ChatPage from './ChatPage'
import { getArticleList } from './api/article'
import { toSync } from './lib/fire-and-forget'
import { useAuthedUserStore, useLoading } from './state/global'
import {
  Article,
  ArticleListSort,
  ArticleListState,
  Category,
  FrontCategory,
} from './types/types'

export default function BankuaiPage() {
  const [currCate, setCurrCate] = useState<Category | null>(null)

  const [list, updateList] = useState<Article[]>([])

  const [pageState, setPageState] = useState<ArticleListState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const authToken = useAuthedUserStore((state) => state.authToken)

  const [params] = useSearchParams()
  const { siteFrontId, categoryFrontId } = useParams()

  const { setLoading } = useLoading()

  const fetchArticles = useCallback(async () => {
    try {
      const page = Number(params.get('page')) || 1
      const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE
      const sort = (params.get('sort') as ArticleListSort | null) || 'best'

      setLoading(true)

      /* if (!siteFrontId) return */

      const resp = await getArticleList(
        page,
        pageSize,
        sort,
        categoryFrontId,
        '',
        undefined,
        '',
        undefined,
        { siteFrontId }
      )
      if (!resp.code) {
        const { data } = resp
        let category: FrontCategory | undefined
        if (data.category) {
          const { frontId, name, describe, siteFrontId } = data.category
          setCurrCate({ ...data.category })
          category = { frontId, name, describe, siteFrontId } as FrontCategory
        } else {
          setCurrCate(null)
        }

        if (data.articles) {
          updateList([...data.articles])
          setPageState({
            currPage: data.currPage,
            pageSize: data.pageSize,
            total: data.articleTotal,
            totalPage: data.totalPage,
            category,
          })
        } else {
          updateList([])
          setPageState({
            currPage: 1,
            pageSize: data.pageSize,
            total: data.articleTotal,
            totalPage: data.totalPage,
            category,
          })
        }
      }
    } catch (e) {
      console.error('get article list error: ', e)
    } finally {
      setLoading(false)
    }
  }, [params, siteFrontId, categoryFrontId, setLoading, setCurrCate])

  useEffect(() => {
    toSync(fetchArticles)()
  }, [params, siteFrontId, authToken, categoryFrontId])

  return (
    <BContainer category={pageState.category}>
      {currCate?.contentForm?.frontId == 'chat' ? (
        <ChatPage
          list={list}
          pageState={pageState}
          currCate={currCate}
          onRefresh={fetchArticles}
        />
      ) : (
        <ArticleListPage
          list={list}
          pageState={pageState}
          currCate={currCate}
          onRefresh={fetchArticles}
        />
      )}
    </BContainer>
  )
}
