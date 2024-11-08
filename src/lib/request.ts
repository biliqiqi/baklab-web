import ky from 'ky'
import { toast } from 'sonner'

import { API_HOST, API_PATH_PREFIX } from '@/contants'
import { ResponseData } from '@/types/types'

export default ky.create({
  prefixUrl: `${API_HOST}${API_PATH_PREFIX}`,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  hooks: {
    beforeRequest: [
      (_, opt) => {
        console.log('before request opt: ', opt)
      },
    ],
    afterResponse: [
      async (_req, _opt, resp) => {
        if (!resp.ok) {
          switch (resp.status) {
            case 401:
              toast.error('请登录后再试')
              break
            case 403:
              toast.error('禁止访问')
              break
            case 500:
              toast.error('应用程序出现了问题')
              break
            default:
              console.error('HTTP error: ', resp)
              break
          }
          return
        }

        const respDup = resp.clone()

        // eslint-disable-next-line
        const data = (await resp.json()) as ResponseData<any>
        if (data.code > 0) {
          toast.error(data.message)
        }

        return respDup
      },
    ],
  },
})
