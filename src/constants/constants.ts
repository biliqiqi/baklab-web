export const PLATFORM_NAME = 'BakLab'

export const FRONTEND_HOST =
  (import.meta.env.VITE_FRONTEND_HOST as string) || 'http://localhost:5173'

export const API_HOST =
  (import.meta.env.VITE_API_HOST as string) || 'http://localhost:3000'
export const API_PATH_PREFIX =
  (import.meta.env.VITE_API_PATH_PREFIX as string) || '/api/'

export const STATIC_HOST =
  (import.meta.env.VITE_STATIC_HOST as string) || 'https://static.example.com'

export const SERVER_ERR_ACCOUNT_EXIST = 1000

export const ARTICLE_MAX_TITILE_LEN = 255
export const ARTICLE_MAX_CONTENT_LEN = 24000
export const NAV_HEIGHT = 54

export const EV_ON_REPLY_CLICK = 'on_reply_click'
export const EV_ON_EDIT_CLICK = 'on_edit_click'

export const DEFAULT_PAGE_SIZE = 20

export const SINGUP_RETURN_COOKIE_NAME = 'signup_return'

export const LEFT_SIDEBAR_STATE_KEY = 'left_sidebar_state'
export const LEFT_SIDEBAR_DEFAULT_OPEN = true
export const RIGHT_SIDEBAR_STATE_KEY = 'right_sidebar_state'
export const TOP_DRAWER_STATE_KEY = 'top_drawer_state'
export const RIGHT_SIDEBAR_SETTINGS_TYPE_KEY = 'right_sidebar_settings_type'
export const USER_UI_SETTINGS_KEY = 'user_ui_settings'
export const CHAT_DATA_CACHE_KEY = 'chat_data_cache'

export const DEFAULT_THEME = 'system'
export const DEFAULT_FONT_SIZE = '16'
export const DEFAULT_CONTENT_WIDTH = '1200'
export const DEFAULT_INNER_CONTENT_WIDTH = '900'

export const URL_PATTERN =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g

export const DOCK_HEIGHT = 80

export const MAX_BLOCKED_WORD_LEN = 20

export const REPLY_BOX_PLACEHOLDER_HEIGHT = 180

export const MOBILE_BREAKPOINT = 1024

export const DEBUG = (import.meta.env.VITE_DEBUG as string) == 'true'
