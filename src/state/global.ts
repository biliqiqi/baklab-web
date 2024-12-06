import { create } from 'zustand'

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

export interface AuthedUserState {
  authToken: string
  username: string
  userID: string
  update: (token: string, username: string, userID: string) => void
  logout: () => void
  loginWithDialog: () => Promise<AuthedUserData>
}

export type AuthedUserData = Pick<
  AuthedUserState,
  'authToken' | 'username' | 'userID'
>

export const AUTHED_USER_LOCAL_STORE_NAME = 'auth_info'

export const emptyAuthedUserData: AuthedUserData = {
  authToken: '',
  username: '',
  userID: '',
}

export const useAuthedUserStore = create<AuthedUserState>((set) => ({
  ...emptyAuthedUserData,
  update: (token, username, userID) => {
    const newState = {
      authToken: token,
      username,
      userID,
    }
    set(() => newState)
    // localStorage.setItem(AUTHED_USER_LOCAL_STORE_NAME, JSON.stringify(newState))
  },
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
    // localStorage.removeItem(AUTHED_USER_LOCAL_STORE_NAME)
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
