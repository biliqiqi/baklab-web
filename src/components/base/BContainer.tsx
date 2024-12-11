import { NewspaperIcon } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { cn, getCookie } from '@/lib/utils'

import { NAV_HEIGHT, SITE_NAME } from '@/constants/constants'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  useCategoryStore,
  useDialogStore,
  useNotFoundStore,
  useSidebarStore,
  useTopDrawerStore,
} from '@/state/global'
import { FrontCategory } from '@/types/types'

import NotFound from '../NotFound'
import SigninForm from '../SigninForm'
import SignupForm from '../SignupForm'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import {
  SIDEBAR_COOKIE_NAME,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '../ui/sidebar'
import BIconColorChar from './BIconColorChar'
import { BLoaderBlock } from './BLoader'
import BNav from './BNav'

export interface BContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  category?: FrontCategory
  goBack?: boolean
  loading?: boolean
}

const BContainer = React.forwardRef<HTMLDivElement, BContainerProps>(
  ({ children, category, goBack = false, loading = false, ...props }, ref) => {
    /* const [loading, setLoading] = useState(false) */
    const { categories: cateList } = useCategoryStore()

    const { open: showTopDrawer, update: setShowTopDrawer } =
      useTopDrawerStore()
    const { signin, signup, updateSignin, updateSignup } = useDialogStore()
    const { showNotFound, updateNotFound } = useNotFoundStore()

    const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebarStore()
    const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false)

    const isMobile = useIsMobile()

    /* const [sidebarOpen, setSidebarOpen] = useState(!isMobile) */

    const location = useLocation()

    if (location.pathname == '/') {
      category = {
        frontId: 'feed',
        name: '信息流',
        describe: '你订阅的信息合集',
        isFront: true,
      }
    }

    const onToggleTopDrawer = useCallback(() => {
      setShowTopDrawer(!showTopDrawer)
    }, [showTopDrawer, setShowTopDrawer])

    /* const onSidebarChange = useCallback(
     *   (open: boolean) => {
     *     sidebarStore.setOpen(open)
     *   },
     *   [sidebarStore]
     * ) */

    useEffect(() => {
      if (isMobile) {
        setSidebarOpen(false)
        /* document.cookie = `${SIDEBAR_COOKIE_NAME}=false; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}` */
      } else {
        const state = getCookie(SIDEBAR_COOKIE_NAME)
        setSidebarOpen(state == 'true')
      }
    }, [isMobile])

    useEffect(() => {
      /* console.log('location change, not found: ', showNotFound) */
      updateNotFound(false)
      return () => {
        if (isMobile) {
          /* console.log('close mobile sidebar, current state: ', sidebarOpen) */
          setSidebarOpenMobile(false)
        }
      }
    }, [location, isMobile])

    return (
      <>
        <div
          className="bg-gray-300 border-b-[1px] border-gray-300 shadow-inner transition-all opacity-0 h-0 overflow-hidden"
          style={
            showTopDrawer
              ? {
                  opacity: 1,
                  height: '54px',
                }
              : {}
          }
        >
          <div className="flex items-center w-[1000px] mx-auto h-[54px]">
            {Array(10)
              .fill(1)
              .map((_, idx) => (
                <Button
                  variant="ghost"
                  className="mr-2 rounded-full border-2 border-red-500 w-[40px] h-[40px]"
                  key={idx}
                ></Button>
              ))}
          </div>
        </div>

        <SidebarProvider
          ref={ref}
          defaultOpen={false}
          className="max-w-[1000px] mx-auto relative justify-between"
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          openMobile={sidebarOpenMobile}
          onOpenMobileChange={setSidebarOpenMobile}
        >
          <div
            className={cn(
              'w-0 sticky top-0 left-0 max-h-screen overflow-hidden',
              !isMobile && 'duration-200 transition-[width] ease-linear',
              !isMobile && sidebarOpen && 'w-[var(--sidebar-width)]'
            )}
          >
            <Sidebar className="relative max-h-full" gap={false}>
              <SidebarContent>
                <div
                  className="flex items-center border-b-2 px-2"
                  style={{
                    height: NAV_HEIGHT,
                  }}
                >
                  <Link className="font-bold text-2xl text-pink-900" to="/">
                    {SITE_NAME}
                  </Link>
                </div>
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem key="feed">
                        <SidebarMenuButton
                          asChild
                          isActive={location.pathname == '/'}
                        >
                          <Link to="/">
                            <NewspaperIcon size={16} />
                            信息流
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup>
                  <SidebarGroupLabel>分类</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {cateList.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            asChild
                            isActive={
                              location.pathname == '/categories/' + item.id ||
                              category?.frontId == item.id
                            }
                            className="h-auto"
                          >
                            <Link to={'/categories/' + item.id}>
                              {/* <HashIcon size={20} />
                              <span
                                className="inline-block h-[32px] w-[32px] rounded-full bg-gray-500 text-white text-lg text-center leading-[32px] no-underline"
                                style={{
                                  backgroundColor: stc(item.id),
                                }}
                              >
                                {item.name.charAt(0)}
                              </span> */}
                              <BIconColorChar
                                id={item.id}
                                char={item.name}
                                size={32}
                              />
                              {item.name}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
          </div>
          <main
            className={cn(
              'flex-grow border-l-[1px] b-bg-main w-full',
              !isMobile && 'duration-200 transition-[width] ease-linear',
              !isMobile && sidebarOpen && 'w-[calc(100%-var(--sidebar-width))]'
            )}
          >
            <BNav
              category={category}
              goBack={goBack}
              onGripClick={onToggleTopDrawer}
            />
            <div className="container mx-auto max-w-3xl px-4 py-4" {...props}>
              {showNotFound ? (
                <NotFound />
              ) : loading ? (
                <BLoaderBlock />
              ) : (
                children
              )}
            </div>
          </main>
        </SidebarProvider>

        <Dialog open={signin} onOpenChange={(open) => updateSignin(open)}>
          <DialogContent className="max-sm:max-w-[90%]">
            <DialogHeader>
              <DialogTitle>登录</DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>
            <SigninForm
              dialog
              onSuccess={() => {
                updateSignin(false)
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={signup} onOpenChange={(open) => updateSignup(open)}>
          <DialogContent className="max-sm:max-w-[90%]">
            <DialogHeader>
              <DialogTitle>注册</DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>

            <SignupForm
              dialog
              onSuccess={() => {
                updateSignup(false)
              }}
            />
          </DialogContent>
        </Dialog>
      </>
    )
  }
)

BContainer.displayName = 'BContainer'

export default BContainer
