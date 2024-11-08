import ky from 'ky'

import { API_HOST, API_PATH_PREFIX } from '@/contants'
import { useToastStore } from '@/state/global'
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
        // const updateToast = useToastStore((state) => state.update)
        const updateToast = useToastStore.getState().update

        if (!resp.ok) {
          switch (resp.status) {
            case 401:
              updateToast(true, '请登录后再试')
              break
            case 403:
              updateToast(true, '禁止访问')
              break
            case 500:
              updateToast(true, '应用程序出现了问题')
              break
            default:
              console.error('HTTP error: ', resp)
              break
          }
          // if (resp.status == 401) {
          //   updateToast(true, '请登录后再试')
          // } else if (resp.status == 500) {
          //   updateToast(true, '应用程序出现了问题')
          // } else {
          //   console.error('HTTP error: ', resp)
          // }
          return
        }

        const respDup = resp.clone()

        // eslint-disable-next-line
        const data = (await resp.json()) as ResponseData<any>
        // console.log('request response data: ', data)
        if (data.code > 599) {
          updateToast(true, data.message)
        }

        return respDup
      },
    ],
  },
})
