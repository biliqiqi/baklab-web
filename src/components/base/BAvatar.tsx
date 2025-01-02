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
    <span className="inline-flex items-center">
      <span
        className={cn(
          `overflow-hidden w-[${size}px] h-[${size}px]`,
          className,
          showUsername && 'mr-1'
        )}
      >
        <BIconColorChar
          iconId={username}
          char={username}
          size={size}
          {...props}
        />
      </span>
      {showUsername && <span className="flex-shrink-0">{username}</span>}
    </span>
  )
}

export default BAvatar
