import { type VariantProps, cva } from 'class-variance-authority'
import React from 'react'

import { cn } from '@/lib/utils'

import { BIconTriangleUp } from './TriangleUp'

const bIconTriangleDownVariants = cva('inline-block align-middle', {
  variants: {
    variant: {
      default: '',
      full: '',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface BIconTriangleDownProps
  extends React.SVGAttributes<SVGSVGElement>,
    VariantProps<typeof bIconTriangleDownVariants> {
  size?: number
  width?: number
  height?: number
  upsideDown?: boolean
}

const BIconTriangleDown = React.forwardRef<
  SVGSVGElement,
  BIconTriangleDownProps
>(
  (
    { variant, size, width, height, className, upsideDown = false, ...props },
    ref
  ) => {
    return (
      <BIconTriangleUp
        className={cn(bIconTriangleDownVariants({ variant, className }))}
        ref={ref}
        upsideDown={!upsideDown}
        size={size}
        width={width}
        height={height}
        variant={variant}
        {...props}
      />
    )
  }
)

export { BIconTriangleDown }
