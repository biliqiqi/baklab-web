import { isLogined, useAuthedUserStore } from '@/state/global'

export const useAuth: () => boolean = () => useAuthedUserStore(isLogined)
