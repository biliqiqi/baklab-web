import { authRequest } from '@/lib/request'

import {
  ItemExists,
  ResponseData,
  ResponseID,
  Site,
  SiteInviteResponse,
  SiteListResponse,
  SiteStatus,
  SiteVisible,
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

export const setSiteStatus = (
  frontId: string,
  status: SiteStatus,
  reason?: string,
  prevStatus?: SiteStatus
) =>
  authRequest.post<ResponseData<ResponseID>>(`sites/${frontId}/set_status`, {
    json: { status, reason, prevStatus },
  })

export const getSiteList = (
  page?: number,
  pageSize?: number,
  keywords?: string,
  creatorId?: string,
  creatorName?: string,
  visible?: SiteVisible,
  deleted?: boolean,
  status?: SiteStatus
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

  if (creatorId) {
    params.set('creatorId', creatorId)
  }

  if (creatorName) {
    params.set('creatorName', creatorName)
  }

  if (visible != undefined) {
    params.set('visible', String(visible))
  }

  if (deleted != undefined) {
    params.set('deleted', deleted ? '1' : '0')
  }

  if (status != undefined) {
    params.set('status', String(status))
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

export const inviteToSite = (
  frontId: string,
  minutes: number,
  permanent: boolean
) =>
  authRequest.post<ResponseData<SiteInviteResponse>>(
    `sites/${frontId}/invite`,
    { json: { minutes, permanent } }
  )

export const acceptSiteInvite = (frontId: string, code: string) =>
  authRequest.post<ResponseData<null>>(`sites/${frontId}/accept_invite`, {
    json: { code },
  })
