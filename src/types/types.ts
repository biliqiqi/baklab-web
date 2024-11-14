export interface ResponseData<T> {
  code: number
  message: string
  data: T
}

export interface TokenResponse {
  token: string
}

export interface CategoryOption {
  id: string
  name: string
}
