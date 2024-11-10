import { create } from 'zustand'

export interface ToastState {
  visible: boolean
  content: string
  update: (visible: boolean, content: string) => void
}

let toastTimer: number | null = null

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  content: '',
  update: (visible, content) => {
    if (toastTimer) clearTimeout(toastTimer)
    set(() => ({
      visible,
      content,
    }))

    toastTimer = setTimeout(() => {
      set(() => ({
        visible: false,
        content: '',
      }))
    }, 3000)
  },
}))

export interface AuthedUserState {
  authToken: string
  username: string
  email: string
  update: (token: string, username: string, email: string) => void
  logout: () => void
}

export type AuthedUserData = Pick<
  AuthedUserState,
  'authToken' | 'username' | 'email'
>

export const AUTHED_USER_LOCAL_STORE_NAME = 'auth_info'

export const emptyAuthedUserData: AuthedUserData = {
  authToken: '',
  username: '',
  email: '',
}

export const useAuthedUserStore = create<AuthedUserState>((set) => ({
  ...emptyAuthedUserData,
  update: (token, username, email) => {
    const newState = {
      authToken: token,
      username,
      email,
    }
    set(() => newState)
    localStorage.setItem(AUTHED_USER_LOCAL_STORE_NAME, JSON.stringify(newState))
  },
  logout() {
    set(() => emptyAuthedUserData)
    localStorage.removeItem(AUTHED_USER_LOCAL_STORE_NAME)
  },
}))

type IsLogined = (x: AuthedUserState) => boolean

export const isLogined: IsLogined = ({ authToken, username, email }) =>
  Boolean(authToken && username && email)
