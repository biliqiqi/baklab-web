import { authRequest } from '@/lib/request'

import { ResponseData, ResponseID, Role, RoleListResponse } from '@/types/types'

export const getRoles = (
  page?: number,
  pageSize?: number,
  keywords?: string
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

  return authRequest.get<ResponseData<RoleListResponse>>(`roles`, {
    searchParams: params,
  })
}

export const submitRole = (
  name: string,
  level: number,
  permissionFrontIDs: string[]
) => {
  return authRequest.post<ResponseData<ResponseID>>(`roles`, {
    json: { name, level, permissionFrontIDs },
  })
}

export const updateRole = (
  roleId: string,
  name: string,
  level: number,
  permissionFrontIDs: string[]
) => {
  return authRequest.patch<ResponseData<ResponseID>>(`roles/${roleId}`, {
    json: { name, level, permissionFrontIDs },
  })
}

export const deleteRole = (roleId: string) => {
  return authRequest.delete<ResponseData<null>>(`roles/${roleId}`)
}

export const getDefaultRole = () =>
  authRequest.get<ResponseData<Role>>(`roles/default`)

export const setDefaultRole = (id: string) =>
  authRequest.patch<ResponseData<null>>(`roles/${id}/set_default`)

export default {
  setDefaultRole,
  getDefaultRole,
  deleteRole,
  updateRole,
  submitRole,
  getRoles,
}
