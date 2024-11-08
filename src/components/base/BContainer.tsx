import React, { useEffect } from 'react'

import { cn } from '@/lib/utils'

import { SITE_NAME_CN } from '@/contants'
import { useToastStore } from '@/state/global'

export interface BContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
}

const BContainer = React.forwardRef<HTMLDivElement, BContainerProps>(
  ({ className, title, children, ...props }, ref) => {
    /* const [toastVisible, toastContent] = useToastStore(
     *   ({ visible, content }) => [visible, content]
     * ) */

    const toastVisible = useToastStore((state) => state.visible)
    const toastContent = useToastStore((state) => state.content)

    useEffect(() => {
      document.title = title ? `${title} - ${SITE_NAME_CN}` : SITE_NAME_CN
    }, [title])

    return (
      <div
        className={cn('container mx-auto max-w-5xl px-4 py-4', className)}
        ref={ref}
        {...props}
      >
        {children}

        {toastVisible && (
          <div className="p-6 border-red-600 border-2">{toastContent}</div>
        )}
      </div>
    )
  }
)

BContainer.displayName = 'BContainer'

export default BContainer
