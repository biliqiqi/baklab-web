import React, { useEffect } from 'react'

import { cn } from '@/lib/utils'

import { SITE_NAME_CN } from '@/contants'

export interface BContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
}

const BContainer = React.forwardRef<HTMLDivElement, BContainerProps>(
  ({ className, title, ...props }, ref) => {
    useEffect(() => {
      document.title = title ? `${title} - ${SITE_NAME_CN}` : SITE_NAME_CN
    }, [title])

    return (
      <div
        className={cn('container mx-auto max-w-5xl px-4 py-4', className)}
        ref={ref}
        {...props}
      />
    )
  }
)

BContainer.displayName = 'BContainer'

export default BContainer
