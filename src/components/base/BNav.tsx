import { DialogDescription, DialogTitle } from '@radix-ui/react-dialog'
import {
  BellIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GripIcon,
  Loader,
  MenuIcon,
} from 'lucide-react'
import React, { useCallback, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'

import { cn, summryText } from '@/lib/utils'

import { logoutToken } from '@/api'
import { NAV_HEIGHT, SITE_LOGO_IMAGE, SITE_NAME } from '@/constants/constants'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  isLogined,
  useAuthedUserStore,
  useDialogStore,
  useNotificationStore,
  useSiteStore,
} from '@/state/global'
import { FrontCategory } from '@/types/types'

import MessageList, { MessageListRef } from '../MessageList'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader } from '../ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { SIDEBAR_WIDTH, useSidebar } from '../ui/sidebar'
import BAvatar from './BAvatar'
import BSiteIcon from './BSiteIcon'

export interface NavProps extends React.HTMLAttributes<HTMLDivElement> {
  category?: FrontCategory
  goBack?: boolean
  onGripClick?: () => void
}

const isOneOfPath = (loc: Location, pathes: string[]) =>
  pathes.some((path) => loc.pathname == path)

const BNav = React.forwardRef<HTMLDivElement, NavProps>(
  ({ className, category, goBack = false, onGripClick, ...props }, ref) => {
    const [loading, setLoading] = useState(false)
    const [showCategoryDetail, setShowCategoryDetail] = useState(false)
    const { siteFrontId } = useParams()

    const authState = useAuthedUserStore()
    const navigate = useNavigate()
    const isMobile = useIsMobile()
    const sidebar = useSidebar()
    const msgListRef = useRef<MessageListRef | null>(null)

    const { updateSignin } = useDialogStore()
    const notiStore = useNotificationStore()

    const { currSite } = useSiteStore(
      useShallow(({ site }) => ({ currSite: site }))
    )

    const onDropdownChange = (open: boolean) => {
      if (!open) {
        document.body.style.pointerEvents = ''
      }
    }

    const onNotiClick = (open: boolean) => {
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

    const logout = useCallback(async () => {
      if (loading) return
      try {
        setLoading(true)
        const data = await logoutToken()
        if (!data.code) {
          authState.logout()
          navigate(0)
        }
      } catch (e) {
        console.error('logout error: ', e)
        toast.error('退出登录失败，请重试')
      } finally {
        setLoading(false)
      }
    }, [authState, loading, navigate])

    /* console.log('msgListRef: ', msgListRef.current?.pageState.totalCount) */

    return (
      <div
        className={cn(
          'flex justify-between items-center py-2 px-4 border-b-2 shadow-sm bg-white sticky top-0 z-10',
          className
        )}
        style={{
          height: `${NAV_HEIGHT}px`,
        }}
        ref={ref}
        {...props}
      >
        <div
          className="flex flex-grow  items-center"
          style={{
            maxWidth: 'calc(100% - 8rem)',
            lineHeight: '36px',
          }}
        >
          {goBack && isMobile && history.length > 2 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="w-[36px] h-[36px] p-0 rounded-full mr-2"
            >
              <ChevronLeftIcon size={20} />
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onMenuClick}
                className="w-[36px] h-[36px] p-0 rounded-full mr-2 text-gray-500"
              >
                <MenuIcon size={20} />
              </Button>
              {sidebar.state == 'collapsed' && (
                <Link
                  className="font-bold text-2xl leading-3 mr-2"
                  to={siteFrontId && currSite ? `/${siteFrontId}` : `/`}
                >
                  {siteFrontId && currSite ? (
                    currSite.logoHtmlStr ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: currSite.logoHtmlStr,
                        }}
                        className="logo-brand"
                        style={{
                          height: `${NAV_HEIGHT - 8}px`,
                          maxWidth: `calc(${SIDEBAR_WIDTH} - 60px)`,
                          minWidth: `50px`,
                        }}
                      ></div>
                    ) : (
                      <BSiteIcon
                        key={currSite.frontId}
                        className="max-w-[180px]"
                        logoUrl={currSite.logoUrl}
                        name={currSite.name}
                        size={42}
                        showSiteName
                      />
                    )
                  ) : (
                    <BSiteIcon
                      className="max-w-[180px]"
                      logoUrl={SITE_LOGO_IMAGE}
                      name={SITE_NAME}
                      size={42}
                    />
                  )}
                </Link>
              )}
            </>
          )}

          {!!category && (
            <>
              {!isMobile && sidebar.state == 'collapsed' && (
                <ChevronRightIcon
                  size={16}
                  className="inline-block mr-2 align-middle text-gray-500"
                />
              )}
              {category.isFront ? (
                <span className="flex-shrink-0 text-ellipsis overflow-hidden whitespace-nowrap">
                  {category.name}
                </span>
              ) : (
                <Link
                  to={`/${siteFrontId}/categories/${category.frontId}`}
                  className="flex-shrink-0 text-ellipsis overflow-hidden whitespace-nowrap"
                >
                  {category.name}
                </Link>
              )}
              <span
                className="flex-shrink-1 px-4 ml-4 border-l-2 text-sm text-gray-500 cursor-pointer flex-grow overflow-hidden whitespace-nowrap text-ellipsis"
                onClick={() => setShowCategoryDetail(true)}
              >
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
            className="w-[36px] h-[36px] p-0 rounded-full mr-2"
            onClick={() => {
              if (onGripClick && typeof onGripClick == 'function') {
                onGripClick()
              }
            }}
          >
            <GripIcon size={20} />
          </Button>
          {isLogined(authState) ? (
            <>
              {isMobile ? (
                <Link to={'/message'}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative w-[36px] h-[36px] p-0 rounded-full mr-2"
                  >
                    <BellIcon size={20} />
                    {notiStore.unreadCount > 0 && (
                      <Badge className="absolute bg-pink-600 hover:bg-pink-600 right-[2px] top-[3px] text-xs px-[4px] py-[0px]">
                        {notiStore.unreadCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              ) : (
                <DropdownMenu onOpenChange={onNotiClick}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative w-[36px] h-[36px] p-0 rounded-full mr-2"
                    >
                      <BellIcon size={20} />
                      {notiStore.unreadCount > 0 && (
                        <Badge className="absolute bg-pink-600 hover:bg-pink-600 right-[2px] top-[3px] text-xs px-[4px] py-[0px]">
                          {notiStore.unreadCount}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    sideOffset={6}
                    align="end"
                    className={cn(
                      `w-[360px] px-2 pt-2 pb-4 bg-gray-200 text-sm overflow-y-auto`
                    )}
                    style={{
                      maxHeight: `calc(100vh - ${NAV_HEIGHT}px)`,
                    }}
                  >
                    <MessageList ref={msgListRef} pageSize={10} />
                    <div className="flex justify-center mt-4">
                      <Button variant="secondary" size="sm" asChild>
                        <Link to="/messages">查看全部</Link>
                      </Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <DropdownMenu onOpenChange={onDropdownChange}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-[36px] h-[36px] p-0 rounded-full"
                  >
                    <BAvatar
                      username={authState.username}
                      className="cursor-pointer"
                      size={32}
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="px-0"
                  align="end"
                  sideOffset={6}
                >
                  <DropdownMenuItem
                    className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                    asChild
                  >
                    <Link to={'/users/' + authState.username}>个人主页</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                    onClick={logout}
                    disabled={loading}
                  >
                    {loading ? <Loader /> : '退出'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
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
          )}
        </div>

        <Dialog open={showCategoryDetail} onOpenChange={setShowCategoryDetail}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-bold">{category?.name}</DialogTitle>
              <DialogDescription>{category?.describe}</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
)

BNav.displayName = 'BNav'

export default BNav
