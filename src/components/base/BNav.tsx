import { ChevronLeftIcon, GripIcon, Loader, MenuIcon } from 'lucide-react'
import React, { MouseEvent, useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

import { logoutToken } from '@/api'
import { NAV_HEIGHT } from '@/constants/constants'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  isLogined,
  useAuthedUserStore,
  useDialogStore,
  useSidebarStore,
} from '@/state/global'
import { FrontCategory } from '@/types/types'

import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { useSidebar } from '../ui/sidebar'
import BAvatar from './BAvatar'

export interface NavProps extends React.HTMLAttributes<HTMLDivElement> {
  category?: FrontCategory
  goBack?: boolean
  onGripClick?: () => void
}

const summryText = (text: string, max: number) =>
  text.length > max ? text.slice(0, max) + '...' : text

const isOneOfPath = (loc: Location, pathes: string[]) =>
  pathes.some((path) => loc.pathname == path)

const BNav = React.forwardRef<HTMLDivElement, NavProps>(
  ({ className, category, goBack = false, onGripClick, ...props }, ref) => {
    const [loading, setLoading] = useState(false)
    const authState = useAuthedUserStore()
    const navigate = useNavigate()
    const isMobile = useIsMobile()
    /* const sidebarStore = useSidebarStore() */
    const sidebar = useSidebar()

    const { updateSignin } = useDialogStore()

    /* const submitPath = useMemo(
     *   () =>
     *     category && !category.isFront
     *       ? '/submit?category=' + category.frontId
     *       : '/submit',
     *   [category]
     * ) */

    /* const isSigninPage = () => location.pathname == '/signin' */

    const onDropdownChange = (open: boolean) => {
      if (!open) {
        document.body.style.pointerEvents = ''
      }
    }

    const onMenuClick = useCallback(() => {
      /* sidebarStore.setOpen(!sidebarStore.open) */
      /* sidebar.toggleSidebar() */
      if (isMobile) {
        sidebar.setOpenMobile(!sidebar.openMobile)
      } else {
        /* console.log('toggle desktop sidebar') */
        sidebar.toggleSidebar()
      }
    }, [isMobile, sidebar])

    /* const onSubmitClick = useCallback(
    *   async (e: MouseEvent) => {
    *     e.preventDefault()

    *     if (isLogined(authState)) {
    *       navigate(submitPath)
    *       return
    *     }

    *     try {
    *       const authData = await authState.loginWithDialog()
    *       console.log('authData success', authData)
    *       //...
    *       setTimeout(() => {
    *         navigate(submitPath)
    *       }, 0)
    *     } catch (err) {
    *       console.error('submit click error: ', err)
    *     }
    *   },
    *   [authState, submitPath, navigate]
    * ) */

    const logout = useCallback(async () => {
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
    }, [authState, loading, navigate])

    /* console.log('goback: ', goBack) */

    /* console.log('sidebar open in nav: ', sidebar.open) */

    return (
      <div
        className={cn(
          'flex justify-between items-center py-2 px-4 border-b-2 shadow-sm bg-white sticky top-0 z-10',
          className
        )}
        style={{
          height: NAV_HEIGHT,
        }}
        ref={ref}
        {...props}
      >
        <div
          className="flex flex-grow  items-center"
          style={{
            maxWidth: 'calc(100% - 8rem)',
          }}
        >
          {goBack && history.length > 2 ? (
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ChevronLeftIcon size={28} />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onMenuClick}>
              <MenuIcon size={28} />
            </Button>
          )}

          {!!category && (
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
          {!isOneOfPath(location, ['/signin', '/submit']) && (
            <>
              {/* <Button
                variant="outline"
                size="sm"
                asChild
                className="mr-4 max-sm:hidden"
                onClick={onSubmitClick}
              >
                <Link to={submitPath}>+ 提交</Link>
              </Button> */}
              {/* <DrawerTrigger>
                <Button variant="outline" size="sm" className="mr-4">
                  + 提交
                </Button>
              </DrawerTrigger> */}
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full mr-2"
            onClick={() => {
              if (onGripClick && typeof onGripClick == 'function') {
                onGripClick()
              }
            }}
          >
            <GripIcon size={20} />
          </Button>
          {isLogined(authState) ? (
            <DropdownMenu onOpenChange={onDropdownChange}>
              <DropdownMenuTrigger asChild>
                <BAvatar
                  username={authState.username}
                  className="cursor-pointer"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="px-0" align="end" sideOffset={8}>
                <DropdownMenuItem
                  className="py-1 px-2 hover:bg-gray-200 hover:outline-0"
                  asChild
                >
                  <Link to={'/users/' + authState.username}>个人主页</Link>
                </DropdownMenuItem>
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
            !isOneOfPath(location, ['/signin']) && (
              <Button
                variant="default"
                size="sm"
                asChild
                onClick={(e) => {
                  e.preventDefault()
                  updateSignin(true)
                }}
              >
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
