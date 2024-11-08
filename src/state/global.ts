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
