export interface ResponseData<T> {
  code: number
  message: string
  data: T
}

export interface EmailVerifyResponse {
  token: string
}
