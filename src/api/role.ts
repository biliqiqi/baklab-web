import { authRequest } from '@/lib/request'

import { ResponseData, ResponseID, RoleListResponse } from '@/types/types'

export const getRoles = (page?: number, pageSize?: number) => {
  const params = new URLSearchParams()
  if (page) {
    params.set('page', String(page))
  }

  if (pageSize) {
    params.set('pageSize', String(pageSize))
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
