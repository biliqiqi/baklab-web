import { Options } from 'ky'

import { authRequest } from '@/lib/request'

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
  SubscribeAction,
  VoteType,
} from '@/types/types'

export const submitArticle = (
  title: string,
  categoryFrontID: string,
  link?: string,
  content?: string,
  custom?: CustomRequestOptions
): Promise<ResponseData<ArticleSubmitResponse>> =>
  authRequest.post(
    `articles/submit`,
    {
      json: {
        title,
        category: categoryFrontID,
        link,
        content,
      },
    },
    custom
  )

export const updateArticle = (
  id: string,
  title?: string,
  categoryFrontID?: string,
  link?: string,
  content?: string,
  custom?: CustomRequestOptions
): Promise<ResponseData<ArticleSubmitResponse>> =>
  authRequest.patch(
    `articles/${id}`,
    {
      json: {
        title,
        category: categoryFrontID,
        link,
        content,
      },
    },
    custom
  )

export const updateReply = (
  id: string,
  content: string,
  replyToId: string,
  custom?: CustomRequestOptions
): Promise<ResponseData<ArticleSubmitResponse>> =>
  authRequest.patch(
    `articles/${id}`,
    {
      json: {
        content,
        replyToId,
      },
    },
    custom
  )

export const submitReply = (
  replyToID: string,
  content: string,
  custom?: CustomRequestOptions
): Promise<ResponseData<ArticleSubmitResponse>> =>
  authRequest.post(
    `articles/${replyToID}/reply`,
    {
      json: {
        content,
      },
    },
    custom
  )

export const getArticleList = (
  page: number,
  pageSize: number,
  sort?: ArticleListSort | null,
  categoryFrontID?: string,
  username?: string,
  listType?: ArticleListType,
  keywords?: string,
  custom?: CustomRequestOptions
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

  return authRequest.get(
    `articles`,
    {
      searchParams: params,
    },
    custom
  )
}

export const getArticleTrash = (
  page: number,
  pageSize: number,
  sort?: ArticleListSort | null,
  categoryFrontID?: string,
  username?: string,
  listType?: ArticleListType,
  keywords?: string,
  custom?: CustomRequestOptions
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

  return authRequest.get(
    `articles/trash`,
    {
      searchParams: params,
    },
    custom
  )
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
  reason?: string,
  custom?: CustomRequestOptions
) => {
  const params = new URLSearchParams()
  params.set('deleted_by', deletedBy)
  if (reason) {
    params.set('reason', reason)
  }

  return authRequest.delete<ResponseData<ArticleDeleteResponse>>(
    `articles/${id}`,
    { searchParams: params },
    custom
  )
}

export const toggleSaveArticle = (id: string, custom?: CustomRequestOptions) =>
  authRequest.post<ResponseData<ArticleResponse>>(
    `articles/${id}/toggle_save`,
    {},
    custom
  )

export const toggleVoteArticle = (
  id: string,
  voteType: VoteType,
  custom?: CustomRequestOptions
) =>
  authRequest.post<ResponseData<ArticleResponse>>(
    `articles/${id}/toggle_vote`,
    {
      json: {
        voteType: voteType,
      },
    },
    custom
  )

export const toggleSubscribeArticle = (
  id: string,
  action?: SubscribeAction,
  custom?: CustomRequestOptions
) =>
  authRequest.post<ResponseData<ArticleResponse>>(
    `articles/${id}/toggle_subscribe`,
    {
      json: {
        action: action || SubscribeAction.Toggle,
      },
    },
    custom
  )

export const recoverArticle = (id: string, custom?: CustomRequestOptions) =>
  authRequest.patch<ResponseData<ArticleResponse>>(
    `articles/${id}/recover`,
    {},
    custom
  )
