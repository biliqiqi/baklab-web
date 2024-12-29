import { VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'

import { cn, noop } from '@/lib/utils'

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
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, state, onResize = noop, ...props }, ref) => {
    const elRef = React.useRef<HTMLTextAreaElement | null>(null)

    React.useEffect(() => {
      let resizeObserver: ResizeObserver | null = null

      if (typeof ref == 'function' && elRef.current) {
        ref(elRef.current)

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
    }, [])

    return (
      <textarea
        className={cn(textareaVariant({ state, className }))}
        ref={elRef}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
