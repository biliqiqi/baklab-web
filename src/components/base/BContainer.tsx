import React, { useEffect, useState } from 'react'

import { getCategoryList } from '@/api'
import { NAV_HEIGHT, SITE_NAME } from '@/constants'
import { toSync } from '@/lib/fire-and-forget'
import SubmitPage from '@/SubmitPage'
import { CategoryOption } from '@/types/types'
import { GripIcon, HashIcon, NewspaperIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '../ui/button'
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

    useEffect(() => {
      fetchCateList()
    }, [])

    /* console.log('pathname: ', location.pathname) */

    return (
      <SidebarProvider ref={ref} className="max-w-[1000px] mx-auto relative">
        <Sidebar className="sticky top-0 left-0 max-h-[100vh]" gap={false}>
          <SidebarContent>
            <div
              className="flex items-center border-b-2 px-2"
              style={{
                height: NAV_HEIGHT,
              }}
            >
              <Button variant="ghost" size="sm" className="rounded-full">
                <GripIcon size={20} />
              </Button>
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
          <Drawer>
            <BNav category={category} goBack={goBack} />
            <div className="container mx-auto max-w-3xl px-4 py-4" {...props}>
              {children}
            </div>

            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>创建帖子</DrawerTitle>
              </DrawerHeader>
              <SubmitPage />
            </DrawerContent>
          </Drawer>
        </main>
      </SidebarProvider>
    )
  }
)

BContainer.displayName = 'BContainer'

export default BContainer
