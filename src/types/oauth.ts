import { ListPageState, UserData } from './types'

export interface OAuthClient {
  id: number
  clientID: string
  name: string
  description: string
  redirectURI: string
  logoURL: string
  isActive: boolean
  createdBy?: number
  createdAt: string
  updatedAt: string
  creator?: UserData | null
}

export interface CreateOAuthClientRequest {
  name: string
  description: string
  redirectURI: string
  logoURL: string
}

export interface UpdateOAuthClientRequest {
  name: string
  description: string
  redirectURI: string
  logoURL: string
}

export interface OAuthClientResponse {
  id: number
  clientID: string
  name: string
  description: string
  redirectURI: string
  logoURL: string
  isActive: boolean
  createdBy?: number
  createdAt: string
  updatedAt: string
  creator?: UserData | null
  clientSecret?: string
}

export interface OAuthClientListResponse extends ListPageState {
  list: OAuthClient[]
}

export interface OAuthAuthorizeParams {
  response_type: string
  client_id: string
  redirect_uri: string
  scope?: string
  state?: string
}

export interface OAuthTokenRequest {
  grant_type: string
  code: string
  redirect_uri: string
  client_id: string
  client_secret: string
}

export interface OAuthTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface UserOAuthAuthorization {
  id: number
  userID: number
  clientID: string
  clientName: string
  authorizedAt: string
  lastUsedAt?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  user?: UserData | null
  client?: OAuthClient | null
  scopes?: string[] // OAuth权限范围
}

export interface UserOAuthAuthorizationListResponse extends ListPageState {
  list: UserOAuthAuthorization[]
}

export interface OAuthAuthorizeResponse {
  success?: boolean
  needsAuthorization?: boolean
  redirect_url?: string
  code?: string
  state?: string
  error?: string
  error_description?: string
  client?: {
    name: string
    description: string
    logoURL: string
    clientID: string
  }
  user?: {
    username: string
    userID: number
  }
  redirectURI?: string
}

export interface OAuthAuthorizeConfirmRequest {
  client_id: string
  redirect_uri: string
  state?: string
  approved: boolean
}

export interface OAuthClientStats {
  totalUsers: number
  activeUsers: number
  totalAuthorizations: number
  recentAuthorizations: number
}

export interface RegenerateSecretResponse {
  clientSecret: string
}

export interface SetClientActiveRequest {
  isActive: boolean
}

export interface OAuthErrorResponse {
  error: string
  error_description: string
  redirect_url?: string
  state?: string
}