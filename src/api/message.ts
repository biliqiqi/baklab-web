import { authRequest } from '@/lib/request'

import {
  MessageStatus,
  NotificationListResponse,
  NotificationUnreadCount,
  ResponseData,
} from '@/types/types'

export const getNotificationUnreadCount = () =>
  authRequest.get<ResponseData<NotificationUnreadCount>>(
    `messages/unread_count`,
    {},
    { showAuthToast: false }
  )

export const getNotifications = (
  page: number,
  pageSize: number,
  status?: MessageStatus
) => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))

  if (status) {
    params.set('status', status)
  }

  return authRequest.get<ResponseData<NotificationListResponse>>(`messages`, {
    searchParams: params,
  })
}

export const readAllNotifications = () =>
  authRequest.post<ResponseData<null>>(`messages/read_all`)

export const readArticle = (articleId: string) =>
  authRequest.post<ResponseData<null>>(`messages/read_article`, {
    json: { articleId },
  })
