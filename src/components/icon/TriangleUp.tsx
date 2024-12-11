import { type VariantProps, cva } from 'class-variance-authority'
import React from 'react'

import { cn } from '@/lib/utils'

const bIconTriangleUpVariants = cva('inline-block align-middle', {
  variants: {
    variant: {
      default: 'text-gray-500',
      full: 'text-primary',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface BIconTriangleUpProps
  extends React.SVGAttributes<SVGSVGElement>,
    VariantProps<typeof bIconTriangleUpVariants> {
  size?: number
  upsideDown?: boolean
}

const BIconTriangleUp = React.forwardRef<SVGSVGElement, BIconTriangleUpProps>(
  ({ variant, size = 24, className, upsideDown = false, ...props }, ref) => {
    return (
      <svg
        className={cn(bIconTriangleUpVariants({ variant, className }))}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 24 24`}
        ref={ref}
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
        {...props}
      >
        <path
          d={upsideDown ? 'M12 17L19 6H5L12 17Z' : 'M12 6L5 17H19L12 6Z'}
          fill={variant == 'full' ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    )
  }
)

export { BIconTriangleUp }
