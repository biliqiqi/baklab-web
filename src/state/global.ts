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
  logout() {
    set(() => emptyAuthedUserData)
    // localStorage.removeItem(AUTHED_USER_LOCAL_STORE_NAME)
  },
}))

type IsLogined = (x: AuthedUserState | AuthedUserData) => boolean

export const isLogined: IsLogined = ({ authToken, username, userID }) =>
  Boolean(authToken && username && userID)
