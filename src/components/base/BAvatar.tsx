import React from 'react'

import { cn } from '@/lib/utils'

import BIconColorChar from './BIconColorChar'

export interface BAvatarProps extends React.HTMLAttributes<SVGSVGElement> {
  username: string
  size?: number
  fontSize?: number
}

const BAvatar: React.FC<BAvatarProps> = ({
  username,
  size,
  className,
  ...props
}) => {
  return (
    <span
      className={cn(
        `inline-block align-middle overflow-hidden w-[${size}px] h-[${size}px]`,
        className
      )}
    >
      <BIconColorChar
        iconId={username}
        char={username}
        size={size}
        {...props}
      />
    </span>
  )
}

export default BAvatar
