import { authRequest } from '@/lib/request'

import {
  ItemExists,
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
  nonMemberInteract: boolean,
  logoUrl: string
) =>
  authRequest.post<ResponseData<ResponseID>>(`sites`, {
    json: {
      name,
      frontId,
      description,
      keywords,
      visible,
      nonMemberInteract,
      logoUrl,
    },
  })

export const updateSite = (
  frontId: string,
  name: string,
  description: string,
  keywords: string,
  visible: boolean,
  nonMemberInteract: boolean,
  logoUrl: string,
  homePage: string
) =>
  authRequest.patch<ResponseData<ResponseID>>(`sites/${frontId}`, {
    json: {
      name,
      description,
      keywords,
      visible,
      nonMemberInteract,
      logoUrl,
      homePage,
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

export const getSiteList = (
  creatorId?: string,
  visible?: boolean,
  keywords?: string
) => {
  const params = new URLSearchParams()
  if (keywords) {
    params.set('keywords', keywords)
  }

  if (creatorId) {
    params.set('creatorId', creatorId)
  }

  if (visible) {
    params.set('visible', String(visible))
  }

  return authRequest.get<ResponseData<SiteListResponse>>(`sites`, {
    searchParams: params,
  })
}

export const getSiteWithFrontId = (frontId: string) =>
  authRequest.get<ResponseData<Site>>(
    `sites/${frontId}`,
    {},
    { showNotFound: true }
  )

export const checkSiteExists = async (frontID: string) => {
  const resp = await authRequest.get<ResponseData<ItemExists>>(
    `sites/${frontID}/check_exists`
  )
  if (!resp.code) {
    return resp.data.exists
  }
  return false
}
