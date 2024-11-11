import request, { authRequest } from '@/lib/request'

import { ResponseData, TokenResponse } from '@/types/types'

// export const postEmailSinup = async (email: string) => {
//   const resp = await fetch('http://localhost:3001/api/signup', {
//     method: 'POST',
//     headers: {
//       Accept: 'application/json',
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({ email }),
//   })

//   if (!resp.ok) {
//     throw new Error(`HTTP error! status: ${resp.status}`)
//   }

//   const data = resp.json()

//   return data
// }

export const postEmailSinup = async (
  email: string
): Promise<ResponseData<null>> =>
  request.post(`signup`, { json: { email } }).json()

export const postEmailVerify = async (
  email: string,
  code: string
): Promise<ResponseData<TokenResponse>> =>
  request.post(`email_verify`, { json: { email, code } }).json()

interface CompleteEmailSignResponse {
  token: string
  email: string
  username: string
}
export const completeEmailSign = async (
  email: string,
  username: string,
  password: string
): Promise<ResponseData<CompleteEmailSignResponse>> =>
  authRequest
    .post(`signup_complete`, { json: { email, username, password } })
    .json()

export const logoutToken = async (): Promise<ResponseData<null>> =>
  authRequest.get(`logout`).json()
