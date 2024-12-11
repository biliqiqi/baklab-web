import { create } from 'zustand'

import { ROLE_DATA } from '@/constants/roles'
import { PermissionAction, PermissionModule, Role } from '@/types/permission'
import { Category } from '@/types/types'

export interface ToastState {
  silence: boolean
  update: (silence: boolean) => void
}

export const useToastStore = create<ToastState>((set) => ({
  silence: false,
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
  isMySelf: (userID: string) => boolean
  permit: <T extends PermissionModule>(m: T, a: PermissionAction<T>) => boolean
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
  isMySelf(userID: string) {
    const state = get()
    return isLogined(state) && state.userID == userID
  },
  permit<T extends PermissionModule>(module: T, action: PermissionAction<T>) {
    const permissionId = `${module}.${String(action)}`
    const roleData = ROLE_DATA[get().role]

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
