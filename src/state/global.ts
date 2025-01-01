import { create } from 'zustand'

import { getRoleItem } from '@/lib/utils'

import { ROLE_DATA } from '@/constants/roles'
import { PermitFn, Role } from '@/constants/types'
import { Category } from '@/types/types'

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
  'authToken' | 'username' | 'userID' | 'role'
>

export const AUTHED_USER_LOCAL_STORE_NAME = 'auth_info'

export const emptyAuthedUserData: AuthedUserData = {
  authToken: '',
  username: '',
  userID: '',
  role: 'common_user',
}

export interface AuthedUserState {
  authToken: string
  username: string
  userID: string
  role: Role
  update: (token: string, username: string, userID: string, role: Role) => void
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
  levelCompare: (targetRoleFrontId: Role) => number
  permit: PermitFn
}

export const useAuthedUserStore = create<AuthedUserState>((set, get) => ({
  ...emptyAuthedUserData,
  update: (token, username, userID, role) => {
    const newState = {
      authToken: token,
      username,
      userID,
      role,
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
  levelCompare(targetRoleFrontId) {
    const targetRoleItem = getRoleItem(targetRoleFrontId)
    const roleItem = getRoleItem(get().role)

    if (!roleItem || !targetRoleItem) {
      return 0
    }

    if (roleItem.level == targetRoleItem.level) {
      return 0
    } else if (roleItem.level < targetRoleItem.level) {
      return -1
    } else {
      return 1
    }
  },
  permit(module, action) {
    const permissionId = `${module}.${String(action)}`
    const roleData = getRoleItem(get().role)

    if (!roleData || !roleData.permissions?.includes(permissionId)) return false
    return true
  },
}))

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
  title: string
  description: string
  confirmBtnText: string
  cancelBtnText: string
  confirmed: boolean
  confirmType: AlertConfirmType
  setOpen: (open: boolean) => void
  setConfirm: (confirm: boolean) => void
  alert: (title: string, description?: string) => void
  confirm: (
    title: string,
    description?: string,
    confirmType?: AlertConfirmType
  ) => Promise<boolean>
  setState: (fn: (x: AlertDialogState) => AlertDialogState) => void
}

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

export const useAlertDialogStore = create<AlertDialogState>((set) => ({
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
  confirm: (title, description, confirmType = 'normal') =>
    new Promise((resolve, reject) => {
      set(() => ({
        type: 'confirm',
        open: true,
        confirmed: false,
        title,
        description,
        confirmType,
      }))

      useAlertDialogStore.subscribe((state) => {
        if (state.type == 'confirm' && !state.open) {
          resolve(state.confirmed)
        } else {
          reject(new Error('confirm dialog canceled'))
        }
      })
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
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount(count) {
    set(() => ({ unreadCount: count }))
  },
}))
