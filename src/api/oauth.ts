import request, { authRequest } from '@/lib/request'
import { ResponseData, CustomRequestOptions } from '@/types/types'
import {
  OAuthClient,
  OAuthClientResponse,
  OAuthClientListResponse,
  CreateOAuthClientRequest,
  UpdateOAuthClientRequest,
  OAuthAuthorizeParams,
  OAuthAuthorizeResponse,
  OAuthAuthorizeConfirmRequest,
  OAuthTokenRequest,
  OAuthTokenResponse,
  UserOAuthAuthorizationListResponse,
  OAuthClientStats,
  RegenerateSecretResponse,
  SetClientActiveRequest,
} from '@/types/oauth'

// OAuth客户端管理接口（管理员权限）

export const createOAuthClient = async (
  data: CreateOAuthClientRequest,
  custom?: CustomRequestOptions
): Promise<ResponseData<OAuthClientResponse>> =>
  authRequest.post(`oauth/clients`, { json: data }, custom)

export const listOAuthClients = async (
  page?: number,
  pageSize?: number,
  active?: boolean,
  custom?: CustomRequestOptions
): Promise<ResponseData<OAuthClientListResponse>> => {
  const params = new URLSearchParams()
  
  if (page) {
    params.set('page', String(page))
  }
  
  if (pageSize) {
    params.set('pageSize', String(pageSize))
  }
  
  if (active !== undefined) {
    params.set('active', String(active))
  }

  return authRequest.get(
    `oauth/clients`,
    {
      searchParams: params,
    },
    custom
  )
}

export const getOAuthClient = async (
  clientId: string,
  custom?: CustomRequestOptions
): Promise<ResponseData<OAuthClient>> =>
  authRequest.get(`oauth/clients/${clientId}`, {}, custom)

export const updateOAuthClient = async (
  clientId: string,
  data: UpdateOAuthClientRequest,
  custom?: CustomRequestOptions
): Promise<ResponseData<null>> =>
  authRequest.put(`oauth/clients/${clientId}`, { json: data }, custom)

export const deleteOAuthClient = async (
  clientId: string,
  custom?: CustomRequestOptions
): Promise<ResponseData<null>> =>
  authRequest.delete(`oauth/clients/${clientId}`, {}, custom)

export const regenerateClientSecret = async (
  clientId: string,
  custom?: CustomRequestOptions
): Promise<ResponseData<RegenerateSecretResponse>> =>
  authRequest.post(`oauth/clients/${clientId}/regenerate-secret`, {}, custom)

export const setClientActive = async (
  clientId: string,
  data: SetClientActiveRequest,
  custom?: CustomRequestOptions
): Promise<ResponseData<null>> =>
  authRequest.put(`oauth/clients/${clientId}/active`, { json: data }, custom)

export const getClientStats = async (
  clientId: string,
  custom?: CustomRequestOptions
): Promise<ResponseData<OAuthClientStats>> =>
  authRequest.get(`oauth/clients/${clientId}/stats`, {}, custom)

export const cleanupExpiredCodes = async (
  custom?: CustomRequestOptions
): Promise<ResponseData<{ message: string }>> =>
  authRequest.post(`oauth/cleanup-expired-codes`, {}, custom)

// OAuth标准授权流程接口

export const authorizeOAuth = async (
  params: OAuthAuthorizeParams,
  custom?: CustomRequestOptions
): Promise<ResponseData<OAuthAuthorizeResponse>> => {
  const searchParams = new URLSearchParams()
  searchParams.set('response_type', params.response_type)
  searchParams.set('client_id', params.client_id)
  searchParams.set('redirect_uri', params.redirect_uri)
  
  if (params.scope) {
    searchParams.set('scope', params.scope)
  }
  
  if (params.state) {
    searchParams.set('state', params.state)
  }

  return request.get(
    `oauth/authorize`,
    {
      searchParams,
    },
    custom
  )
}

export const handleAuthorizeConfirm = async (
  data: OAuthAuthorizeConfirmRequest,
  custom?: CustomRequestOptions
): Promise<ResponseData<{ redirect_url: string }>> =>
  authRequest.post(`oauth/authorize`, { json: data }, custom)

export const exchangeToken = async (
  data: OAuthTokenRequest,
  custom?: CustomRequestOptions
): Promise<OAuthTokenResponse> => {
  // 这个接口可能需要支持form格式，根据后端实现调整
  const response = await request.post(`oauth/token`, { json: data }, custom) as unknown
  return response as OAuthTokenResponse
}

export const exchangeTokenForm = async (
  data: OAuthTokenRequest,
  custom?: CustomRequestOptions
): Promise<OAuthTokenResponse> => {
  // 使用form格式发送请求
  const formData = new URLSearchParams()
  formData.set('grant_type', data.grant_type)
  formData.set('code', data.code)
  formData.set('redirect_uri', data.redirect_uri)
  formData.set('client_id', data.client_id)
  formData.set('client_secret', data.client_secret)

  const response = await request.post(`oauth/token`, {
    body: formData,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }, custom) as unknown
  
  return response as OAuthTokenResponse
}

// 用户OAuth授权管理接口

export const getUserAuthorizations = async (
  page?: number,
  pageSize?: number,
  active?: boolean,
  custom?: CustomRequestOptions
): Promise<ResponseData<UserOAuthAuthorizationListResponse>> => {
  const params = new URLSearchParams()
  
  if (page) {
    params.set('page', String(page))
  }
  
  if (pageSize) {
    params.set('pageSize', String(pageSize))
  }
  
  if (active !== undefined) {
    params.set('active', String(active))
  }

  return authRequest.get(
    `oauth/authorizations`,
    {
      searchParams: params,
    },
    custom
  )
}

export const revokeUserAuthorization = async (
  clientId: string,
  custom?: CustomRequestOptions
): Promise<ResponseData<null>> =>
  authRequest.delete(`oauth/authorizations/${clientId}`, {}, custom)

export const revokeAllUserAuthorizations = async (
  custom?: CustomRequestOptions
): Promise<ResponseData<null>> =>
  authRequest.delete(`oauth/authorizations`, {}, custom)