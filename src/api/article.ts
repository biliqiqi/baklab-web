import request, { authRequest } from '@/lib/request'
import {
  ArticleItemResponse,
  ArticleListResponse,
  ArticleListSort,
  ResponseData,
} from '@/types/types'
import { Options } from 'ky'

interface ArticleSubmitResponse {
  id: string
}

export const submitArticle = (
  title: string,
  categoryFrontID: string,
  link?: string,
  content?: string
): Promise<ResponseData<ArticleSubmitResponse>> =>
  authRequest
    .post(`articles/submit`, {
      json: {
        title,
        category: categoryFrontID,
        link,
        content,
      },
    })
    .json()

export const getArticleList = (
  page: number,
  pageSize: number,
  sort: ArticleListSort | null,
  categoryFrontID: string
): Promise<ResponseData<ArticleListResponse>> => {
  const params = new URLSearchParams()

  if (page > 0) {
    params.set('page', String(page))
  }

  if (pageSize > 0) {
    params.set('pageSize', String(pageSize))
  }

  if (sort) {
    params.set('sort', String(sort))
  }

  if (categoryFrontID) {
    params.set('category', categoryFrontID)
  }

  return request
    .get(`articles`, {
      searchParams: params,
    })
    .json()
}

export const getArticle = (
  id: string,
  opt?: Options
): Promise<ResponseData<ArticleItemResponse>> =>
  request.get(`articles/${id}`, opt).json()
