import request, { authRequest } from '@/lib/request'

import {
  CreateOAuthClientRequest,
  OAuthAuthorizeConfirmRequest,
  OAuthAuthorizeParams,
  OAuthAuthorizeResponse,
  OAuthClient,
  OAuthClientListResponse,
  OAuthClientResponse,
  OAuthClientStats,
  OAuthTokenRequest,
  OAuthTokenResponse,
  RegenerateSecretResponse,
  SetClientActiveRequest,
  UpdateOAuthClientRequest,
  UserOAuthAuthorizationListResponse,
} from '@/types/oauth'
import { CustomRequestOptions, ResponseData } from '@/types/types'

// OAuth client management interfaces (admin permissions)

export const createOAuthClient = async (
  data: CreateOAuthClientRequest,
  custom?: CustomRequestOptions
): Promise<ResponseData<OAuthClientResponse>> =>
  authRequest.post(`oauth_provider/clients`, { json: data }, custom)

export const listOAuthClients = async (
  page?: number,
  pageSize?: number,
  active?: boolean,
  keywords?: string,
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

  if (keywords) {
    params.set('keywords', keywords)
  }

  return authRequest.get(
    `oauth_provider/clients`,
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
  authRequest.get(`oauth_provider/clients/${clientId}`, {}, custom)

export const updateOAuthClient = async (
  clientId: string,
  data: UpdateOAuthClientRequest,
  custom?: CustomRequestOptions
): Promise<ResponseData<null>> =>
  authRequest.put(`oauth_provider/clients/${clientId}`, { json: data }, custom)

export const deleteOAuthClient = async (
  clientId: string,
  custom?: CustomRequestOptions
): Promise<ResponseData<null>> =>
  authRequest.delete(`oauth_provider/clients/${clientId}`, {}, custom)

export const regenerateClientSecret = async (
  clientId: string,
  custom?: CustomRequestOptions
): Promise<ResponseData<RegenerateSecretResponse>> =>
  authRequest.post(
    `oauth_provider/clients/${clientId}/regenerate-secret`,
    {},
    custom
  )

export const setClientActive = async (
  clientId: string,
  data: SetClientActiveRequest,
  custom?: CustomRequestOptions
): Promise<ResponseData<null>> =>
  authRequest.put(
    `oauth_provider/clients/${clientId}/active`,
    { json: data },
    custom
  )

export const getClientStats = async (
  clientId: string,
  custom?: CustomRequestOptions
): Promise<ResponseData<OAuthClientStats>> =>
  authRequest.get(`oauth_provider/clients/${clientId}/stats`, {}, custom)

export const cleanupExpiredCodes = async (
  custom?: CustomRequestOptions
): Promise<ResponseData<{ message: string }>> =>
  authRequest.post(`oauth_provider/cleanup-expired-codes`, {}, custom)

// OAuth standard authorization flow interfaces

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

  return authRequest.get(
    `oauth_provider/authorize`,
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
  authRequest.post(`oauth_provider/authorize`, { json: data }, custom)

export const exchangeToken = async (
  data: OAuthTokenRequest,
  custom?: CustomRequestOptions
): Promise<OAuthTokenResponse> => {
  // This interface may need to support form format, adjust based on backend implementation
  const response = (await request.post(
    `oauth_provider/token`,
    { json: data },
    custom
  )) as unknown
  return response as OAuthTokenResponse
}

export const exchangeTokenForm = async (
  data: OAuthTokenRequest,
  custom?: CustomRequestOptions
): Promise<OAuthTokenResponse> => {
  // Send request using form format
  const formData = new URLSearchParams()
  formData.set('grant_type', data.grant_type)
  formData.set('code', data.code)
  formData.set('redirect_uri', data.redirect_uri)
  formData.set('client_id', data.client_id)
  formData.set('client_secret', data.client_secret)

  const response = (await request.post(
    `oauth_provider/token`,
    {
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
    custom
  )) as unknown

  return response as OAuthTokenResponse
}

// User OAuth authorization management interfaces

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
    `oauth_provider/authorizations`,
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
  authRequest.delete(`oauth_provider/authorizations/${clientId}`, {}, custom)

export const revokeAllUserAuthorizations = async (
  custom?: CustomRequestOptions
): Promise<ResponseData<null>> =>
  authRequest.delete(`oauth_provider/authorizations`, {}, custom)
