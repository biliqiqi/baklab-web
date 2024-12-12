import React from 'react'
import stc from 'string-to-color'

import { cn } from '@/lib/utils'

interface BIconColorCharProps extends React.SVGProps<SVGSVGElement> {
  id: string
  char: string
  size?: number
  fontSize?: string | number
}

const BIconColorChar = React.forwardRef<SVGSVGElement, BIconColorCharProps>(
  ({ id, char, size = 24, fontSize = 16, className, ...props }, ref) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
        className={cn('inline-block align-middle', className)}
        ref={ref}
        {...props}
      >
        <circle
          cx={`${size / 2}`}
          cy={`${size / 2}`}
          r={`${size / 2}`}
          fill={stc(id)}
        />
        <text
          x="50%"
          y="50%"
          dy="0.1em"
          fill="white"
          fontSize={fontSize}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {char.charAt(0)}
        </text>
      </svg>
    )
  }
)

export default BIconColorChar
