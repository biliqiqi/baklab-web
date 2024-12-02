import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { cn } from '@/lib/utils'

import { isLogined, useAuthedUserStore } from '@/state/global'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Button } from '../ui/button'

import { logoutToken } from '@/api'
import { NAV_HEIGHT } from '@/constants'
import { Category } from '@/types/types'
import { DropdownMenuItem } from '@radix-ui/react-dropdown-menu'
import { ChevronLeftIcon, Loader } from 'lucide-react'
import { toast } from 'sonner'
import defaultAvatar from '../../assets/default-avatar.svg'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

export type FrontCategory = Pick<Category, 'frontId' | 'name' | 'describe'> & {
  isFront: boolean // 是否由前端定义
}

export interface NavProps extends React.HTMLAttributes<HTMLDivElement> {
  category?: FrontCategory
  goBack: boolean
}

const summryText = (text: string, max: number) =>
  text.length > max ? text.slice(0, max) + '...' : text

const BNav = React.forwardRef<HTMLDivElement, NavProps>(
  ({ className, category, goBack = false, ...props }, ref) => {
    const [loading, setLoading] = useState(false)
    const authState = useAuthedUserStore()
    const navigate = useNavigate()

    const isSigninPage = () => location.pathname == '/signin'

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

    /* console.log('goback: ', goBack) */

    return (
      <div
        className={cn(
          'flex justify-between items-center py-2 px-4 border-b-2 shadow-sm bg-white',
          className
        )}
        style={{
          height: NAV_HEIGHT,
        }}
        ref={ref}
        {...props}
      >
        <div className="flex flex-grow items-center">
          {goBack && history.length > 2 && (
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ChevronLeftIcon size={28} />
            </Button>
          )}

          {Boolean(category) && (
            <>
              {category.isFront ? (
                <span className="whitespace-nowrap">{category.name}</span>
              ) : (
                <Link
                  to={'/categories/' + category.frontId}
                  className="whitespace-nowrap"
                >
                  {category.name}
                </Link>
              )}
              <span className="px-4 ml-4 border-l-2 text-sm text-gray-500 cursor-pointer flex-grow overflow-hidden whitespace-nowrap text-ellipsis">
                {summryText(category.describe, 20)}{' '}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center">
          {!isSigninPage() && (
            <Button variant="outline" size="sm" asChild className="mr-4">
              <Link
                to={
                  category && !category.isFront
                    ? '/submit?category=' + category.frontId
                    : '/submit'
                }
              >
                + 提交
              </Link>
            </Button>
          )}
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
            !isSigninPage() && (
              <Button variant="default" size="sm" asChild>
                <Link to="/signin">登录</Link>
              </Button>
            )
          )}
        </div>
      </div>
    )
  }
)

BNav.displayName = 'BNav'

export default BNav
