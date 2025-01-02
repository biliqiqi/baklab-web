import React from 'react'

import { cn } from '@/lib/utils'

import BIconColorChar from './BIconColorChar'

export interface BAvatarProps extends React.HTMLAttributes<SVGSVGElement> {
  username: string
  size?: number
  fontSize?: number
  showUsername?: boolean
}

const BAvatar: React.FC<BAvatarProps> = ({
  username,
  size,
  className,
  showUsername = false,
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
        className={cn(`inline-block align-text-top`, showUsername && 'mr-1')}
      />
      {showUsername && username}
    </span>
  )
}

export default BAvatar
