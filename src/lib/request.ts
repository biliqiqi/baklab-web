import ky, { AfterResponseHook, BeforeRequestHook } from 'ky'
import { Options } from 'node_modules/ky/distribution/types/options'
import { toast } from 'sonner'

import { API_HOST, API_PATH_PREFIX } from '@/constants'
import { isLogined, useAuthedUserStore } from '@/state/global'
import { ResponseData, TokenResponse } from '@/types/types'

const isRefreshRequest: (x: Request) => boolean = (req) =>
  req.method.toLowerCase() == 'get' &&
  req.url == `${API_HOST}${API_PATH_PREFIX}refresh_token`

const defaultOptions: Options = {
  prefixUrl: `${API_HOST}${API_PATH_PREFIX}`,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  hooks: {
    // beforeRequest: [
    //   (_req, opt) => {
    //     console.log('options in base request:', opt)
    //   },
    // ],
    afterResponse: [
      async (req, _opt, resp) => {
        // console.log('base request after response hooks: ', resp)
        const status = resp.status
        const respDup = resp.clone()

        if (!resp.ok) {
          // eslint-disable-next-line
          let data: ResponseData<any> | null = null
          try {
            data = await resp.json()
          } catch (e) {
            console.log('after response hook error: ', e)
          }

          switch (true) {
            case status == 400:
              if (data && data.message) {
                toast.error(data.message)
              } else {
                toast.error('提交数据有误')
              }

              break
            case status == 401:
              // console.log(
              //   'is refresh token in base request:',
              //   isRefreshRequest(req)
              // )
              // 如果refresh失败说明登录授权过期，直接退出登录，要求重新授权
              if (isRefreshRequest(req)) {
                useAuthedUserStore.getState().logout()
                toast.error('请认证或登录后再试')
              } else {
                const logined = isLogined(useAuthedUserStore.getState())
                // console.log('logined:', logined)
                if (!logined) {
                  toast.error('请认证或登录后再试')
                }
              }
              break
            case status == 403:
              toast.error('禁止访问')
              break
            case status >= 500 && status <= 599:
              toast.error('应用程序出现了问题')
              break
            default:
              if (data && data.code > 0) {
                toast.error(data.message)
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

const request = ky.create(defaultOptions)

const refresToken = async (): Promise<ResponseData<TokenResponse>> =>
  request.get(`refresh_token`, { credentials: 'include' }).json()

const addAuthToHeaders: BeforeRequestHook = (req, _opt) => {
  const token = useAuthedUserStore.getState().authToken
  if (token != '') {
    req.headers.set('Authorization', `Bearer ${token}`)
  }
}

const refreshTokenHook: AfterResponseHook = async (req, _opt, resp) => {
  if (!resp.ok && resp.status == 401 && !isRefreshRequest(req)) {
    try {
      const data = await refresToken()
      if (!data.code) {
        const state = useAuthedUserStore.getState()
        state.update(data.data.token, state.username, state.email)

        // console.log('refresh token success!')
      }
    } catch (e) {
      console.error('refresh token error: ', e)
    }
  }

  return resp
}

export const authRequest = request.extend({
  credentials: 'include',
  hooks: {
    beforeRequest: [addAuthToHeaders],
    afterResponse: [refreshTokenHook],
  },
})

export default request
