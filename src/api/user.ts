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
  roleId?: string,
  roleFrontId?: string,
  custom?: CustomRequestOptions
) => {
  const params = new URLSearchParams()

  if (keywords) {
    params.set('keywords', keywords)
  }

  if (roleId) {
    params.set('roleId', roleId)
  }

  if (roleFrontId) {
    params.set('roleFrontId', roleFrontId)
  }

  if (page) {
    params.set('page', String(page))
  }

  if (pageSize) {
    params.set('pageSize', String(pageSize))
  }

  return authRequest.get<ResponseData<UserListResponse>>(
    `users`,
    {
      searchParams: params,
    },
    custom
  )
}

export const setUserRole = (
  username: string,
  roleId: string,
  remark?: string,
  roleName?: string,
  custom?: CustomRequestOptions
) =>
  authRequest.patch<ResponseData<UserSubmitResponse>>(
    `users/${username}/set_role`,
    {
      json: {
        roleId,
        remark: remark || '',
        roleName,
        extra: {
          roleName,
        },
      },
    },
    custom
  )

export const getUserActivityList = async (
  username: string,
  userId?: string,
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
    `users/${username}/activities`,
    {
      searchParams: params,
    },
    custom
  )
}

export const getUserPunishedList = async (
  username: string,
  custom?: CustomRequestOptions
) =>
  authRequest.get<ResponseData<ActivityListResponse>>(
    `users/${username}/punished_log`,
    {},
    custom
  )

/**
   @param username 被封禁用户
   @param duration 封禁时长（分钟）
   @param reason 封禁原因
 */
export const banUser = (username: string, duration: number, reason: string) =>
  authRequest.patch<ResponseData<UserSubmitResponse>>(`users/${username}/ban`, {
    json: {
      duration,
      reason,
    },
  })

export const unBanUser = (username: string) =>
  authRequest.patch<ResponseData<UserSubmitResponse>>(`users/${username}/unban`)

export const banManyUsers = (
  usernames: string[],
  duration: number,
  reason: string
) =>
  authRequest.post<ResponseData<null>>(`users/ban_many`, {
    json: {
      usernames,
      duration,
      reason,
    },
  })

export const unbanManyUsers = (usernames: string[]) =>
  authRequest.post<ResponseData<null>>(`users/unban_many`, {
    json: {
      usernames,
    },
  })
