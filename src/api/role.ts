import { authRequest } from '@/lib/request'

import {
  CustomRequestOptions,
  DefaultRoles,
  ResponseData,
  ResponseID,
  Role,
  RoleListResponse,
} from '@/types/types'

export const getRole = (roleId: string, custom?: CustomRequestOptions) =>
  authRequest.get<ResponseData<Role>>(`roles/${roleId}`, {}, custom)

export const getRoles = (
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
    params.set('keywords', String(keywords))
  }

  return authRequest.get<ResponseData<RoleListResponse>>(
    `roles`,
    {
      searchParams: params,
    },
    custom
  )
}

export const submitRole = (
  name: string,
  level: number,
  permissionFrontIDs: string[],
  siteNumLimit: number,
  showRoleName: boolean,
  rateLimitTokens: number,
  rateLimitInterval: number,
  rateLimitEnabled: boolean,
  custom?: CustomRequestOptions
) => {
  return authRequest.post<ResponseData<ResponseID>>(
    `roles`,
    {
      json: {
        name,
        level,
        permissionFrontIDs,
        siteNumLimit,
        showRoleName,
        rateLimitTokens,
        rateLimitInterval,
        rateLimitEnabled,
        extra: { roleName: name },
      },
    },
    custom
  )
}

export const updateRole = (
  roleId: string,
  name: string,
  level: number,
  permissionFrontIDs: string[],
  siteNumLimit: number,
  showRoleName: boolean,
  rateLimitTokens: number,
  rateLimitInterval: number,
  rateLimitEnabled: boolean,
  custom?: CustomRequestOptions
) => {
  return authRequest.patch<ResponseData<ResponseID>>(
    `roles/${roleId}`,
    {
      json: {
        name,
        level,
        permissionFrontIDs,
        siteNumLimit,
        showRoleName,
        rateLimitTokens,
        rateLimitInterval,
        rateLimitEnabled,
        extra: { roleName: name },
      },
    },
    custom
  )
}

export const deleteRole = (
  roleId: string,
  roleName: string,
  custom?: CustomRequestOptions
) => {
  const params = new URLSearchParams()
  params.set('extra', JSON.stringify({ roleName }))

  return authRequest.delete<ResponseData<null>>(
    `roles/${roleId}`,
    {
      searchParams: params,
    },
    custom
  )
}

export const getDefaultRole = (custom?: CustomRequestOptions) =>
  authRequest.get<ResponseData<Role>>(`roles/default`, {}, custom)

export const getDefaultRoles = (custom?: CustomRequestOptions) =>
  authRequest.get<ResponseData<DefaultRoles>>(`roles/defaults`, {}, custom)

export const setDefaultRole = (
  id: string,
  underSite: boolean,
  custom?: CustomRequestOptions
) =>
  authRequest.patch<ResponseData<null>>(
    `roles/${id}/set_default`,
    {
      json: { underSite },
    },
    custom
  )

export default {
  setDefaultRole,
  getDefaultRole,
  deleteRole,
  updateRole,
  submitRole,
  getRoles,
}
