import React from 'react'

import { cn, idIcon } from '@/lib/utils'

import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'

export interface BAvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  username: string
  size?: number
}

const BAvatar = React.forwardRef<HTMLSpanElement, BAvatarProps>(
  ({ username, className, size = 40, ...props }, ref) => {
    return (
      <Avatar
        className={cn('inline-block align-middle', className)}
        title={username}
        ref={ref}
        {...props}
        style={{
          width: size + 'px',
          height: size + 'px',
        }}
      >
        <AvatarImage src={idIcon(username)} />
        <AvatarFallback>{username}</AvatarFallback>
      </Avatar>
    )
  }
)

export default BAvatar
