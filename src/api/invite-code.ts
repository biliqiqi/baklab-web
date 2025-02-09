import { authRequest } from '@/lib/request'

import { InviteCodeItemResponse, ResponseData } from '@/types/types'

export const getInvite = (code: string) =>
  authRequest.get<ResponseData<InviteCodeItemResponse>>(`invite_codes/${code}`)
