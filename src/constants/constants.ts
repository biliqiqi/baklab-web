import {
  ArticleStatusColorMap,
  ArticleStatusNameMap,
  SITE_STATUS,
  SiteStatusColorMap,
  SiteStatusNameMap,
} from '@/types/types'

export const SITE_NAME = 'BiliQiqi'
export const SITE_NAME_CN = '必利淇淇'

export const PLATFORM_NAME = 'BiliQiqi'

// blue
export const SITE_LOGO_IMAGE =
  'https://static.biliqiqi.net/FESP9bIgGLe8NJPCw4uO1soNI9GfSL66'

// deep pink
// export const SITE_LOGO_IMAGE =
//   'https://static.biliqiqi.net/WHqTOjf6jVraf1VPGpLwxkf-pNTNW3Nz'

export const FRONT_END_HOST = 'http://192.168.31.51:5173'

export const API_HOST = 'http://192.168.31.51:3001'
export const API_PATH_PREFIX = '/api/'

export const STATIC_HOST_NAME = `static.biliqiqi.net`
export const STATIC_HOST = `https://${STATIC_HOST_NAME}`

export const SERVER_ERR_ACCOUNT_EXIST = 1000

export const ARTICLE_MAX_TITILE_LEN = 255
export const ARTICLE_MAX_CONTENT_LEN = 24000
export const NAV_HEIGHT = 58

export const EV_ON_REPLY_CLICK = 'on_reply_click'
export const EV_ON_EDIT_CLICK = 'on_edit_click'

export const DEFAULT_PAGE_SIZE = 20

export const SINGUP_RETURN_COOKIE_NAME = 'signup_return'

export const LEFT_SIDEBAR_STATE_KEY = 'left_sidebar_state'
export const RIGHT_SIDEBAR_STATE_KEY = 'right_sidebar_state'
export const TOP_DRAWER_STATE_KEY = 'top_drawer_state'
export const RIGHT_SIDEBAR_SETTINGS_TYPE_KEY = 'right_sidebar_settings_type'
export const USER_UI_SETTINGS_KEY = 'user_ui_settings'

export const DEFAULT_THEME = 'system'
export const DEFAULT_FONT_SIZE = '16'
export const DEFAULT_CONTENT_WIDTH = '1200'

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

export const ARTICLE_STATUS_NAME_MAP: ArticleStatusNameMap = {
  pending: '审核中',
  published: '已发布',
  rejected: '已驳回',
  draft: '草稿',
}

export const ARTICLE_STATUS_COLOR_MAP: ArticleStatusColorMap = {
  pending: 'text-yellow-500',
  published: '',
  rejected: 'text-red-500',
  draft: '',
}

export const MAX_BLOCKED_WORD_LEN = 20
