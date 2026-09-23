import { Options } from 'ky'

import { authRequest } from '@/lib/request'

import { DEFAULT_PAGE_SIZE } from '@/constants/constants'
import {
  ActivityActionType,
  ActivityListResponse,
  BannedIPData,
  BannedIPListResponse,
  CustomRequestOptions,
  JSONMap,
  ResponseData,
  UserData,
  UserListResponse,
  UserLoginIPData,
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
  authFrom?: string,
  joinedFrom?: string,
  joinedTo?: string,
  excludedUserIds?: Array<string | number>,
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

  if (authFrom) {
    params.set('auth_from', authFrom)
  }

  if (joinedFrom) {
    params.set('joined_from', joinedFrom)
  }

  if (joinedTo) {
    params.set('joined_to', joinedTo)
  }

  if (excludedUserIds && excludedUserIds.length > 0) {
    excludedUserIds.forEach((id) => {
      if (id !== undefined && id !== null) {
        params.append('excludeIds', String(id))
      }
    })
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

export const banUserByBody = (
  username: string,
  duration: number,
  reason: string
) =>
  authRequest.post<ResponseData<UserSubmitResponse>>(`users/ban`, {
    json: {
      username,
      duration,
      reason,
    },
  })

export const getBannedIPList = (
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  keywords = ''
) =>
  authRequest.get<ResponseData<BannedIPListResponse>>(`banned_ips`, {
    searchParams: {
      page,
      pageSize,
      keywords,
    },
  })

export const banIP = (ip: string, duration: number, reason: string) =>
  authRequest.post<ResponseData<BannedIPData>>(`banned_ips`, {
    json: {
      ip,
      duration,
      reason,
    },
  })

export const unbanIP = (ip: string) =>
  authRequest.post<ResponseData<null>>(`banned_ips/unban`, {
    json: {
      ip,
    },
  })

export const unbanManyIPs = (ips: string[]) =>
  authRequest.post<ResponseData<null>>(`banned_ips/unban_many`, {
    json: {
      ips,
    },
  })

export const getUserLoginIPs = (username: string) =>
  authRequest.get<ResponseData<UserLoginIPData[]>>(
    `users/${username}/login_ips`
  )

export const saveUserUISettings = (settings: JSONMap) =>
  authRequest.post<ResponseData<null>>(`save_ui_settings`, {
    json: { ...settings, xxx: 'aaa' },
  })

export const showUserRoleName = (username: string, show: boolean) =>
  authRequest.post<ResponseData<null>>(`users/${username}/show_role_name`, {
    json: { show },
  })

export const updateUserProfile = (data: {
  introduction?: string
  showRoleName?: boolean
}) =>
  authRequest.patch<ResponseData<UserData>>(`users/profile`, {
    json: data,
  })
