import { VariantProps, cva } from 'class-variance-authority'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'

import { cn, noop } from '@/lib/utils'

import { useComposition } from '@/hooks/use-composition'

const textareaVariant = cva(
  'flex min-h-[40px] w-full rounded-md border border-input bg-white px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      state: {
        default: '',
        invalid:
          'ring-2 ring-primary ring-offset-2 ring-destructive focus-visible:ring-destructive',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  }
)

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onResize'>,
    VariantProps<typeof textareaVariant> {
  onResize?: (width: number, height: number) => void
  onComposingChange?: (isComposing: boolean) => void
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, state, onResize = noop, onComposingChange, ...props }, ref) => {
    const elRef = useRef<HTMLTextAreaElement>(null)
    const composition = useComposition()

    const onComposingChangeRef = useRef(onComposingChange)
    const propsCompositionStartRef = useRef(props.onCompositionStart)
    const propsCompositionEndRef = useRef(props.onCompositionEnd)

    useEffect(() => {
      onComposingChangeRef.current = onComposingChange
      propsCompositionStartRef.current = props.onCompositionStart
      propsCompositionEndRef.current = props.onCompositionEnd
    })

    /* @ts-expect-error no error */
    useImperativeHandle(ref, () => elRef.current)

    const handleCompositionStart = useCallback(
      (e: React.CompositionEvent<HTMLTextAreaElement>) => {
        composition.onCompositionStart()
        onComposingChangeRef.current?.(true)
        propsCompositionStartRef.current?.(e)
      },
      [composition]
    )

    const handleCompositionEnd = useCallback(
      (e: React.CompositionEvent<HTMLTextAreaElement>) => {
        composition.onCompositionEnd()
        onComposingChangeRef.current?.(false)
        propsCompositionEndRef.current?.(e)
      },
      [composition]
    )

    useEffect(() => {
      let resizeObserver: ResizeObserver | null = null

      if (elRef.current) {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect
            onResize(width, height)
          }
        })
        resizeObserver.observe(elRef.current)
      }

      return () => {
        if (resizeObserver) {
          resizeObserver.disconnect()
        }
      }
    }, [onResize])

    const {
      onCompositionStart: _onCompositionStart,
      onCompositionEnd: _onCompositionEnd,
      ...restProps
    } = props

    return (
      <textarea
        className={cn(textareaVariant({ state, className }))}
        ref={elRef}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        {...restProps}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
