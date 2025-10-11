import ky, { AfterResponseHook, BeforeRequestHook } from 'ky'
import { Options } from 'node_modules/ky/distribution/types/options'
import { mergeAll } from 'remeda'
import { toast } from 'sonner'

import { API_HOST, API_PATH_PREFIX } from '@/constants/constants'
import i18n from '@/i18n'
import {
  useAuthedUserStore,
  useNotFoundStore,
  useSiteStore,
  useToastStore,
} from '@/state/global'
import {
  AuthedDataResponse,
  CustomRequestOptions,
  JSONMap,
  ResponseData,
} from '@/types/types'

const isRefreshRequest: (x: Request) => boolean = (req) =>
  req.method.toLowerCase() == 'get' &&
  req.url == `${API_HOST}${API_PATH_PREFIX}refresh_token`

// let siteFrontId = ''

// export const setRequestSite = (frontId: string) => {
//   siteFrontId = frontId
// }

const addLanguageHeader: BeforeRequestHook = (req, _opt) => {
  const currentLanguage = i18n.language
  if (currentLanguage) {
    req.headers.set('X-Language', currentLanguage)
  }
}

const defaultOptions: Options = {
  prefixUrl: `${API_HOST}${API_PATH_PREFIX}`,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  // retry: {
  //   limit: 2,
  //   statusCodes: [401],
  // },
  hooks: {
    beforeRequest: [addLanguageHeader],
    afterResponse: [
      async (req, _opt, resp) => {
        // console.log('response headers: ', resp.headers.get(''))
        const status = resp.status
        const respDup = resp.clone()

        // if (siteFrontId) {
        //   siteFrontId = ''
        // }

        if (!resp.ok) {
          // eslint-disable-next-line
          let data: ResponseData<any> | null = null
          try {
            data = await resp.json()
            if (import.meta.env.DEV) {
              console.log('Response error data:', { status, data })
            }
          } catch (e) {
            if (import.meta.env.DEV) {
              console.error('parse response data error: ', e)
            }
          }

          const createSuccessResponse = (
            responseData: ResponseData<unknown> | null
          ) =>
            new Response(JSON.stringify(responseData || {}), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })

          const handleErrorWithToast = (
            message: string,
            responseData: ResponseData<unknown> | null
          ) => {
            toast.error(message)
            return createSuccessResponse(responseData)
          }

          switch (true) {
            case status == 400:
              console.log('Handling 400 error:', {
                data,
                message: data?.message,
                code: data?.code,
              })
              return handleErrorWithToast(
                data?.message || i18n.t('badRequestError'),
                data
              )
            case status == 401:
              // If refresh request failed, refresh token is expired, logout for re-signin
              if (isRefreshRequest(req)) {
                useAuthedUserStore.getState().logout()
              }
              break
            case status == 403:
              return handleErrorWithToast(
                data?.message || i18n.t('forbiddenError'),
                data
              )
            case status == 429:
              return handleErrorWithToast(i18n.t('tooManyOperations'), data)
            case status >= 500 && status <= 599:
              return handleErrorWithToast(i18n.t('internalServerError'), data)
            default:
              if (data && data.code > 1) {
                return handleErrorWithToast(data.message, data)
              }
              console.error('HTTP error: ', resp)
              break
          }
        }

        return respDup
      },
    ],
  },
}

const addAuthToHeaders: BeforeRequestHook = (req, _opt) => {
  const token = useAuthedUserStore.getState().authToken
  if (token != '') {
    req.headers.set('Authorization', `Bearer ${token}`)
  }
}

const refreshTokenHook: AfterResponseHook = async (req, _opt, resp) => {
  if (!resp.ok && resp.status == 401 && !isRefreshRequest(req)) {
    const refreshSuccess = await refreshAuthState()

    if (refreshSuccess) {
      // Clone the original request and add the new token
      const newReq = req.clone()
      const newToken = useAuthedUserStore.getState().authToken
      if (newToken) {
        newReq.headers.set('Authorization', `Bearer ${newToken}`)
      }

      // Retry the original request with the new token
      return fetch(newReq)
    }
  }

  return resp
}

const authToastHook: AfterResponseHook = (_req, _opt, resp) => {
  if (resp.status == 401) {
    if (!useToastStore.getState().silence) {
      toast.error(i18n.t('unAuthorizedError'))
    }
  }
}

const makeAuthRequestConfigs = (
  custom: CustomRequestOptions = { showAuthToast: true }
): Options => {
  const opt: Options = {
    credentials: 'include',
    hooks: {
      beforeRequest: [addAuthToHeaders],
      afterResponse: [refreshTokenHook],
    },
  }

  if (opt.hooks?.afterResponse) {
    if (custom.showAuthToast) {
      opt.hooks.afterResponse.push(authToastHook)
    }

    if (custom.afterResponseHooks?.length) {
      opt.hooks.afterResponse.push(...custom.afterResponseHooks)
    }
  }

  return opt
}

const instance = ky.create(defaultOptions)

// eslint-disable-next-line
const request = <T = any>(
  url: string,
  kyOptions?: Options,
  custom?: CustomRequestOptions,
  authRequired: boolean = false
): Promise<T> => {
  let kyOpts: Options = {}
  if (custom?.showNotFound) {
    if (
      kyOptions?.hooks?.afterResponse &&
      !kyOptions.hooks.afterResponse.includes(afterHook404)
    ) {
      kyOptions.hooks.afterResponse.push(afterHook404)
      kyOpts = kyOptions
    } else {
      kyOpts = {
        ...kyOptions,
        hooks: {
          afterResponse: [afterHook404],
        },
      }
    }
  } else {
    if (kyOptions) {
      kyOpts = kyOptions
    }
  }

  if (custom?.siteFrontId) {
    kyOpts.prefixUrl = `${API_HOST}${API_PATH_PREFIX}sites/${custom.siteFrontId}`
  } else {
    kyOpts.prefixUrl = `${API_HOST}${API_PATH_PREFIX}`
  }

  const siteState = useSiteStore.getState()
  const method = kyOpts.method || 'get'

  if (siteState.site) {
    if (['post', 'put', 'patch'].includes(method.toLowerCase())) {
      const extra =
        (((kyOpts.json as JSONMap | undefined) || {})['extra'] as
          | JSONMap
          | undefined) || {}

      kyOpts.json = {
        ...(kyOpts.json || {}),
        extra: {
          ...extra,
          siteFrontId: siteState.site.frontId,
        },
      }
    } else if (method.toLowerCase() == 'delete') {
      // @ts-expect-error url search params no error
      const params = new URLSearchParams(kyOpts.searchParams || '')
      let extra: JSONMap | undefined
      try {
        extra = JSON.parse(params.get('extra') || '') as JSONMap
      } catch (err) {
        console.error('json parse error: ', err)
        extra = {}
      }

      // params.set('fromSite', siteState.site.frontId)
      extra['siteFrontId'] = siteState.site.frontId
      kyOpts.searchParams = params
    }
  }

  const authRequestConfigs = makeAuthRequestConfigs(custom)

  if (authRequired) {
    kyOpts.credentials = 'include'
    kyOpts.hooks = {
      ...kyOpts.hooks,
      beforeRequest: [
        ...(kyOpts.hooks?.beforeRequest || []),
        ...(authRequestConfigs.hooks?.beforeRequest || []),
      ],
      afterResponse: [
        ...(kyOpts.hooks?.afterResponse || []),
        ...(authRequestConfigs.hooks?.afterResponse || []),
      ],
    }
  }

  // console.log('request url: ', url)
  // console.log('request credential: ', kyOptions?.credentials)

  return instance(url, kyOpts).json<T>()
}

// eslint-disable-next-line
request.get = <T = any>(
  url: string,
  kyOptions?: Options,
  custom?: CustomRequestOptions
): Promise<T> => request(url, { method: 'get', ...kyOptions }, custom)

// eslint-disable-next-line
request.post = <T = any>(
  url: string,
  kyOptions?: Options,
  custom?: CustomRequestOptions
): Promise<T> => request(url, { method: 'post', ...kyOptions }, custom)

// eslint-disable-next-line
request.put = <T = any>(
  url: string,
  kyOptions?: Options,
  custom?: CustomRequestOptions
): Promise<T> => request(url, { method: 'put', ...kyOptions }, custom)

// eslint-disable-next-line
request.patch = <T = any>(
  url: string,
  kyOptions?: Options,
  custom?: CustomRequestOptions
): Promise<T> => request(url, { method: 'patch', ...kyOptions }, custom)

// eslint-disable-next-line
request.delete = <T = any>(
  url: string,
  kyOptions?: Options,
  custom?: CustomRequestOptions
): Promise<T> => request(url, { method: 'delete', ...kyOptions }, custom)

/**
   refresh access token
   to prevent cycle import, put refreshToken in request.ts
   @param refreshUser whether to read data from database
 */
export const refreshToken = async (refresUser = false) => {
  const params = new URLSearchParams()
  if (refresUser) {
    params.set('refresh_data', '1')
  }

  return request.get<ResponseData<AuthedDataResponse>>(`refresh_token`, {
    credentials: 'include',
    retry: 0,
    searchParams: params,
  })
}

export const refreshAuthState = async (refreshUser = false) => {
  try {
    const {
      data: { token, username, userID, user },
      code,
    } = await refreshToken(refreshUser)

    if (!code) {
      const updateBaseData = useAuthedUserStore.getState().updateBaseData
      updateBaseData(token, username, userID)
      if (refreshUser) {
        const updateUserData = useAuthedUserStore.getState().updateUserData
        updateUserData(user)
      }
      return Promise.resolve(true)
    } else {
      // Refresh token failed with error code
      return Promise.resolve(false)
    }
  } catch (e) {
    console.error('refresh auth state error: ', e)
    // Resolve promise to prevent infinite waiting
    return Promise.resolve(false)
  }
}

// eslint-disable-next-line
export const authRequest = <T = any>(
  url: string,
  kyOptions?: Options,
  custom?: CustomRequestOptions
): Promise<T> => {
  const kyOpts: Options = mergeAll([
    {},
    makeAuthRequestConfigs(custom),
    kyOptions || {},
  ])

  // console.log('merged options: ', kyOpts)

  return request(url, kyOpts, custom, true)
}

// eslint-disable-next-line
authRequest.get = <T = any>(
  url: string,
  kyOptions?: Options,
  custom?: CustomRequestOptions
): Promise<T> => authRequest(url, { method: 'get', ...kyOptions }, custom)

// eslint-disable-next-line
authRequest.post = <T = any>(
  url: string,
  kyOptions?: Options,
  custom?: CustomRequestOptions
): Promise<T> => authRequest(url, { method: 'post', ...kyOptions }, custom)

// eslint-disable-next-line
authRequest.put = <T = any>(
  url: string,
  kyOptions?: Options,
  custom?: CustomRequestOptions
): Promise<T> => authRequest(url, { method: 'put', ...kyOptions }, custom)

// eslint-disable-next-line
authRequest.patch = <T = any>(
  url: string,
  kyOptions?: Options,
  custom?: CustomRequestOptions
): Promise<T> => authRequest(url, { method: 'patch', ...kyOptions }, custom)

// eslint-disable-next-line
authRequest.delete = <T = any>(
  url: string,
  kyOptions?: Options,
  custom?: CustomRequestOptions
): Promise<T> => authRequest(url, { method: 'delete', ...kyOptions }, custom)

export const afterHook404: AfterResponseHook = (_req, _opt, resp) => {
  if (!resp.ok && resp.status == 404) {
    useNotFoundStore.getState().updateNotFound(true)
  }
}

export default request
