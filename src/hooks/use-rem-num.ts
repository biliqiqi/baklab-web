import { useDefaultFontSizeStore, useUserUIStore } from '@/state/global'

// calculate px number from rem
export const useRem2PxNum = () => {
  const defaultFontSize = useDefaultFontSizeStore.getState().defaultFontSize
  const rootFontSize =
    useUserUIStore.getState().fontSize || Number(defaultFontSize)
  return (remNum: number) => rootFontSize * remNum
}
