import { clone } from 'remeda'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { refreshAuthState } from '@/lib/request'
import { noop, setRootFontSize } from '@/lib/utils'

import { getCategoryList } from '@/api/category'
import { getNotificationUnreadCount } from '@/api/message'
import { getJoinedSiteList, getSiteWithFrontId } from '@/api/site'
import { DEFAULT_CONTENT_WIDTH, DEFAULT_FONT_SIZE } from '@/constants/constants'
import i18n from '@/i18n'
import {
  LEFT_SIDEBAR_DEFAULT_OPEN,
  LEFT_SIDEBAR_STATE_KEY,
  RIGHT_SIDEBAR_SETTINGS_TYPE_KEY,
  RIGHT_SIDEBAR_STATE_KEY,
  USER_UI_SETTINGS_KEY,
} from '@/constants/constants'
import { PermitFn, PermitUnderSiteFn } from '@/constants/types'
import {
  Article,
  ArticleLog,
  Category,
  InviteCode,
  ReplyBoxProps,
  Role,
  SITE_LIST_MODE,
  SITE_STATUS,
  SITE_UI_MODE,
  SettingsType,
  Site,
  SiteListMode,
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
  mode?: SiteListMode
  theme?: Theme
  fontSize?: number
  contentWidth?: number
  lang?: string
}

const isUserUIFormActive = () => {
  const rightSidebarState = useRightSidebarStore.getState()
  return rightSidebarState.open && rightSidebarState.settingsType === 'user_ui'
}

let pendingUISettingsCallback: ((settings: BackendUISettings) => void) | null = null

export const registerUISettingsCallback = (callback: (settings: BackendUISettings) => void) => {
  pendingUISettingsCallback = callback
}

export const unregisterUISettingsCallback = () => {
  pendingUISettingsCallback = null
}

// Core logic for applying UI settings (without form interaction check)
const applyUISettingsCore = (settings: BackendUISettings) => {
  const userUIStore = useUserUIStore.getState()

  if (settings.mode) {
    userUIStore.setSiteListMode(settings.mode)
  }

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
        setLocalUserUISettings({
          siteListMode: backendSettings.mode || currentState.siteListMode,
          theme: backendSettings.theme || currentState.theme,
          fontSize: backendSettings.fontSize || currentState.fontSize || Number(DEFAULT_FONT_SIZE),
          contentWidth: backendSettings.contentWidth || currentState.contentWidth || Number(DEFAULT_CONTENT_WIDTH),
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

export interface TopDrawerState {
  open: boolean
  update: (x: boolean) => void
  toggle: () => void
}

export const useTopDrawerStore = create<TopDrawerState>((set) => ({
  open: false,
  update(open: boolean) {
    set(() => ({
      open,
    }))
  },
  toggle() {
    set(({ open }) => ({
      open: !open,
    }))
  },
}))

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
  type: 'alert' | 'confirm'
  open: boolean
  title?: string
  description?: string
  confirmBtnText?: string | StringFn
  cancelBtnText?: string | StringFn
  confirmed: boolean
  confirmType: AlertConfirmType
  setOpen: (open: boolean) => void
  setConfirm: (confirm: boolean) => void
  alert: (title: string, description?: string) => void
  confirm: (
    title: string,
    description?: string,
    confirmType?: AlertConfirmType,
    state?: AlertDialogData
  ) => Promise<boolean>
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
  alert: (title, description) => {
    set(() => ({
      type: 'alert',
      open: true,
      title,
      description,
      confirmBtnText: defaultAlertState.confirmBtnText,
      confirmType: 'normal',
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
  groupsOpen: SidebarGroupsOpenState
  setGroupsOpen: (
    s:
      | SidebarGroupsOpenState
      | ((s: SidebarGroupsOpenState) => SidebarGroupsOpenState)
  ) => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  open: LEFT_SIDEBAR_DEFAULT_OPEN,
  setOpen(open) {
    set((state) => ({ ...state, open }))
    localStorage.setItem(LEFT_SIDEBAR_STATE_KEY, String(open))
  },
  openMobile: false,
  setOpenMobile(openMobile) {
    set((state) => ({ ...state, openMobile }))
    localStorage.setItem(LEFT_SIDEBAR_STATE_KEY, String(openMobile))
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
}))

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
  updateCategories: (x: Category[]) => void
  fetchCategoryList: (siteFrontId: string) => Promise<Category[]>
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  updateCategories(x) {
    set(() => ({ categories: [...x] }))
  },
  fetchCategoryList: async (siteFrontId) => {
    try {
      const { code, data } = await getCategoryList({ siteFrontId: siteFrontId })
      if (!code && data) {
        set(() => ({ categories: [...data] }))
        return data
      } else {
        set(() => ({ categories: [] }))
        return []
      }
    } catch (_err) {
      set(() => ({ categories: [] }))
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

export interface SiteState {
  site?: Site | null
  siteList?: Site[] | null
  homePage: string
  showSiteForm: boolean
  editting: boolean
  setEditting: (editing: boolean) => void
  edittingData: Site | null
  setEdittingData: (site: Site | null) => void
  update: (s: Site | null) => void
  updateSiteList: (list: Site[]) => void
  updateHomePage: (path: string) => void
  fetchSiteData: (siteFrontId: string) => Promise<Site | null>
  fetchSiteList: () => Promise<void>
  setShowSiteForm: (show: boolean) => void
  showSiteAbout: boolean
  setShowSiteAbout: (show: boolean) => void
  showSiteListDropdown: boolean
  setShowSiteListDropdown: (show: boolean) => void
}

export const useSiteStore = create(
  subscribeWithSelector<SiteState>((set, get) => ({
    site: null,
    siteList: null,
    showSiteForm: false,
    homePage: '/',
    editting: false,
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
    showSiteListDropdown: false,
    setShowSiteListDropdown(show) {
      set((state) => ({ ...state, showSiteListDropdown: show }))
    },
    fetchSiteData: async (frontId) => {
      const ps = new Promise((resolve) => {
        const unsub = useSiteStore.subscribe(
          (state) => state.site,
          (site, _prevSite) => {
            // console.log('state changed in fetchSiteData! site: ', site)
            // console.log('state changed in fetchSiteData! prevSite: ', prevSite)
            if (site) {
              resolve(site)
            } else {
              resolve(null)
            }
            unsub()
          }
        )
      }) as unknown as Promise<Site | null>

      try {
        const { code, data } = await getSiteWithFrontId(frontId)
        if (!code) {
          set((state) => ({
            ...state,
            site: clone(data),
            homePage: `/${data.frontId}${data.homePage}`,
          }))
        } else {
          set((state) => ({ ...state, site: null, homePage: `/` }))
        }
      } catch (err) {
        set((state) => ({ ...state, site: null, homePage: `/` }))
        console.error('fetch site data error: ', err)
      }
      return ps
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

useSiteStore.subscribe(
  (state) => state.site,
  (site) => {
    updateCurrRole()
    const siteUIStore = useSiteUIStore.getState()

    // Always set site mode when site changes, regardless of uiSettings existence
    siteUIStore.setMode(
      (site?.uiSettings?.mode as SiteUIMode | undefined) || SITE_UI_MODE.TopNav
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
  if (cateState.categories.length) {
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
}

export const useSiteUIStore = create<SiteUIState>((set) => ({
  mode: SITE_UI_MODE.TopNav,
  setMode(mode) {
    set((state) => ({ ...state, mode }))
  },
}))

export interface UserUIState {
  siteListMode: SiteListMode
  setSiteListMode: (mode: SiteListMode) => void
  theme?: Theme
  fontSize?: number
  contentWidth?: number
  innerContentWidth?: number
  setState: (state: Partial<UserUIStateData>) => void
}

export interface UserUIStateData
  extends Pick<
    UserUIState,
    'siteListMode' | 'theme' | 'fontSize' | 'contentWidth'
  > {
  updatedAt: number
}

export const useUserUIStore = create(
  subscribeWithSelector<UserUIState>((set) => ({
    siteListMode: SITE_LIST_MODE.TopDrawer,
    fontSize: Number(DEFAULT_FONT_SIZE),
    contentWidth: Number(DEFAULT_CONTENT_WIDTH),
    setSiteListMode(mode) {
      set((state) => ({ ...state, siteListMode: mode }))
    },
    setState(newState) {
      set((state) => ({ ...state, ...newState }))
    },
  }))
)

useUserUIStore.subscribe(
  (state) => state.siteListMode,
  (mode) => {
    if (mode == SITE_LIST_MODE.DropdownMenu) {
      useTopDrawerStore.getState().update(false)
    }
  }
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

export const useCategorySelectionModalStore = create<CategorySelectionModalState>((set) => ({
  open: false,
  siteFrontId: null,
  setOpen(open) {
    set((state) => ({ ...state, open }))
  },
  show(siteFrontId) {
    set(() => ({ open: true, siteFrontId }))
  },
}))
