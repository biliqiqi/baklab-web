import {
  ActivityIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
  UsersRoundIcon,
} from 'lucide-react'
import React, { MouseEvent, useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { cn, getCookie } from '@/lib/utils'

import { getCategoryList } from '@/api/category'
import { NAV_HEIGHT, SITE_NAME } from '@/constants/constants'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useCategoryStore,
  useDialogStore,
  useNotFoundStore,
  useSidebarStore,
  useTopDrawerStore,
} from '@/state/global'
import { Category, FrontCategory } from '@/types/types'

import CategoryForm from '../CategoryForm'
import NotFound from '../NotFound'
import SigninForm from '../SigninForm'
import SignupForm from '../SignupForm'
import BIconCircle from '../icon/Circle'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'
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
  SidebarMenuAction,
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

interface EditCategoryData {
  editting: boolean
  data: Category | undefined
}

const BContainer = React.forwardRef<HTMLDivElement, BContainerProps>(
  ({ children, category, goBack = false, loading = false, ...props }, ref) => {
    const [regEmail, setRegEmail] = useState('')
    /* const [loading, setLoading] = useState(false) */
    const { categories: cateList, updateCategories } = useCategoryStore()

    const [showCategoryForm, setShowCategoryForm] = useState(false)

    const { open: showTopDrawer, update: setShowTopDrawer } =
      useTopDrawerStore()
    const { signin, signup, updateSignin, updateSignup } = useDialogStore()
    const { showNotFound, updateNotFound } = useNotFoundStore()

    const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebarStore()
    const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false)
    const [categoryFormDirty, setCategoryFormDirty] = useState(false)
    const [editCategory, setEditCategory] = useState<EditCategoryData>({
      editting: false,
      data: undefined,
    })

    const authPermit = useAuthedUserStore((state) => state.permit)

    const alertDialog = useAlertDialogStore()

    const {
      type: alertType,
      open: alertOpen,
      title: alertTitle,
      description: alertDescription,
      setOpen: setAlertOpen,
      confirmBtnText: alertConfirmBtnText,
      cancelBtnText: alertCancelBtnText,
    } = alertDialog

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

    const onAlertDialogCancel = useCallback(() => {
      if (alertType == 'confirm') {
        alertDialog.setState((state) => ({
          ...state,
          open: false,
          confirmed: false,
        }))
      }
    }, [alertDialog])

    const onAlertDialogConfirm = useCallback(() => {
      if (alertType == 'confirm') {
        alertDialog.setState((state) => ({
          ...state,
          open: false,
          confirmed: true,
        }))
      }
    }, [alertDialog])

    const onToggleTopDrawer = useCallback(() => {
      setShowTopDrawer(!showTopDrawer)
    }, [showTopDrawer, setShowTopDrawer])

    /* const onSidebarChange = useCallback(
     *   (open: boolean) => {
     *     sidebarStore.setOpen(open)
     *   },
     *   [sidebarStore]
     * ) */

    const onCategoryFormClose = useCallback(async () => {
      if (categoryFormDirty) {
        const { editting } = editCategory
        alertDialog.setState((state) => ({
          ...state,
          confirmBtnText: '确定舍弃',
          cancelBtnText: editting ? '继续设置' : '继续创建',
        }))
        const confirmed = await alertDialog.confirm(
          '确认',
          editting ? '分类设置未完成，确认舍弃？' : '分类创建未完成，确认舍弃？'
        )
        if (confirmed) {
          setShowCategoryForm(false)
        }
      } else {
        setShowCategoryForm(false)
      }
    }, [categoryFormDirty, editCategory])

    const onCategoryCreated = useCallback(async () => {
      setShowCategoryForm(false)
      const resp = await getCategoryList()
      if (!resp.code) {
        updateCategories([...resp.data])
      }
    }, [])

    const onCreateCategoryClick = (ev: MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault()
      setEditCategory({
        editting: false,
        data: undefined,
      })
      setShowCategoryForm(true)
    }

    const onEditCategoryClick = (
      ev: MouseEvent<HTMLButtonElement>,
      category: Category
    ) => {
      ev.preventDefault()
      setEditCategory({
        editting: true,
        data: category,
      })
      setShowCategoryForm(true)
    }

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
                    height: `${NAV_HEIGHT}px`,
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
                            <BIconCircle id="feed" size={32}>
                              <PackageIcon size={18} />
                            </BIconCircle>
                            信息流
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
                {authPermit('manage', 'access') && (
                  <SidebarGroup>
                    <SidebarGroupLabel>管理</SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {authPermit('activity', 'access') && (
                          <SidebarMenuItem key="activities">
                            <SidebarMenuButton asChild>
                              <Link to="/manage/activities">
                                <BIconCircle id="activities" size={32}>
                                  <ActivityIcon size={18} />
                                </BIconCircle>
                                活动记录
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {authPermit('article', 'delete_others') && (
                          <SidebarMenuItem key="trash">
                            <SidebarMenuButton asChild>
                              <Link to="/manage/trash">
                                <BIconCircle id="trash" size={32}>
                                  <TrashIcon size={18} />
                                </BIconCircle>
                                回收站
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {authPermit('user', 'manage') && (
                          <SidebarMenuItem key="users">
                            <SidebarMenuButton asChild>
                              <Link to="/manage/users">
                                <BIconCircle id="users" size={32}>
                                  <UsersRoundIcon size={18} />
                                </BIconCircle>
                                用户列表
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {authPermit('role', 'access') && (
                          <SidebarMenuItem key="user_roles">
                            <SidebarMenuButton asChild>
                              <Link to="/manage/roles">
                                <BIconCircle id="user_roles" size={32}>
                                  <UserIcon size={18} />
                                </BIconCircle>
                                用户角色
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                )}
                <SidebarGroup>
                  <SidebarGroupLabel className="flex justify-between">
                    <span>分类</span>
                    {authPermit('category', 'create') && (
                      <Button
                        variant="ghost"
                        className="p-0 w-[24px] h-[24px] rounded-full"
                        onClick={onCreateCategoryClick}
                      >
                        <PlusIcon size={18} className="text-gray-500" />
                      </Button>
                    )}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {cateList.map((item) => (
                        <SidebarMenuItem key={item.frontId}>
                          <SidebarMenuButton
                            asChild
                            isActive={
                              location.pathname ==
                                '/categories/' + item.frontId ||
                              category?.frontId == item.frontId
                            }
                          >
                            <Link to={'/categories/' + item.frontId}>
                              <BIconColorChar
                                iconId={item.frontId}
                                char={item.name}
                                size={32}
                              />
                              {item.name}
                            </Link>
                          </SidebarMenuButton>
                          {authPermit('category', 'edit') && (
                            <SidebarMenuAction
                              style={{
                                top: '10px',
                                width: '28px',
                                height: '28px',
                              }}
                              className="rounded-full"
                              onClick={(e) => onEditCategoryClick(e, item)}
                            >
                              <PencilIcon
                                size={14}
                                className="inline-block mr-1 text-gray-500"
                              />
                            </SidebarMenuAction>
                          )}
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

        <Dialog open={signin} onOpenChange={updateSignin}>
          <DialogContent className="max-sm:max-w-[90%]">
            <DialogHeader>
              <DialogTitle>登录</DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>
            <SigninForm
              dialog
              email={regEmail}
              setEmail={setRegEmail}
              onSuccess={() => {
                updateSignin(false)
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={signup} onOpenChange={updateSignup}>
          <DialogContent className="max-sm:max-w-[90%]">
            <DialogHeader>
              <DialogTitle>注册</DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>

            <SignupForm
              dialog
              email={regEmail}
              setEmail={setRegEmail}
              onSuccess={() => {
                updateSignup(false)
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showCategoryForm} onOpenChange={onCategoryFormClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editCategory.editting ? '设置分类' : '创建分类'}
              </DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>

            <CategoryForm
              isEdit={editCategory.editting}
              category={editCategory.data}
              onChange={setCategoryFormDirty}
              onSuccess={onCategoryCreated}
            />
          </DialogContent>
        </Dialog>

        <AlertDialog
          defaultOpen={false}
          open={alertOpen}
          onOpenChange={setAlertOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{alertTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {alertDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {alertType != 'alert' && (
                <AlertDialogCancel onClick={onAlertDialogCancel}>
                  {alertCancelBtnText}
                </AlertDialogCancel>
              )}
              <AlertDialogAction
                onClick={onAlertDialogConfirm}
                className={
                  alertDialog.confirmType == 'danger'
                    ? 'bg-red-600 hover:bg-red-500'
                    : ''
                }
              >
                {alertConfirmBtnText}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }
)

BContainer.displayName = 'BContainer'

export default BContainer
