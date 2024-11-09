import ky, { KyInstance } from 'ky'
import { Options } from 'node_modules/ky/distribution/types/options'
import { toast } from 'sonner'

import { API_HOST, API_PATH_PREFIX } from '@/contants'
import { ResponseData } from '@/types/types'

const defaultOptions: Options = {
  prefixUrl: `${API_HOST}${API_PATH_PREFIX}`,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  hooks: {
    // beforeRequest: [
    //   (_, opt) => {
    //     console.log('before request opt: ', opt)
    //   },
    // ],
    afterResponse: [
      async (_req, _opt, resp) => {
        const status = resp.status
        const respDup = resp.clone()
        // eslint-disable-next-line
        const data = (await resp.json()) as ResponseData<any>

        if (!resp.ok) {
          switch (true) {
            case status == 400:
              if (data.message) {
                toast.error(data.message)
              } else {
                toast.error('提交数据有误')
              }

              break
            case status == 401:
              toast.error('请登录后再试')
              break
            case status == 403:
              toast.error('禁止访问')
              break
            case status >= 500 && status <= 599:
              toast.error('应用程序出现了问题')
              break
            default:
              console.error('HTTP error: ', resp)
              break
          }
          return
        }

        if (data.code > 0) {
          toast.error(data.message)
        }

        return respDup
      },
    ],
  },
}

const request = ky.create(defaultOptions)

// export const updateRequest = (fn: (opt: Options) => Options) => {
//   if (typeof fn == 'function') {
//     const newOpt = fn(defaultOptions)
//     request = request.extend(newOpt)
//   }
// }

export let authRequst = request

export const setAuthRequest = (r: KyInstance) => {
  authRequst = r
}

export default request
