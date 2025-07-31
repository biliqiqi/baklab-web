import { authRequest } from '@/lib/request'

import {
  ArticleHistoryResponse,
  BlockedUserList,
  ItemExists,
  ResponseData,
  ResponseID,
  Site,
  SiteBlockedWordList,
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
  logoUrl: string,
  reviewBeforePublish: boolean
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
      reviewBeforePublish,
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
  homePage: string,
  reviewBeforePublish: boolean
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
      reviewBeforePublish,
    },
  })

export const deleteSite = (frontId: string) =>
  authRequest.delete<ResponseData<null>>(`sites/${frontId}`)

export const joinSite = (frontId: string) =>
  authRequest.post<ResponseData<null>>(`sites/${frontId}/join`)

export const quitSite = (frontId: string) =>
  authRequest.post<ResponseData<null>>(`sites/${frontId}/quit`)

export const setSiteStatus = (
  frontId: string,
  status: SiteStatus,
  reason?: string,
  prevStatus?: SiteStatus
) =>
  authRequest.post<ResponseData<ResponseID>>(`sites/${frontId}/set_status`, {
    json: { status, reason, extra: { status, prevStatus } },
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

export const getJoinedSiteList = () =>
  authRequest.get<ResponseData<SiteListResponse>>(`sites/joins`)

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

export const inviteToSite = (frontId: string) =>
  authRequest.post<ResponseData<SiteInviteResponse>>(`sites/${frontId}/invite`)

export const acceptSiteInvite = (frontId: string, code: string) =>
  authRequest.post<ResponseData<null>>(`sites/${frontId}/accept_invite`, {
    json: { code },
  })

export const removeMember = (
  frontId: string,
  userId: string,
  username: string
) =>
  authRequest.post<ResponseData<null>>(`sites/${frontId}/remove_member`, {
    json: { userId, extra: { removedUsers: [username] } },
  })

export const removeMembers = (
  frontId: string,
  userIdArr: number[],
  usernames: string[]
) =>
  authRequest.post<ResponseData<null>>(`sites/${frontId}/remove_members`, {
    json: { userIdArr, extra: { removedUsers: usernames } },
  })

export const blockUser = (frontId: string, userId: string, username: string) =>
  authRequest.post<ResponseData<null>>(`sites/${frontId}/block_user`, {
    json: { userId, extra: { blockedUsers: [username] } },
  })

export const unblockUser = (
  frontId: string,
  userId: string,
  username: string
) =>
  authRequest.post<ResponseData<null>>(`sites/${frontId}/unblock_user`, {
    json: { userId, extra: { unblockedUsers: [username] } },
  })

export const blockUsers = (
  frontId: string,
  userIdArr: number[],
  usernames: string[]
) =>
  authRequest.post<ResponseData<null>>(`sites/${frontId}/block_users`, {
    json: { userIdArr, extra: { blockedUsers: usernames } },
  })

export const unblockUsers = (
  frontId: string,
  userIdArr: number[],
  usernames: string[]
) =>
  authRequest.post<ResponseData<null>>(`sites/${frontId}/unblock_users`, {
    json: { userIdArr, extra: { unblockedUsers: usernames } },
  })

export const getSiteBlocklist = (
  frontId: string,
  page?: number,
  pageSize?: number,
  keywords?: string
) => {
  const params = new URLSearchParams()
  if (keywords) {
    params.set('keywords', keywords)
  }

  if (page) {
    params.set('page', String(page))
  }

  if (pageSize) {
    params.set('pageSize', String(pageSize))
  }

  return authRequest.get<ResponseData<BlockedUserList>>(
    `sites/${frontId}/blocklist`,
    { searchParams: params }
  )
}

export const submitSiteBlockedWords = (frontId: string, words: string[]) =>
  authRequest.post<ResponseData<null>>(`sites/${frontId}/add_blocked_words`, {
    json: { words },
  })

export const removeSiteBlockedWords = (frontId: string, idList: number[]) =>
  authRequest.post<ResponseData<null>>(
    `sites/${frontId}/remove_blocked_words`,
    {
      json: { idList },
    }
  )

export const getSiteBlockedWords = (
  frontId: string,
  keywords?: string,
  page?: number,
  pageSize?: number
) => {
  const params = new URLSearchParams()
  if (keywords) {
    params.set('keywords', keywords)
  }

  if (page) {
    params.set('page', String(page))
  }

  if (pageSize) {
    params.set('pageSize', String(pageSize))
  }

  return authRequest.get<ResponseData<SiteBlockedWordList>>(
    `sites/${frontId}/blocked_words`,
    {
      searchParams: params,
    }
  )
}
