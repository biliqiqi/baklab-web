import React, { useEffect } from 'react'

import { cn } from '@/lib/utils'

import { SITE_NAME_CN } from '@/constants'

import { Toaster } from '../ui/sonner'

export interface BContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
}

const BContainer = React.forwardRef<HTMLDivElement, BContainerProps>(
  ({ className, title, children, ...props }, ref) => {
    useEffect(() => {
      document.title = title ? `${title} - ${SITE_NAME_CN}` : SITE_NAME_CN
    }, [title])

    /* console.log('render container') */

    return (
      <div
        className={cn('container mx-auto max-w-5xl px-4 py-4', className)}
        ref={ref}
        {...props}
      >
        {children}

        <Toaster
          theme="system"
          position="top-center"
          invert
          visibleToasts={1}
          toastOptions={{
            classNames: {
              error: 'bg-red-400',
              success: 'text-green-400',
              warning: 'text-yellow-400',
              info: 'bg-blue-400',
            },
          }}
        />
      </div>
    )
  }
)

BContainer.displayName = 'BContainer'

export default BContainer
