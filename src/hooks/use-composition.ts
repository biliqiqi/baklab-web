import { useCallback, useRef } from 'react'

export interface CompositionHandlers {
  onCompositionStart: () => void
  onCompositionEnd: () => void
  isComposing: () => boolean
}

export function useComposition(): CompositionHandlers {
  const isComposingRef = useRef(false)

  const onCompositionStart = useCallback(() => {
    isComposingRef.current = true
  }, [])

  const onCompositionEnd = useCallback(() => {
    isComposingRef.current = false
  }, [])

  const isComposing = useCallback(() => {
    return isComposingRef.current
  }, [])

  return {
    onCompositionStart,
    onCompositionEnd,
    isComposing,
  }
}
