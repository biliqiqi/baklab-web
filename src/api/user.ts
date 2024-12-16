import { Options } from 'ky'

import { authRequest } from '@/lib/request'

import {
  CustomRequestOptions,
  ResponseData,
  UserData,
  UserListResponse,
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
