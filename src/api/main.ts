import request, { authRequst } from '@/lib/request'

import { EmailVerifyResponse, ResponseData } from '@/types/types'

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
): Promise<ResponseData<EmailVerifyResponse>> =>
  request.post(`email_verify`, { json: { email, code } }).json()

export const completeEmailSign = async (
  email: string,
  username: string,
  password: string
): Promise<ResponseData<null>> =>
  authRequst
    .post(`signup_complete`, { json: { email, username, password } })
    .json()
