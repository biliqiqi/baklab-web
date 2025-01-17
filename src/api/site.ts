import { authRequest } from '@/lib/request'

import {
  ResponseData,
  ResponseID,
  Site,
  SiteListResponse,
  SiteStatus,
} from '@/types/types'

export const submitSite = (
  name: string,
  frontId: string,
  description: string,
  keywords: string,
  visible: boolean,
  logoUrl: string
) =>
  authRequest.post<ResponseData<ResponseID>>(`sites`, {
    json: {
      name,
      frontId,
      description,
      keywords,
      visible,
      logoUrl,
    },
  })

export const updateSite = (
  frontId: string,
  name: string,
  description: string,
  keywords: string,
  visible: boolean,
  logoUrl: string
) =>
  authRequest.patch<ResponseData<ResponseID>>(`sites/${frontId}`, {
    json: {
      name,
      description,
      keywords,
      visible,
      logoUrl,
    },
  })

export const deleteSite = (frontId: string) =>
  authRequest.delete<ResponseData<null>>(`sites/${frontId}`)

export const joinSite = (frontId: string) =>
  authRequest.post<ResponseData<null>>(`sites/${frontId}/join`)

export const setSiteStatus = (frontId: string, status: SiteStatus) =>
  authRequest.post(`sites/${frontId}/set_status`, {
    json: { status },
  })

export const getSiteList = (keywords: string) => {
  const params = new URLSearchParams()
  if (keywords) {
    params.set('keywords', keywords)
  }

  return authRequest.get<ResponseData<SiteListResponse>>(`sites`, {
    searchParams: params,
  })
}

export const getSiteWithFrontId = (frontId: string) =>
  authRequest.get<ResponseData<Site>>(`sites/${frontId}`)
