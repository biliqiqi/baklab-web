import { Options } from 'ky'

import { authRequest } from '@/lib/request'

import { CustomRequestOptions, ResponseData, UserData } from '@/types/types'

export const getUser = (
  username: string,
  options?: Options,
  custom?: CustomRequestOptions
) =>
  authRequest.get<ResponseData<UserData>>(`users/${username}`, options, custom)
