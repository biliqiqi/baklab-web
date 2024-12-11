import request, { authRequest } from '@/lib/request'

import {
  AuthedDataResponse,
  Category,
  ResponseData,
  TokenResponse,
} from '@/types/types'

export const postEmailSinup = async (
  email: string
): Promise<ResponseData<null>> => request.post(`signup`, { json: { email } })

export const postEmailVerify = async (
  email: string,
  code: string
): Promise<ResponseData<TokenResponse>> =>
  request.post(`email_verify`, { json: { email, code } })

export const completeEmailSign = async (
  email: string,
  username: string,
  password: string
): Promise<ResponseData<AuthedDataResponse>> =>
  authRequest.post(`signup_complete`, { json: { email, username, password } })

export const logoutToken = async (): Promise<ResponseData<null>> =>
  authRequest.get(`logout`)

export const postSignin = async (
  account: string,
  password: string
): Promise<ResponseData<AuthedDataResponse>> =>
  request.post(`signin`, {
    credentials: 'include',
    json: { account, password },
  })

export const getCategoryList = async (): Promise<ResponseData<Category[]>> =>
  authRequest.get(`category_list`)
