import React from 'react'

import { cn } from '@/lib/utils'

export interface BContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
}

const BContainer = React.forwardRef<HTMLDivElement, BContainerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        className={cn('container mx-auto max-w-3xl px-4 py-4', className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)

BContainer.displayName = 'BContainer'

export default BContainer
