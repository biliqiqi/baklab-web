import React from 'react'

import { cn } from '@/lib/utils'

interface BIconCircleProps extends React.HtmlHTMLAttributes<HTMLSpanElement> {
  size?: number
  fontSize?: string | number
}

const BIconCircle = React.forwardRef<HTMLSpanElement, BIconCircleProps>(
  ({ size = 24, fontSize = 16, children, className, ...props }, ref) => {
    return (
      <span
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: 'hsl(var(--primary))',
          borderRadius: '100%',
          color: 'white',
          fontSize: `${fontSize}px`,
        }}
        className={cn('inline-flex items-center justify-center', className)}
        ref={ref}
        {...props}
      >
        {children}
      </span>
    )
  }
)

export default BIconCircle
