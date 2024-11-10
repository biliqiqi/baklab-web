import React from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

import { SITE_NAME } from '@/contants'

import { isLogined, useAuthedUserStore } from '@/state/global'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Button } from '../ui/button'

import { DropdownMenuItem } from '@radix-ui/react-dropdown-menu'
import defaultAvatar from '../../assets/default-avatar.svg'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu'

const BNav = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const authState = useAuthedUserStore()

  const onDropdownChange = (open: boolean) => {
    if (!open) {
      document.body.style.pointerEvents = ''
    }
  }

  const logout = () => {
    authState.logout()
  }

  return (
    <div
      className={cn(
        'flex justify-between py-2 px-4 border-b-2 shadow-sm items-center',
        className
      )}
      ref={ref}
      {...props}
    >
      <Link className="font-bold" to="/">
        {SITE_NAME}
      </Link>
      <div className="flex items-center">
        <Button size="sm" asChild className="mr-4">
          <Link to="/submit">+ 提交</Link>
        </Button>
        {isLogined(authState) ? (
          <DropdownMenu onOpenChange={onDropdownChange}>
            <DropdownMenuTrigger asChild>
              <Avatar className="inline-block cursor-pointer">
                <AvatarImage src={defaultAvatar} />
                <AvatarFallback>{authState.username}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="px-0" align="end" sideOffset={8}>
              <DropdownMenuItem
                className="cursor-pointer py-1 px-2 hover:bg-gray-200 hover:outline-0"
                onClick={logout}
              >
                退出
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm" asChild>
            <Link to="/signup">注册 / 登录</Link>
          </Button>
        )}
      </div>
    </div>
  )
})

BNav.displayName = 'BNav'

export default BNav
