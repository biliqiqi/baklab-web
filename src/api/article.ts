import { Options } from 'ky'

import request, { authRequest } from '@/lib/request'

import {
  ArticleDeleteResponse,
  ArticleItemResponse,
  ArticleListResponse,
  ArticleListSort,
  ArticleListType,
  ArticleResponse,
  ArticleSubmitResponse,
  CustomRequestOptions,
  ResponseData,
  VoteType,
} from '@/types/types'

export const submitArticle = (
  title: string,
  categoryFrontID: string,
  link?: string,
  content?: string
): Promise<ResponseData<ArticleSubmitResponse>> =>
  authRequest.post(`articles/submit`, {
    json: {
      title,
      category: categoryFrontID,
      link,
      content,
    },
  })

export const updateArticle = (
  id: string,
  title?: string,
  categoryFrontID?: string,
  link?: string,
  content?: string
): Promise<ResponseData<ArticleSubmitResponse>> =>
  authRequest.patch(`articles/${id}`, {
    json: {
      title,
      category: categoryFrontID,
      link,
      content,
    },
  })

export const updateReply = (
  id: string,
  content: string,
  replyToId: string
): Promise<ResponseData<ArticleSubmitResponse>> =>
  authRequest.patch(`articles/${id}`, {
    json: {
      content,
      replyToId,
    },
  })

export const submitReply = (
  replyToID: string,
  content: string
): Promise<ResponseData<ArticleSubmitResponse>> =>
  authRequest.post(`articles/${replyToID}/reply`, {
    json: {
      content,
    },
  })

export const getArticleList = (
  page: number,
  pageSize: number,
  sort?: ArticleListSort | null,
  categoryFrontID?: string,
  username?: string,
  listType?: ArticleListType,
  keywords?: string,
  deleted?: boolean
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

  if (username) {
    params.set('username', username)
  }

  if (listType) {
    params.set('type', listType)
  }

  if (keywords) {
    params.set('keywords', keywords)
  }

  if (deleted) {
    params.set('deleted', '1')
  }

  return authRequest.get(`articles`, {
    searchParams: params,
  })
}

export const getArticle = (
  id: string,
  sort?: ArticleListSort,
  opt?: Options,
  custom?: CustomRequestOptions,
  noReplies?: boolean,
  page?: number,
  pageSize?: number
): Promise<ResponseData<ArticleItemResponse>> => {
  const params = new URLSearchParams()
  if (sort) {
    params.set('sort', sort)
  }

  if (noReplies) {
    params.set('no_replies', '1')
  }

  if (page) {
    params.set('page', String(page))
  }

  if (pageSize) {
    params.set('pageSize', String(pageSize))
  }

  return authRequest.get(
    `articles/${id}`,
    {
      searchParams: params,
      ...opt,
    },
    custom
  )
}

export const deleteArticle = (
  id: string,
  deletedBy: string, // 删除者用户名
  reason?: string
) => {
  const params = new URLSearchParams()
  params.set('deleted_by', deletedBy)
  if (reason) {
    params.set('reason', reason)
  }

  return authRequest.delete<ResponseData<ArticleDeleteResponse>>(
    `articles/${id}`,
    { searchParams: params }
  )
}

export const toggleSaveArticle = (id: string) =>
  authRequest.post<ResponseData<ArticleResponse>>(`articles/${id}/toggle_save`)

export const toggleVoteArticle = (id: string, voteType: VoteType) =>
  authRequest.post<ResponseData<ArticleResponse>>(
    `articles/${id}/toggle_vote`,
    {
      json: {
        voteType: voteType,
      },
    }
  )

export const toggleSubscribeArticle = (id: string) =>
  authRequest.post<ResponseData<ArticleResponse>>(
    `articles/${id}/toggle_subscribe`
  )

export const recoverArticle = (id: string) =>
  authRequest.patch<ResponseData<ArticleResponse>>(`articles/${id}/recover`)
