import { type VariantProps, cva } from 'class-variance-authority'
import React from 'react'

import { cn } from '@/lib/utils'

const bIconHeartVariants = cva('inline-block w-4 h-4 align-sub b-icon-like', {
  variants: {
    variant: {
      default: '',
      full: 'liked',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface BIconHeartProps
  extends React.SVGAttributes<SVGSVGElement>,
    VariantProps<typeof bIconHeartVariants> {}

const BIconHeart = React.forwardRef<SVGSVGElement, BIconHeartProps>(
  ({ variant, className, ...props }, ref) => {
    return (
      <svg
        className={cn(bIconHeartVariants({ variant, className }))}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        ref={ref}
        {...props}
      >
        <path
          d="M50 88
           C 65 80, 90 65, 90 40
           C 90 20, 75 10, 50 28
           C 25 10, 10 20, 10 40
           C 10 65, 35 80, 50 88 Z"
        />
      </svg>
    )
  }
)

export { BIconHeart, bIconHeartVariants }
