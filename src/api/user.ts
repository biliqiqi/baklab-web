import { Options } from 'ky'

import { authRequest } from '@/lib/request'

import {
  ActivityActionType,
  ActivityListResponse,
  CustomRequestOptions,
  ResponseData,
  UserData,
  UserListResponse,
  UserSubmitResponse,
} from '@/types/types'

export const getUser = (
  username: string,
  options?: Options,
  custom?: CustomRequestOptions
) =>
  authRequest.get<ResponseData<UserData>>(`users/${username}`, options, custom)

export const getUserList = (
  page?: number,
  pageSize?: number,
  keywords?: string,
  role?: string
) => {
  const params = new URLSearchParams()

  if (keywords) {
    params.set('keywords', keywords)
  }

  if (role) {
    params.set('role', role)
  }

  if (page) {
    params.set('page', String(page))
  }

  if (pageSize) {
    params.set('pageSize', String(pageSize))
  }

  return authRequest.get<ResponseData<UserListResponse>>(`users`, {
    searchParams: params,
  })
}

export const setUserRole = (
  username: string,
  roleFrontId: string,
  remark?: string
) =>
  authRequest.patch<ResponseData<UserSubmitResponse>>(
    `users/${username}/set_role`,
    {
      json: {
        roleFrontId,
        remark: remark || '',
      },
    }
  )

export const getUserActivityList = async (
  username: string,
  userId?: string,
  actType?: ActivityActionType,
  action?: string,
  page?: number,
  pageSize?: number
): Promise<ResponseData<ActivityListResponse>> => {
  const params = new URLSearchParams()
  if (userId) {
    params.set('userId', userId)
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

  return authRequest.get(`users/${username}/activities`, {
    searchParams: params,
  })
}

export const getUserPunishedList = async (username: string) =>
  authRequest.get<ResponseData<ActivityListResponse>>(
    `users/${username}/punished_log`
  )

export const banUser = (username: string, duration: number, reason: string) =>
  authRequest.patch<ResponseData<UserSubmitResponse>>(`users/${username}/ban`, {
    json: {
      duration,
      reason,
    },
  })

export const unBanUser = (username: string) =>
  authRequest.patch<ResponseData<UserSubmitResponse>>(`users/${username}/unban`)
