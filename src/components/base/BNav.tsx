import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { cn } from '@/lib/utils'

import { SITE_NAME } from '@/constants'

import { isLogined, useAuthedUserStore } from '@/state/global'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Button } from '../ui/button'

import { logoutToken } from '@/api'
import { DropdownMenuItem } from '@radix-ui/react-dropdown-menu'
import { Loader } from 'lucide-react'
import { toast } from 'sonner'
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
  const [loading, setLoading] = useState(false)
  const authState = useAuthedUserStore()
  const navigate = useNavigate()

  const onDropdownChange = (open: boolean) => {
    if (!open) {
      document.body.style.pointerEvents = ''
    }
  }

  const logout = async () => {
    if (loading) return
    try {
      setLoading(true)
      const data = await logoutToken()
      if (!data.code) {
        authState.logout()
        navigate('/')
      }
    } catch (e) {
      console.error('logout error: ', e)
      toast.error('退出登录失败，请重试')
    } finally {
      setLoading(false)
    }
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
        <Button variant="outline" size="sm" asChild className="mr-4">
          <Link to="/submit">+ 提交</Link>
        </Button>
        {isLogined(authState) ? (
          <DropdownMenu onOpenChange={onDropdownChange}>
            <DropdownMenuTrigger asChild>
              <Avatar
                className="inline-block cursor-pointer"
                title={authState.username}
              >
                <AvatarImage src={defaultAvatar} />
                <AvatarFallback>{authState.username}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="px-0" align="end" sideOffset={8}>
              <DropdownMenuItem
                className="cursor-pointer py-1 px-2 hover:bg-gray-200 hover:outline-0"
                onClick={logout}
                disabled={loading}
              >
                {loading ? <Loader /> : '退出'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link to="/signin">登录</Link>
          </Button>
        )}
      </div>
    </div>
  )
})

BNav.displayName = 'BNav'

export default BNav
