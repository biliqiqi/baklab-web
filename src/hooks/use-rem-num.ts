import { DEFAULT_FONT_SIZE } from '@/constants/constants'
import { useUserUIStore } from '@/state/global'

// calculate px number from rem
export const useRem2PxNum = () => {
  const rootFontSize =
    useUserUIStore.getState().fontSize || Number(DEFAULT_FONT_SIZE)
  return (remNum: number) => rootFontSize * remNum
}
