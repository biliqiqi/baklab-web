import { HashIcon, NewspaperIcon } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { toSync } from '@/lib/fire-and-forget'

import SigninPage from '@/SigninPage'
import SubmitPage from '@/SubmitPage'
import { getCategoryList } from '@/api'
import { NAV_HEIGHT, SITE_NAME } from '@/constants'
import { useDialogStore, useTopDrawerStore } from '@/state/global'
import { CategoryOption } from '@/types/types'

import SigninForm from '../SigninForm'
import SignupForm from '../SignupForm'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../ui/drawer'
import {
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
import BNav, { FrontCategory } from './BNav'

export interface BContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  category?: FrontCategory
  goBack?: boolean
}

const BContainer = React.forwardRef<HTMLDivElement, BContainerProps>(
  ({ children, category, goBack = false, ...props }, ref) => {
    /* const [loading, setLoading] = useState(false) */
    const [cateList, setCateList] = useState<CategoryOption[]>([])
    const { open: showTopDrawer, update: setShowTopDrawer } =
      useTopDrawerStore()
    const { signin, signup, updateSignin, updateSignup } = useDialogStore()

    const location = useLocation()

    if (location.pathname == '/') {
      category = {
        frontId: 'feed',
        name: '信息流',
        describe: '你订阅的信息合集',
        isFront: true,
      }
    }

    const fetchCateList = toSync(async () => {
      try {
        /* setLoading(true) */
        const data = await getCategoryList()
        if (!data.code) {
          setCateList([...data.data])
        }
      } catch (err) {
        console.error('fetch category list error: ', err)
      } finally {
        /* setLoading(false) */
      }
    })

    const onToggleTopDrawer = useCallback(() => {
      setShowTopDrawer(!showTopDrawer)
    }, [showTopDrawer, setShowTopDrawer])

    useEffect(() => {
      fetchCateList()
    }, [])

    /* console.log('pathname: ', location.pathname) */

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
        <SidebarProvider ref={ref} className="max-w-[1000px] mx-auto relative">
          <Sidebar className="sticky top-0 left-0 max-h-[100vh]" gap={false}>
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
                        >
                          <Link to={'/categories/' + item.id}>
                            <HashIcon size={20} />
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
          <main className="flex-grow max-w-[100%] border-l-[1px] b-bg-main">
            <BNav
              category={category}
              goBack={goBack}
              onGripClick={onToggleTopDrawer}
            />
            <div className="container mx-auto max-w-3xl px-4 py-4" {...props}>
              {children}
            </div>
          </main>
        </SidebarProvider>

        <Dialog open={signin} onOpenChange={(open) => updateSignin(open)}>
          <DialogContent>
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
          <DialogContent>
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
