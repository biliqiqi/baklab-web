import { clone } from 'remeda'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

import { refreshAuthState } from '@/lib/request'
import { noop, setRootFontSize } from '@/lib/utils'

import { getReactOptions } from '@/api/article'
import { getCategoryList } from '@/api/category'
import { getContext } from '@/api/main'
import { getNotificationUnreadCount } from '@/api/message'
import { getJoinedSiteList, getSiteWithFrontId } from '@/api/site'
import { DEFAULT_CONTENT_WIDTH } from '@/constants/constants'
import {
  LEFT_SIDEBAR_DEFAULT_OPEN,
  LEFT_SIDEBAR_STATE_KEY,
  RIGHT_SIDEBAR_SETTINGS_TYPE_KEY,
  RIGHT_SIDEBAR_STATE_KEY,
  USER_UI_SETTINGS_KEY,
  VISITED_SITE_LIST_CACHE_KEY,
} from '@/constants/constants'
import { PermitFn, PermitUnderSiteFn } from '@/constants/types'
import i18n from '@/i18n'
import {
  ARTICLE_LIST_MODE,
  Article,
  ArticleListMode,
  ArticleLog,
  ArticleReact,
  Category,
  InviteCode,
  ReplyBoxProps,
  Role,
  SITE_STATUS,
  SITE_UI_MODE,
  SettingsType,
  Site,
  SiteUIMode,
  StringFn,
  Theme,
  UserData,
} from '@/types/types'

export interface ToastState {
  silence: boolean
  update: (silence: boolean) => void
}

export const useToastStore = create<ToastState>((set) => ({
  silence: true,
  update: (silence) => {
    set(() => ({
      silence,
    }))
  },
}))

export type AuthedUserData = Pick<
  AuthedUserState,
  'authToken' | 'username' | 'userID' | 'user' | 'currRole'
>

export const AUTHED_USER_LOCAL_STORE_NAME = 'auth_info'

export const emptyAuthedUserData: AuthedUserData = {
  authToken: '',
  username: '',
  userID: '',
  user: null,
  currRole: null,
}

export interface AuthedUserState {
  authToken: string
  username: string
  userID: string
  user: UserData | null
  currRole: Role | null
  update: (
    token: string,
    username: string,
    userID: string,
    user: UserData | null
  ) => void
  updateBaseData: (token: string, username: string, userID: string) => void
  updateUserData: (user: UserData | null) => void
  updateObj: (fn: (obj: AuthedUserData) => AuthedUserData) => void
  logout: () => void
  loginWithDialog: () => Promise<AuthedUserData>
  isLogined: () => boolean
  isMySelf: (targetUserId: string) => boolean
  /**
     Compare permission level with signined user
     @paramm targetRole Target role to compare with
     @reuturns 0 - same level, 1 - target is uppper level, -1 - target is lower level
   */
  levelCompare: (targetRole: Role) => number
  permit: PermitFn
  permitUnderSite: PermitUnderSiteFn
}

export const updateCurrRole = () => {
  const siteState = useSiteStore.getState()

  if (siteState.site) {
    useAuthedUserStore.setState((state) => ({
      ...state,
      currRole: siteState.site?.currUserRole || null,
    }))
  } else {
    useAuthedUserStore.setState((state) => ({
      ...state,
      currRole: state.user?.role || null,
    }))
  }

  // console.log('currRole: ', useAuthedUserStore.getState().currRole)
}

// const globalModules: PermissionModule[] = ['site', 'platform_manage']

export const useAuthedUserStore = create(
  subscribeWithSelector<AuthedUserState>((set, get) => ({
    ...emptyAuthedUserData,
    update: (token, username, userID, user) => {
      const newState = {
        authToken: token,
        username,
        userID,
        user: clone(user),
      }
      set((state) => ({ ...state, ...newState }))
    },
    updateBaseData(token, username, userID) {
      set((state) => ({
        ...state,
        authToken: token,
        username,
        userID,
      }))
    },
    updateUserData(user) {
      set((state) => ({
        ...state,
        user,
      }))
    },
    updateObj: set,
    loginWithDialog: () =>
      new Promise((resolve, reject) => {
        useDialogStore.getState().updateSignin(true)

        useAuthedUserStore.subscribe((state) => {
          if (isLogined(state)) {
            resolve(state)
          } else {
            reject(new Error('login with dialog failed'))
          }
        })

        useDialogStore.subscribe((state) => {
          if (!state.signin) {
            reject(new Error('login dialog closed'))
          }
        })
      }),
    logout() {
      set((state) => ({
        ...state,
        ...emptyAuthedUserData,
      }))
    },
    isLogined() {
      return isLogined(get())
    },
    isMySelf(targetUserId: string) {
      const state = get()
      return isLogined(state) && String(state.userID) == String(targetUserId)
    },
    levelCompare(targetRole) {
      const { currRole, user } = get()

      if (user?.super) return -1

      if (!currRole) return 1

      if (currRole.level > targetRole.level) {
        return 1
      } else if (currRole.level == targetRole.level) {
        return 0
      } else {
        return -1
      }
    },
    permit(module, action, globalScope) {
      const { user, permitUnderSite } = get()
      const { site } = useSiteStore.getState()
      const permissionId = `${module}.${String(action)}`

      if (!user || user.id == '0' || !module || !action) return false

      if (user.super) return true

      if (user.banned || !user.permissions) return false

      const basePermitted = user.permissions.some(
        (item) => item.frontId == permissionId
      )

      if (site && !globalScope) {
        return permitUnderSite(site, module, action)
      } else {
        return basePermitted
      }
    },
    permitUnderSite(site, module, action) {
      const { user } = get()
      const permissionId = `${module}.${String(action)}`

      if (!user || user.id == '0' || !module || !action) return false

      if (user.super) return true

      if (user.banned || !user.permissions) return false

      const basePermitted = user.permissions.some(
        (item) => item.frontId == permissionId
      )

      if (user.roleFrontId == 'platform_admin') return true

      if (site.status != SITE_STATUS.Normal) {
        return false
      }

      let sitePermitted = false
      if (site.currUserRole?.permissions && site.currUserRole.id != '0') {
        sitePermitted = site.currUserRole.permissions.some(
          (item) => item.frontId == permissionId
        )
      }

      if (sitePermitted) return true

      if (site.allowNonMemberInteract) {
        return basePermitted
      }

      return false
    },
  }))
)

export const setLocalUserUISettings = (data: UserUIStateData) => {
  localStorage.setItem(USER_UI_SETTINGS_KEY, JSON.stringify(data))
}

export const getLocalUserUISettings = () => {
  const userUISettings = localStorage.getItem(USER_UI_SETTINGS_KEY)
  if (userUISettings) {
    try {
      return JSON.parse(userUISettings) as UserUIStateData
    } catch (e) {
      console.error('parse user UI settings failed: ', e)
      return null
    }
  }

  return null
}

export interface BackendUISettings {
  theme?: Theme
  fontSize?: number
  contentWidth?: number
  lang?: string
  articleListMode?: ArticleListMode
}

const isUserUIFormActive = () => {
  const rightSidebarState = useRightSidebarStore.getState()
  return rightSidebarState.open && rightSidebarState.settingsType === 'user_ui'
}

let pendingUISettingsCallback: ((settings: BackendUISettings) => void) | null =
  null

export const registerUISettingsCallback = (
  callback: (settings: BackendUISettings) => void
) => {
  pendingUISettingsCallback = callback
}

export const unregisterUISettingsCallback = () => {
  pendingUISettingsCallback = null
}

// Core logic for applying UI settings (without form interaction check)
const applyUISettingsCore = (settings: BackendUISettings) => {
  const userUIStore = useUserUIStore.getState()

  if (settings.fontSize) {
    setRootFontSize(String(settings.fontSize))
    userUIStore.setState({ fontSize: settings.fontSize })
  }

  if (settings.contentWidth) {
    userUIStore.setState({ contentWidth: settings.contentWidth })
  }

  if (settings.theme) {
    userUIStore.setState({ theme: settings.theme })
  }

  if (settings.articleListMode) {
    userUIStore.setState({ articleListMode: settings.articleListMode })
  }

  if (settings.lang) {
    i18n.changeLanguage(settings.lang).catch(console.error)
  }
}

export const applyBackendUISettings = (settings: BackendUISettings) => {
  if (isUserUIFormActive() && pendingUISettingsCallback) {
    pendingUISettingsCallback(settings)
    return
  }

  applyUISettingsCore(settings)
}

// Allow direct application (for user consent scenarios)
export const forceApplyUISettings = (settings: BackendUISettings) => {
  applyUISettingsCore(settings)
}

useAuthedUserStore.subscribe(
  (state) => state.user,
  (user) => {
    // console.log('user changed')
    updateCurrRole()

    // Initialize UI settings from backend when user logs in
    if (user?.uiSettings) {
      const localUISettings = getLocalUserUISettings()
      const backendTimestamp = (user.uiSettings.updatedAt as number) || 0
      const localTimestamp = localUISettings?.updatedAt || 0

      // Use timestamp-based sync: apply settings from the most recent source
      if (!localUISettings || backendTimestamp > localTimestamp) {
        // Backend settings are newer, apply all backend settings
        applyBackendUISettings(user.uiSettings as BackendUISettings)

        // Update local cache with backend settings
        const backendSettings = user.uiSettings as BackendUISettings
        const currentState = useUserUIStore.getState()
        const defaultFontSize =
          useDefaultFontSizeStore.getState().defaultFontSize
        setLocalUserUISettings({
          theme: backendSettings.theme || currentState.theme,
          fontSize:
            backendSettings.fontSize ||
            currentState.fontSize ||
            Number(defaultFontSize),
          contentWidth:
            backendSettings.contentWidth ||
            currentState.contentWidth ||
            Number(DEFAULT_CONTENT_WIDTH),
          articleListMode:
            backendSettings.articleListMode || currentState.articleListMode,
          updatedAt: backendTimestamp,
        })
      }
      // If local settings are newer (localTimestamp > backendTimestamp), keep local settings
      // This handles cases where backend save failed but local changes were made
    }
  }
)

type IsLogined = (x: AuthedUserState | AuthedUserData) => boolean

export const isLogined: IsLogined = ({ authToken, username, userID }) =>
  Boolean(authToken && username && userID)

export interface DialogState {
  signin: boolean
  updateSignin: (x: boolean) => void
  signup: boolean
  updateSignup: (x: boolean) => void
}

export const useDialogStore = create<DialogState>((set) => ({
  signin: false,
  signup: false,
  alert: false,
  updateSignin(open: boolean) {
    set((state) => ({
      ...state,
      signin: open,
    }))
  },
  updateSignup(open: boolean) {
    set((state) => ({
      ...state,
      signup: open,
    }))
  },
}))

type AlertConfirmType = 'normal' | 'danger'

export interface AlertDialogState {
  type: 'alert' | 'confirm' | 'prompt'
  open: boolean
  title?: string
  description?: string
  confirmBtnText?: string | StringFn
  cancelBtnText?: string | StringFn
  confirmed: boolean
  confirmType: AlertConfirmType
  promptValue: string
  promptPlaceholder?: string
  promptValidator?: (value: string) => boolean
  promptErrorMessage?: string
  setOpen: (open: boolean) => void
  setConfirm: (confirm: boolean) => void
  setPromptValue: (value: string) => void
  alert: (title: string, description?: string) => void
  confirm: (
    title: string,
    description?: string,
    confirmType?: AlertConfirmType,
    state?: AlertDialogData
  ) => Promise<boolean>
  prompt: (
    title: string,
    description?: string,
    placeholder?: string,
    validator?: (value: string) => boolean,
    errorMessage?: string,
    confirmType?: AlertConfirmType
  ) => Promise<string | null>
  setState: (fn: (x: AlertDialogData) => AlertDialogData) => void
}

export type AlertDialogData = Pick<
  AlertDialogState,
  'title' | 'description' | 'confirmBtnText' | 'cancelBtnText'
>

const defaultAlertState: Pick<
  AlertDialogState,
  'title' | 'description' | 'confirmBtnText'
> = {
  title: '',
  description: '',
  confirmBtnText: () => i18n.t('confirm'),
}

const defaultConfirmState: Pick<
  AlertDialogState,
  | 'title'
  | 'description'
  | 'confirmBtnText'
  | 'cancelBtnText'
  | 'confirmed'
  | 'confirmType'
> = {
  ...defaultAlertState,
  cancelBtnText: () => i18n.t('cancel'),
  confirmed: false,
  confirmType: 'normal',
}

export const useAlertDialogStore = create<AlertDialogState>((set, _get) => ({
  type: 'alert',
  open: false,
  ...defaultAlertState,
  ...defaultConfirmState,
  promptValue: '',
  promptPlaceholder: '',
  promptValidator: undefined,
  promptErrorMessage: '',
  setState: set,
  setOpen(open) {
    set((state) => ({
      ...state,
      open,
    }))
  },
  setConfirm(confirmed) {
    set((state) => ({
      ...state,
      confirmed,
    }))
  },
  setPromptValue(value) {
    set((state) => ({
      ...state,
      promptValue: value,
    }))
  },
  alert: (title, description) => {
    set(() => ({
      type: 'alert',
      open: true,
      title,
      description,
      confirmBtnText: defaultAlertState.confirmBtnText,
      confirmType: 'normal',
      promptValue: '',
    }))
  },
  confirm: (title, description, confirmType = 'normal', state) =>
    new Promise<boolean>((resolve, reject) => {
      set(() => ({
        type: 'confirm',
        open: true,
        confirmed: false,
        title,
        description,
        confirmType,
        promptValue: '',
        ...state,
      }))

      useAlertDialogStore.subscribe((state) => {
        if (state.type == 'confirm') {
          if (!state.open) {
            resolve(state.confirmed)
          } else {
            reject(new Error('confirm dialog canceled'))
          }
        }
      })
    }).finally(() => {
      set((state) => ({
        ...state,
        type: 'alert',
        ...defaultAlertState,
        ...defaultConfirmState,
        promptValue: '',
      }))
    }),
  prompt: (
    title,
    description,
    placeholder = '',
    validator,
    errorMessage = '',
    confirmType = 'danger'
  ) =>
    new Promise<string | null>((resolve) => {
      set(() => ({
        type: 'prompt',
        open: true,
        confirmed: false,
        title,
        description,
        confirmType,
        promptValue: '',
        promptPlaceholder: placeholder,
        promptValidator: validator,
        promptErrorMessage: errorMessage,
        confirmBtnText: defaultAlertState.confirmBtnText,
        cancelBtnText: defaultConfirmState.cancelBtnText,
      }))

      const unsubscribe = useAlertDialogStore.subscribe((state) => {
        if (state.type == 'prompt' && !state.open) {
          resolve(state.confirmed ? state.promptValue : null)
          unsubscribe()
        }
      })
    }).finally(() => {
      set((state) => ({
        ...state,
        type: 'alert',
        ...defaultAlertState,
        ...defaultConfirmState,
        promptValue: '',
        promptPlaceholder: '',
        promptValidator: undefined,
        promptErrorMessage: '',
      }))
    }),
}))

// useAlertDialogStore.subscribe((state) => {
//   console.log('dialogStore changed:', state)
//   if (!state.open){
//     if (state.type == 'alert'){

//     }
//   }
// })

export interface NotFoundState {
  showNotFound: boolean
  updateNotFound: (x: boolean) => void
}
export const useNotFoundStore = create<NotFoundState>((set) => ({
  showNotFound: false,
  updateNotFound(show: boolean) {
    set((state) => ({ ...state, showNotFound: show }))
  },
}))

export interface SidebarGroupsOpenState {
  category: boolean
  siteManage: boolean
}

export interface SidebarState {
  open: boolean
  setOpen: (x: boolean) => void
  openMobile: boolean
  setOpenMobile: (x: boolean) => void
  preventMobileCloseUntil: number
  setPreventMobileCloseUntil: (ts: number) => void
  closeMobileSidebar: (opts?: { force?: boolean }) => void
  groupsOpen: SidebarGroupsOpenState
  setGroupsOpen: (
    s:
      | SidebarGroupsOpenState
      | ((s: SidebarGroupsOpenState) => SidebarGroupsOpenState)
  ) => void
}

export const useSidebarStore = create<SidebarState>((set) => {
  const savedState = localStorage.getItem(LEFT_SIDEBAR_STATE_KEY)
  const initialOpen =
    savedState !== null ? savedState === 'true' : LEFT_SIDEBAR_DEFAULT_OPEN

  return {
    open: initialOpen,
    setOpen(open) {
      set((state) => ({ ...state, open }))
      localStorage.setItem(LEFT_SIDEBAR_STATE_KEY, String(open))
    },
    openMobile: false,
    setOpenMobile(openMobile) {
      set((state) => ({ ...state, openMobile }))
      localStorage.setItem(LEFT_SIDEBAR_STATE_KEY, String(openMobile))
    },
    preventMobileCloseUntil: 0,
    setPreventMobileCloseUntil(ts) {
      set((state) => ({ ...state, preventMobileCloseUntil: ts }))
    },
    closeMobileSidebar({ force = false }: { force?: boolean } = {}) {
      set((state) => {
        const now = Date.now()
        if (!force) {
          if (state.preventMobileCloseUntil > now) {
            return state
          }
        }
        return { ...state, openMobile: false, preventMobileCloseUntil: 0 }
      })
    },
    groupsOpen: {
      category: true,
      siteManage: true,
    },
    setGroupsOpen(s) {
      if (typeof s == 'function') {
        set((state) => ({
          ...state,
          groupsOpen: s(state.groupsOpen),
        }))
      } else {
        set((state) => ({
          ...state,
          groupsOpen: s,
        }))
      }
    },
  }
})

export interface RightSidebarState
  extends Pick<
    SidebarState,
    'open' | 'setOpen' | 'openMobile' | 'setOpenMobile'
  > {
  settingsType: SettingsType
  setSettingsType: (sType: SettingsType) => void
}

export const useRightSidebarStore = create(
  subscribeWithSelector<RightSidebarState>((set) => ({
    open: false,
    setOpen(open) {
      set((state) => ({ ...state, open }))
      localStorage.setItem(RIGHT_SIDEBAR_STATE_KEY, String(open))
    },
    openMobile: false,
    setOpenMobile(openMobile) {
      set((state) => ({ ...state, openMobile }))
      localStorage.setItem(RIGHT_SIDEBAR_STATE_KEY, String(openMobile))
    },
    settingsType: 'site_ui',
    setSettingsType(t) {
      set((state) => ({ ...state, settingsType: t }))
    },
  }))
)

useRightSidebarStore.subscribe(
  (state) => state.settingsType,
  (sType) => {
    localStorage.setItem(RIGHT_SIDEBAR_SETTINGS_TYPE_KEY, sType)
  }
)

export interface CategoryState {
  categories: Category[]
  siteFrontId: string | null
  loaded: boolean
  updateCategories: (x: Category[]) => void
  clearCategories: () => void
  fetchCategoryList: (
    siteFrontId: string,
    force?: boolean
  ) => Promise<Category[]>
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  siteFrontId: null,
  loaded: false,
  updateCategories(x) {
    set((state) => ({
      ...state,
      categories: [...x],
      loaded: true,
    }))
  },
  clearCategories() {
    set(() => ({ categories: [], siteFrontId: null, loaded: false }))
  },
  fetchCategoryList: async (siteFrontId, force = false) => {
    const state = get()
    if (!force && state.loaded && state.siteFrontId === siteFrontId) {
      return state.categories
    }

    try {
      const { code, data } = await getCategoryList({ siteFrontId })
      if (!code && data) {
        set(() => ({
          categories: [...data],
          siteFrontId,
          loaded: true,
        }))

        useSiteStore.getState().updateSiteCategories(siteFrontId, data)

        return data
      }
      set(() => ({
        categories: [],
        siteFrontId,
        loaded: false,
      }))
      return []
    } catch (_err) {
      set(() => ({
        categories: [],
        siteFrontId,
        loaded: false,
      }))
      return []
    }
  },
}))

export interface NotificationState {
  unreadCount: number
  setUnreadCount: (count: number) => void
  fetchUnread: () => Promise<number>
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount(count) {
    set(() => ({ unreadCount: count }))
  },
  fetchUnread: async () => {
    const resp = await getNotificationUnreadCount()
    /* console.log('notification unread resp: ', resp) */
    if (!resp.code) {
      set(() => ({ unreadCount: resp.data.total }))
      return resp.data.total
    }
    set(() => ({ unreadCount: 0 }))
    return 0
  },
}))

export type CachedSiteSummary = Pick<Site, 'frontId' | 'name' | 'logoUrl'>

const getCachedSiteListFromStorage = (): CachedSiteSummary[] => {
  const cached = localStorage.getItem(VISITED_SITE_LIST_CACHE_KEY)
  if (!cached) {
    return []
  }

  try {
    const parsed = JSON.parse(cached) as CachedSiteSummary[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter((item): item is CachedSiteSummary =>
        Boolean(item && typeof item.frontId === 'string')
      )
      .map((item) => ({
        frontId: item.frontId,
        name: typeof item.name === 'string' ? item.name : '',
        logoUrl: typeof item.logoUrl === 'string' ? item.logoUrl : '',
      }))
  } catch (err) {
    console.error('parse cached site list failed: ', err)
    return []
  }
}

const persistCachedSiteList = (list: CachedSiteSummary[]) => {
  try {
    localStorage.setItem(VISITED_SITE_LIST_CACHE_KEY, JSON.stringify(list))
  } catch (err) {
    console.error('persist cached site list failed: ', err)
  }
}

const toCachedSiteSummary = (site: Site): CachedSiteSummary => ({
  frontId: site.frontId,
  name: site.name,
  logoUrl: site.logoUrl,
})

export interface SiteState {
  site?: Site | null
  siteList?: Site[] | null
  cachedSiteList: CachedSiteSummary[]
  pendingSiteFrontId: string | null
  homePage: string
  showSiteForm: boolean
  joinTipReadyFrontId: string | null
  setJoinTipReadyFrontId: (frontId: string | null) => void
  editting: boolean
  setEditting: (editing: boolean) => void
  edittingData: Site | null
  setEdittingData: (site: Site | null) => void
  update: (s: Site | null) => void
  updateSiteList: (list: Site[]) => void
  updateSiteCategories: (siteFrontId: string, categories: Category[]) => void
  updateHomePage: (path: string) => void
  fetchSiteData: (siteFrontId: string) => Promise<Site | null>
  fetchSiteList: () => Promise<void>
  setShowSiteForm: (show: boolean) => void
  showSiteAbout: boolean
  setShowSiteAbout: (show: boolean) => void
  loadCachedSiteList: () => void
  cacheVisitedSite: (site: Site) => void
}

export const useSiteStore = create(
  subscribeWithSelector<SiteState>((set, get) => ({
    site: null,
    siteList: null,
    cachedSiteList: [],
    pendingSiteFrontId: null,
    showSiteForm: false,
    joinTipReadyFrontId: null,
    homePage: '/',
    editting: false,
    setJoinTipReadyFrontId(joinTipReadyFrontId) {
      set((state) => ({ ...state, joinTipReadyFrontId }))
    },
    setEditting(editting) {
      set((state) => ({ ...state, editting }))
    },
    edittingData: null,
    setEdittingData(site) {
      set((state) => ({ ...state, edittingData: site }))
    },
    update(s) {
      set((state) => ({ ...state, site: clone(s) }))
    },
    updateSiteList(list) {
      set((state) => ({ ...state, siteList: [...list] }))
    },
    updateSiteCategories(siteFrontId, categories) {
      set((state) => {
        if (!state.siteList) return state
        const updatedSiteList = state.siteList.map((site) =>
          site.frontId === siteFrontId
            ? { ...site, categories: [...categories] }
            : site
        )
        return { ...state, siteList: updatedSiteList }
      })
    },
    updateHomePage(path) {
      set((state) => ({ ...state, homePage: path }))
    },
    setShowSiteForm(show) {
      set((state) => ({ ...state, showSiteForm: show }))
    },
    showSiteAbout: false,
    setShowSiteAbout(show) {
      set((state) => ({ ...state, showSiteAbout: show }))
    },
    loadCachedSiteList() {
      set((state) => ({
        ...state,
        cachedSiteList: getCachedSiteListFromStorage(),
      }))
    },
    cacheVisitedSite(site) {
      const summary = toCachedSiteSummary(site)
      const currentStateList = get().cachedSiteList
      const cachedSites = currentStateList.length
        ? currentStateList
        : getCachedSiteListFromStorage()
      const existingIndex = cachedSites.findIndex(
        (item) => item.frontId === summary.frontId
      )

      if (existingIndex >= 0) return

      const nextList = [...cachedSites, summary].slice(-50)
      persistCachedSiteList(nextList)
      set((state) => ({ ...state, cachedSiteList: nextList }))
    },
    fetchSiteData: async (frontId) => {
      set((state) => ({
        ...state,
        pendingSiteFrontId: frontId,
        joinTipReadyFrontId: null,
      }))

      try {
        const { code, data } = await getSiteWithFrontId(frontId)
        if (!code) {
          set((state) => {
            if (state.pendingSiteFrontId !== frontId) {
              return state
            }
            return {
              ...state,
              site: clone(data),
              homePage: `/z/${data.frontId}${data.homePage}`,
              pendingSiteFrontId: null,
              joinTipReadyFrontId: data.frontId,
            }
          })
          const authedUserState = useAuthedUserStore.getState()
          if (!authedUserState.isLogined()) {
            get().cacheVisitedSite(data)
          }
          return data
        } else {
          set((state) => {
            if (state.pendingSiteFrontId !== frontId) {
              return state
            }
            return {
              ...state,
              site: null,
              homePage: `/`,
              pendingSiteFrontId: null,
              joinTipReadyFrontId: null,
            }
          })
        }
      } catch (err) {
        set((state) => {
          if (state.pendingSiteFrontId !== frontId) {
            return state
          }
          return {
            ...state,
            pendingSiteFrontId: null,
            joinTipReadyFrontId: null,
          }
        })
        console.error('fetch site data error: ', err)
      }
      return get().site ?? null
    },
    fetchSiteList: async () => {
      try {
        const siteStore = get()
        // const authStore = useAuthedUserStore.getState()
        const { code, data } = await getJoinedSiteList()

        if (!code && data.list) {
          siteStore.updateSiteList([...data.list])
        } else {
          siteStore.updateSiteList([])
        }
      } catch (err) {
        console.error('fetch site data error: ', err)
      }
    },
  }))
)

const deriveSiteMode = (
  site: Site | null | undefined,
  isSingleSite: boolean
): SiteUIMode => {
  if (!isSingleSite) {
    return SITE_UI_MODE.Sidebar
  }
  return (
    (site?.uiSettings?.mode as SiteUIMode | undefined) || SITE_UI_MODE.Sidebar
  )
}

useSiteStore.subscribe(
  (state) => state.site,
  (site) => {
    updateCurrRole()
    const siteUIStore = useSiteUIStore.getState()
    const isSingleSite = useContextStore.getState().isSingleSite

    // Always set site mode when site changes, regardless of uiSettings existence
    siteUIStore.setMode(deriveSiteMode(site, isSingleSite))
    siteUIStore.setArticleListMode(
      (site?.uiSettings?.articleListMode as ArticleListMode | undefined) ||
        ARTICLE_LIST_MODE.Preview
    )
  }
)

export interface ForceUpdateState {
  forceState: number
  forceUpdate: () => void
}

export const useForceUpdate = create<ForceUpdateState>((set) => ({
  forceState: 0,
  forceUpdate() {
    set((state) => ({ ...state, forceState: state.forceState + 1 }))
  },
}))

export interface AppState {
  initialized: boolean
  setInitialized: (initialized: boolean) => void
}

export const useAppState = create<AppState>((set) => ({
  initialized: false,
  setInitialized(state) {
    set(() => ({ initialized: state }))
  },
}))

export const ensureLogin = () => {
  const authState = useAuthedUserStore.getState()
  if (authState.isLogined()) {
    return Promise.resolve(true)
  } else {
    return refreshAuthState(true)
  }
}

export const ensureSiteData = (frontId: string) => {
  const siteState = useSiteStore.getState()
  if (siteState.site) {
    return Promise.resolve(siteState.site)
  } else {
    return siteState.fetchSiteData(frontId)
  }
}

export const ensureCategoryList = (siteFrontId: string) => {
  const cateState = useCategoryStore.getState()
  if (cateState.loaded && cateState.siteFrontId === siteFrontId) {
    return Promise.resolve(cateState.categories)
  } else {
    return cateState.fetchCategoryList(siteFrontId)
  }
}

export interface ArticleHistoryState {
  showDialog: boolean
  article: Article | null
  history: ArticleLog[]
  updateState: (state: Partial<ArticleHistoryState>) => void
}

export interface CurrentArticleState {
  categoryFrontId: string | null
  setCategoryFrontId: (categoryFrontId: string | null) => void
}

export const useArticleHistoryStore = create<ArticleHistoryState>((set) => ({
  showDialog: false,
  article: null,
  history: [],
  updateState(newState) {
    set((state) => ({
      ...state,
      ...newState,
    }))
  },
}))

export const useCurrentArticleStore = create<CurrentArticleState>((set) => ({
  categoryFrontId: null,
  setCategoryFrontId(categoryFrontId) {
    set(() => ({ categoryFrontId }))
  },
}))

export interface SiteUIState {
  mode: SiteUIMode
  setMode: (mode: SiteUIMode) => void
  articleListMode: ArticleListMode
  setArticleListMode: (mode: ArticleListMode) => void
  isSiteUIPreview: boolean
  setIsSiteUIPreview: (value: boolean) => void
}

export const useSiteUIStore = create<SiteUIState>((set) => ({
  mode: SITE_UI_MODE.Sidebar,
  articleListMode: ARTICLE_LIST_MODE.Preview,
  isSiteUIPreview: false,
  setMode(mode) {
    set((state) => ({ ...state, mode }))
  },
  setArticleListMode(mode) {
    set((state) => ({ ...state, articleListMode: mode }))
  },
  setIsSiteUIPreview(value) {
    set((state) => ({ ...state, isSiteUIPreview: value }))
  },
}))

export interface UserUIState {
  theme?: Theme
  fontSize?: number
  contentWidth?: number
  innerContentWidth?: number
  articleListMode?: ArticleListMode
  setState: (state: Partial<UserUIStateData>) => void
}

export interface UserUIStateData
  extends Pick<
    UserUIState,
    'theme' | 'fontSize' | 'contentWidth' | 'articleListMode'
  > {
  updatedAt: number
}

export const useUserUIStore = create(
  subscribeWithSelector<UserUIState>((set) => ({
    fontSize: undefined,
    contentWidth: Number(DEFAULT_CONTENT_WIDTH),
    articleListMode: undefined,
    setState(newState) {
      set((state) => ({ ...state, ...newState }))
    },
  }))
)

export interface InviteDataState {
  generatting: boolean
  setGeneratting: (loading: boolean) => void
  showDialog: boolean
  setShowDialog: (show: boolean) => void
  inviteCode: InviteCode | null
  setInviteCode: (code: InviteCode) => void
}

export const useInviteCodeStore = create<InviteDataState>((set) => ({
  generatting: false,
  setGeneratting(loading) {
    set((state) => ({ ...state, generatting: loading }))
  },
  showDialog: false,
  setShowDialog(show: boolean) {
    set((state) => ({ ...state, showDialog: show }))
  },
  inviteCode: null,
  setInviteCode(code: InviteCode | null) {
    set((state) => ({ ...state, inviteCode: code }))
  },
}))

export interface GlobalLoadingState {
  loading: boolean
  setLoading: (loading: boolean) => void
}

export const useLoading = create<GlobalLoadingState>((set) => ({
  loading: false,
  setLoading(loading) {
    set((state) => ({ ...state, loading }))
  },
}))

export interface ReplyBoxState extends ReplyBoxProps {
  show: boolean
  setShow: (show: boolean) => void
  setState: (state: Partial<ReplyBoxState>) => void
}

export const useReplyBoxStore = create<ReplyBoxState>((set) => ({
  show: false,
  setShow(show) {
    set((state) => ({ ...state, show }))
  },
  mode: 'reply',
  category: null,
  replyToArticle: null,
  editType: 'reply',
  disabled: false,
  onSuccess: noop,
  onRemoveReply: noop,
  setState: set,
}))

export interface EventSourceState {
  eventSource: EventSource | null
  setEventSource: (ev: EventSource | null) => void
}

export const useEventSourceStore = create<EventSourceState>((set) => ({
  eventSource: null,
  setEventSource(eventSource) {
    set((state) => ({
      ...state,
      eventSource,
    }))
  },
}))

export interface CategorySelectionModalState {
  open: boolean
  siteFrontId: string | null
  setOpen: (open: boolean) => void
  show: (siteFrontId: string) => void
}

export const useCategorySelectionModalStore =
  create<CategorySelectionModalState>((set) => ({
    open: false,
    siteFrontId: null,
    setOpen(open) {
      set((state) => ({ ...state, open }))
    },
    show(siteFrontId) {
      set(() => ({ open: true, siteFrontId }))
    },
  }))

export interface DefaultFontSizeState {
  defaultFontSize: string
  setDefaultFontSize: (size: string) => void
}

export const useDefaultFontSizeStore = create<DefaultFontSizeState>((set) => ({
  defaultFontSize: '16',
  setDefaultFontSize(size) {
    set(() => ({ defaultFontSize: size }))
  },
}))

export interface ReactOptionsState {
  reactOptions: ArticleReact[]
  loaded: boolean
  setReactOptions: (options: ArticleReact[]) => void
  fetchReactOptions: (force?: boolean) => Promise<void>
}

export const useReactOptionsStore = create<ReactOptionsState>((set, get) => ({
  reactOptions: [],
  loaded: false,
  setReactOptions(options) {
    set(() => ({ reactOptions: options, loaded: true }))
  },
  async fetchReactOptions(force = false) {
    const state = get()
    if (!force && state.loaded) {
      return
    }

    try {
      const { code, data } = await getReactOptions()
      if (!code && data.reactOptions) {
        set(() => ({ reactOptions: data.reactOptions, loaded: true }))
        return
      }
      set(() => ({ reactOptions: [], loaded: false }))
    } catch (err) {
      console.error('fetch react options failed: ', err)
      set(() => ({ loaded: false }))
    }
  },
}))

export interface ContextState {
  countryCode: string
  isSingleSite: boolean
  site: Site | null
  host?: string
  mainSiteHost?: string
  hasFetchedContext: boolean
  setCountryCode: (code: string) => void
  fetchContext: (siteFrontId?: string) => Promise<void>
}

export const useContextStore = create(
  subscribeWithSelector<ContextState>((set) => ({
    countryCode: '',
    isSingleSite: false,
    site: null,
    mainSiteHost: undefined,
    hasFetchedContext: false,
    setCountryCode(code) {
      set(() => ({ countryCode: code }))
    },
    async fetchContext(siteFrontId) {
      try {
        const { code, data } = await getContext(siteFrontId)
        if (!code && data) {
          if (data.host && typeof window !== 'undefined') {
            const targetHost = data.host
            const currentHost = window.location.host
            const currentHostname = window.location.hostname
            let targetHostname = targetHost
            try {
              const url = new URL(`http://${targetHost}`)
              targetHostname = url.hostname
            } catch (_err) {
              targetHostname = targetHost.split(':')[0]
            }

            const matchesHost = currentHostname === targetHostname
            const hostMismatch = import.meta.env.DEV
              ? !matchesHost
              : targetHost !== currentHost

            if (hostMismatch) {
              if (window.location.pathname !== '/not_compatible') {
                window.location.replace('/not_compatible')
              }
              set(() => ({ hasFetchedContext: true }))
              return
            }
          }
          set(() => ({
            countryCode: data.countryCode,
            isSingleSite: data.isSingleSite,
            site: data.site,
            host: data.host,
            mainSiteHost: data.mainSiteHost,
            hasFetchedContext: true,
          }))
        } else {
          set(() => ({ hasFetchedContext: true }))
        }
      } catch (err) {
        console.error('fetch context failed: ', err)
        set(() => ({ hasFetchedContext: true }))
      }
    },
  }))
)

useContextStore.subscribe(
  (state) => state.isSingleSite,
  (isSingleSite) => {
    const siteState = useSiteStore.getState()
    const siteUIStore = useSiteUIStore.getState()
    siteUIStore.setMode(deriveSiteMode(siteState.site, isSingleSite))
  }
)
