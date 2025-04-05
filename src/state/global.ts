import { clone } from 'remeda'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

import { refreshAuthState } from '@/lib/request'

import { getCategoryList } from '@/api/category'
import { getNotificationUnreadCount } from '@/api/message'
import { getJoinedSiteList, getSiteWithFrontId } from '@/api/site'
import {
  LEFT_SIDEBAR_STATE_KEY,
  RIGHT_SIDEBAR_STATE_KEY,
} from '@/constants/constants'
import { PermitFn, PermitUnderSiteFn } from '@/constants/types'
import {
  Article,
  ArticleLog,
  Category,
  InviteCode,
  Role,
  SITE_STATUS,
  SITE_UI_MODE,
  Site,
  SiteUIMode,
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
     层级比较
     @paramm targetLevel 被比较的目标层级
     @reuturns 0 - 对方为同级, 1 - 对方为上级, -1 - 对方为下级
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

useAuthedUserStore.subscribe(
  (state) => state.user,
  () => {
    // console.log('user changed')
    updateCurrRole()
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
  confirmBtnText?: string
  cancelBtnText?: string
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
  confirmBtnText: '确定',
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
  cancelBtnText: '取消',
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
  open: false,
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

export const useRightSidebarStore = create<
  Pick<SidebarState, 'open' | 'setOpen'>
>((set) => ({
  open: false,
  setOpen(open) {
    set(() => ({ open }))
    localStorage.setItem(RIGHT_SIDEBAR_STATE_KEY, String(open))
  },
}))

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
    if (site?.uiSettings) {
      const siteUIStore = useSiteUIStore.getState()

      siteUIStore.setMode(
        (site.uiSettings.mode as SiteUIMode | undefined) || SITE_UI_MODE.TopNav
      )
    }
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
