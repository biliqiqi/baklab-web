import request, { authRequest } from '@/lib/request'

import {
  ActivityActionType,
  ActivityListResponse,
  ArticleHistoryResponse,
  ArticleLogStatus,
  AuthedDataResponse,
  CustomRequestOptions,
  PermissionListResponse,
  ResponseData,
  TokenResponse,
} from '@/types/types'

export const postEmailSinup = async (
  email: string
): Promise<ResponseData<null>> => request.post(`signup`, { json: { email } })

export const postEmailVerify = async (
  email: string,
  code: string
): Promise<ResponseData<TokenResponse>> =>
  request.post(`email_verify`, { json: { email, code } })

export const completeEmailSign = async (
  email: string,
  username: string,
  password: string
): Promise<ResponseData<AuthedDataResponse>> =>
  authRequest.post(`signup_complete`, { json: { email, username, password } })

export const logoutToken = async (): Promise<ResponseData<null>> =>
  authRequest.get(`logout`)

export const postSignin = async (
  account: string,
  password: string
): Promise<ResponseData<AuthedDataResponse>> =>
  request.post(`signin`, {
    credentials: 'include',
    json: { account, password },
  })

export const getActivityList = async (
  userId?: string,
  username?: string,
  actType?: ActivityActionType,
  action?: string,
  page?: number,
  pageSize?: number,
  custom?: CustomRequestOptions
): Promise<ResponseData<ActivityListResponse>> => {
  const params = new URLSearchParams()
  if (userId) {
    params.set('userId', userId)
  }

  if (username) {
    params.set('username', username)
  }

  if (actType) {
    params.set('actType', actType)
  }

  if (action) {
    params.set('action', action)
  }

  if (page) {
    params.set('page', String(page))
  }

  if (pageSize) {
    params.set('pageSize', String(pageSize))
  }

  return authRequest.get(
    `activities`,
    {
      searchParams: params,
    },
    custom
  )
}

export const eventsPong = (clientID: string) =>
  request.get<ResponseData<null>>(`pong`, {
    searchParams: {
      clientID,
    },
  })

export const getPermissionList = (custom?: CustomRequestOptions) =>
  authRequest.get<ResponseData<PermissionListResponse>>(
    `permissions`,
    {},
    custom
  )

export const getSiteUpdates = (
  page?: number,
  pageSize?: number,
  keywords?: string,
  custom?: CustomRequestOptions
) => {
  const params = new URLSearchParams()
  if (page) {
    params.set('page', String(page))
  }

  if (pageSize) {
    params.set('pageSize', String(pageSize))
  }

  if (keywords) {
    params.set('keywords', keywords)
  }

  return authRequest.get<ResponseData<ArticleHistoryResponse>>(
    `updates`,
    {
      searchParams: params,
    },
    custom
  )
}

export const reviewSiteUpdates = (
  historyId: string,
  content: string,
  status: ArticleLogStatus,
  displayTitle?: string,
  isReply?: boolean,
  custom?: CustomRequestOptions
) => {
  return authRequest.post<ResponseData<null>>(
    `updates/${historyId}/review`,
    {
      json: {
        content,
        status,
        extra: {
          reviewArticleResult: status,
          displayTitle,
          isReviewedReply: isReply,
          reason: content,
        },
      },
    },
    custom
  )
}
