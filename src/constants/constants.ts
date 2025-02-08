import {
  SITE_STATUS,
  SiteStatusColorMap,
  SiteStatusNameMap,
} from '@/types/types'

export const SITE_NAME = 'BiliQiqi'
export const SITE_NAME_CN = '必利淇淇'

// blue
export const SITE_LOGO_IMAGE =
  'https://static.biliqiqi.net/FESP9bIgGLe8NJPCw4uO1soNI9GfSL66'

// deep pink
// export const SITE_LOGO_IMAGE =
//   'https://static.biliqiqi.net/WHqTOjf6jVraf1VPGpLwxkf-pNTNW3Nz'

export const FRONT_END_HOST = 'http://192.168.31.51:5173'

export const API_HOST = 'http://192.168.31.51:3001'
export const API_PATH_PREFIX = '/api/'

export const SERVER_ERR_ACCOUNT_EXIST = 1000

export const ARTICLE_MAX_TITILE_LEN = 255
export const ARTICLE_MAX_CONTENT_LEN = 24000
export const NAV_HEIGHT = 58

export const EV_ON_REPLY_CLICK = 'on_reply_click'
export const EV_ON_EDIT_CLICK = 'on_edit_click'

export const DEFAULT_PAGE_SIZE = 20

export const URL_PATTERN =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g

export const DOCK_HEIGHT = 80

export const SITE_STATUS_NAME_MAP: SiteStatusNameMap = {
  [SITE_STATUS.ReadOnly]: '只读',
  [SITE_STATUS.Normal]: '正常',
  [SITE_STATUS.Pending]: '审核中',
  [SITE_STATUS.Reject]: '被驳回',
  [SITE_STATUS.Banned]: '已封禁',
  [SITE_STATUS.All]: '全部',
}

export const SITE_STATUS_COLOR_MAP: SiteStatusColorMap = {
  [SITE_STATUS.ReadOnly]: 'text-gray-500',
  [SITE_STATUS.Normal]: '',
  [SITE_STATUS.Pending]: 'text-yellow-500',
  [SITE_STATUS.Reject]: 'text-red-500',
  [SITE_STATUS.Banned]: 'text-red-500',
  [SITE_STATUS.All]: '',
}
