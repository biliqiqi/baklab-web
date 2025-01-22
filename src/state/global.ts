import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

import { getNotificationUnreadCount } from '@/api/message'
import { PermitFn } from '@/constants/types'
import { Category, Role, Site, UserData } from '@/types/types'

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

  console.log('currRole: ', useAuthedUserStore.getState().currRole)
}

export const useAuthedUserStore = create(
  subscribeWithSelector<AuthedUserState>((set, get) => ({
    ...emptyAuthedUserData,
    update: (token, username, userID, user) => {
      const newState = {
        authToken: token,
        username,
        userID,
        user,
      }
      set((state) => ({ ...state, ...newState }))
      // localStorage.setItem(AUTHED_USER_LOCAL_STORE_NAME, JSON.stringify(newState))
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
      return isLogined(state) && state.userID == targetUserId
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
    permit(module, action) {
      const { user } = get()
      const { site } = useSiteStore.getState()

      const permissionId = `${module}.${String(action)}`

      if (!user || user.id == '0' || !module || !action) return false

      if (user.super) return true

      if (user.banned) return false

      const platformPermitted = user.permissions.some(
        (item) => item.frontId == permissionId
      )

      // console.log('site: ', site)
      // console.log('user role front id: ', user.roleFrontId)
      // console.log('permission id: ', permissionId)

      if (site) {
        if (user.roleFrontId == 'platform_admin') return true

        let sitePermitted = false
        if (site.currUserRole?.permissions && site.currUserRole.id != '0') {
          sitePermitted = site.currUserRole.permissions.some(
            (item) => item.frontId == permissionId
          )
        }

        if (sitePermitted) return true

        if (site.allowNonMemberInteract) {
          return platformPermitted
        }
      } else {
        return platformPermitted
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

export interface SidebarState {
  open: boolean
  setOpen: (x: boolean) => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  open: false,
  setOpen(open) {
    set(() => ({ open }))
  },
}))

export interface CategoryState {
  categories: Category[]
  updateCategories: (x: Category[]) => void
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  updateCategories(x) {
    set(() => ({ categories: [...x] }))
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
  site: Site | null
  update: (s: Site | null) => void
}

export const useSiteStore = create(
  subscribeWithSelector<SiteState>((set) => ({
    site: null,
    update(s) {
      set(() => ({ site: s }))
    },
  }))
)

useSiteStore.subscribe(
  (state) => state.site,
  () => {
    console.log('site data changed')
    updateCurrRole()
  }
)
