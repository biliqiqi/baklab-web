import { DropdownMenu } from '@radix-ui/react-dropdown-menu'
import {
  ActivityIcon,
  ChartBarStackedIcon,
  EllipsisVerticalIcon,
  GlobeIcon,
  LockIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
  UserRoundXIcon,
  UsersRoundIcon,
} from 'lucide-react'
import React, {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Link, useLocation, useMatch, useParams } from 'react-router-dom'

import { toSync } from '@/lib/fire-and-forget'
import { cn, getSiteStatusColor, getSiteStatusName } from '@/lib/utils'

import { getSiteList } from '@/api/site'
import {
  DEFAULT_PAGE_SIZE,
  DOCK_HEIGHT,
  NAV_HEIGHT,
  SITE_LOGO_IMAGE,
  SITE_NAME,
} from '@/constants/constants'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useCategoryStore,
  useDialogStore,
  useForceUpdate,
  useNotFoundStore,
  useSidebarStore,
  useSiteStore,
  useTopDrawerStore,
} from '@/state/global'
import {
  Category,
  FrontCategory,
  SITE_STATUS,
  SITE_VISIBLE,
  Site,
} from '@/types/types'

import CategoryForm from '../CategoryForm'
import NotFound from '../NotFound'
import SigninForm from '../SigninForm'
import SignupForm from '../SignupForm'
import SiteForm from '../SiteForm'
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
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
import BSiteIcon from './BSiteIcon'

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

interface EditSiteData {
  editting: boolean
  data: Site | undefined
}

const BContainer = React.forwardRef<HTMLDivElement, BContainerProps>(
  ({ children, category, goBack = false, loading = false, ...props }, ref) => {
    const [regEmail, setRegEmail] = useState('')
    /* const [loading, setLoading] = useState(false) */
    const { categories: cateList, fetchCategoryList } = useCategoryStore()
    const { forceState, forceUpdate } = useForceUpdate()

    const [showCategoryForm, setShowCategoryForm] = useState(false)
    const [showSiteForm, setShowSiteForm] = useState(false)
    const [showSiteDetail, setShowSiteDetail] = useState(false)

    const { open: showTopDrawer, update: setShowTopDrawer } =
      useTopDrawerStore()
    const { signin, signup, updateSignin, updateSignup } = useDialogStore()
    const { showNotFound, updateNotFound } = useNotFoundStore()

    const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebarStore()
    const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false)
    const [categoryFormDirty, setCategoryFormDirty] = useState(false)

    const [siteFormDirty, setSiteFormDirty] = useState(false)

    const [editCategory, setEditCategory] = useState<EditCategoryData>({
      editting: false,
      data: undefined,
    })

    const [editSite, setEditSite] = useState<EditSiteData>({
      editting: false,
      data: undefined,
    })

    const { siteFrontId } = useParams()

    const authPermit = useAuthedUserStore((state) => state.permit)

    const alertDialog = useAlertDialogStore()
    const siteStore = useSiteStore()
    const cateStore = useCategoryStore()
    const authStore = useAuthedUserStore()

    const currSite = useMemo(() => siteStore.site, [siteStore])
    const globalSiteFrontId = useMemo(() => currSite?.frontId || '', [currSite])

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
    const isFeedPage = useMemo(
      () => ['/', `/${siteFrontId}/feed`].includes(location.pathname),
      [location, siteFrontId]
    )

    const categoryListMatch = useMatch(`/${siteFrontId}/categories`)

    if (isFeedPage) {
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
      if (!showTopDrawer) {
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        })
      }
      setShowTopDrawer(!showTopDrawer)
      document.cookie = `top_drawer:state=${String(!showTopDrawer)};path=/`
    }, [showTopDrawer, setShowTopDrawer])

    const onCategoryFormClose = useCallback(async () => {
      if (categoryFormDirty) {
        const { editting } = editCategory
        const confirmed = await alertDialog.confirm(
          '确认',
          editting
            ? '分类设置未完成，确认舍弃？'
            : '分类创建未完成，确认舍弃？',
          'normal',
          {
            confirmBtnText: '确定舍弃',
            cancelBtnText: editting ? '继续设置' : '继续创建',
          }
        )
        if (confirmed) {
          setShowCategoryForm(false)
        }
      } else {
        setShowCategoryForm(false)
      }

      setTimeout(() => {
        setEditCategory(() => ({
          editting: false,
          data: undefined,
        }))
      }, 500)
    }, [categoryFormDirty, editCategory])

    const onSiteFormClose = useCallback(async () => {
      if (siteFormDirty) {
        const { editting } = editSite
        const confirmed = await alertDialog.confirm(
          '确认',
          editting
            ? '站点设置未完成，确认舍弃？'
            : '站点创建未完成，确认舍弃？',
          'normal',
          {
            confirmBtnText: '确定舍弃',
            cancelBtnText: editting ? '继续设置' : '继续创建',
          }
        )
        if (confirmed) {
          setShowSiteForm(false)
        }
      } else {
        setShowSiteForm(false)
      }

      setTimeout(() => {
        setEditSite(() => ({
          editting: false,
          data: undefined,
        }))
      }, 500)
    }, [siteFormDirty, editSite])

    const onCategoryCreated = useCallback(async () => {
      setShowCategoryForm(false)
      if (!siteFrontId) return
      await fetchCategoryList(siteFrontId)
    }, [siteFrontId])

    const onSiteCreated = useCallback(async () => {
      setShowSiteForm(false)
      const { code, data } = await getSiteList(
        1,
        DEFAULT_PAGE_SIZE,
        '',
        authStore.userID,
        '',
        SITE_VISIBLE.All
      )
      if (!code && data.list) {
        siteStore.updateState({
          ...siteStore,
          siteList: data.list,
        })
      }

      await Promise.all([
        siteStore.fetchSiteList(),
        (async () => {
          if (!siteFrontId) return
          await siteStore.fetchSiteData(siteFrontId)
        })(),
      ])
      forceUpdate()
    }, [authStore, siteStore, siteFrontId])

    const onCreateCategoryClick = (ev: MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault()
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

    const onEditSiteClick = useCallback(
      (ev: MouseEvent<HTMLDivElement>) => {
        ev.preventDefault()
        if (!currSite) return
        setEditSite({
          editting: true,
          data: currSite,
        })
        setShowSiteForm(true)
      },
      [siteStore]
    )

    useEffect(() => {
      /* console.log('globalSiteFrontId: ', globalSiteFrontId) */
      if (siteFrontId && siteFrontId != globalSiteFrontId) {
        /* console.log('fetch site data!') */
        toSync(async () =>
          Promise.all([
            siteStore.fetchSiteData(siteFrontId),
            cateStore.fetchCategoryList(siteFrontId),
          ])
        )()
      }

      if (!siteFrontId) {
        siteStore.update(null)
        cateStore.updateCategories([])
      }
    }, [siteFrontId])

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
      <div key={`container_${forceState}`}>
        <div
          className="bg-gray-300 border-b-[1px] border-gray-300 shadow-inner transition-all opacity-0 h-0 overflow-hidden"
          style={
            showTopDrawer
              ? {
                  opacity: 1,
                  height: `${DOCK_HEIGHT}px`,
                }
              : {}
          }
        >
          <div
            className="flex justify-center items-center max-w-[1000px] mx-auto"
            style={{ height: `${DOCK_HEIGHT}px` }}
          >
            <div className="inline-flex items-center">
              {siteStore.siteList &&
                siteStore.siteList.map((site) => (
                  <Link
                    to={`/${site.frontId}`}
                    key={site.frontId}
                    className={cn(
                      'flex justify-center h-full w-[60px] overflow-hidden flex-shrink-0 flex-grow-0 mr-2 leading-3'
                    )}
                  >
                    <BSiteIcon
                      logoUrl={site.logoUrl}
                      name={site.name}
                      size={40}
                      fontSize={14}
                      showSiteName
                      active={siteFrontId == site.frontId}
                      vertical
                      className="w-full"
                    />
                  </Link>
                ))}
            </div>
            <div className="inline-flex items-center">
              <Link
                to={`/`}
                className={cn(
                  'flex justify-center h-full w-[60px] overflow-hidden flex-shrink-0 flex-grow-0 mr-2 leading-3'
                )}
              >
                <BSiteIcon
                  logoUrl={SITE_LOGO_IMAGE}
                  name={SITE_NAME}
                  size={40}
                  fontSize={14}
                  showSiteName
                  active={!siteFrontId}
                  className="w-full"
                  vertical
                />
              </Link>
              {authStore.isLogined() && authStore.permit('site', 'create') && (
                <span className="inline-flex flex-col items-center align-middle">
                  <Button
                    variant="secondary"
                    className="rounded-full w-[40px] h-[40px] text-[24px] text-center text-gray-500 mb-1"
                    key="new-site"
                    onClick={() => {
                      setShowSiteForm(true)
                    }}
                    title="创建站点"
                  >
                    +
                  </Button>
                  <span className="text-[14px] leading-[1.2]">创建站点</span>
                </span>
              )}
            </div>
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
                  className="flex justify-between items-center border-b-2 px-2 py-1"
                  style={{
                    minHeight: `${NAV_HEIGHT}px`,
                  }}
                >
                  <div className="flex-shrink-0">
                    <Link
                      className="font-bold text-2xl text-pink-900 leading-3"
                      to={
                        siteFrontId && siteStore.site ? `/${siteFrontId}` : `/`
                      }
                    >
                      {siteFrontId && siteStore.site ? (
                        <BSiteIcon
                          className="max-w-[180px]"
                          logoUrl={siteStore.site.logoUrl}
                          name={siteStore.site.name}
                          size={42}
                          showSiteName
                        />
                      ) : (
                        <BSiteIcon
                          className="max-w-[180px]"
                          logoUrl={SITE_LOGO_IMAGE}
                          name={SITE_NAME}
                          size={42}
                          showSiteName
                        />
                      )}
                    </Link>
                    {currSite && !currSite.visible && (
                      <span
                        className="inline-block text-gray-500 ml-1"
                        title={'私有站点'}
                      >
                        <LockIcon size={14} />
                      </span>
                    )}
                  </div>
                  {currSite && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-[36px] w-[36px] p-0 text-gray-500"
                        >
                          <EllipsisVerticalIcon size={20} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="px-0"
                        align="end"
                        sideOffset={6}
                      >
                        {authStore.permit('site', 'manage') && (
                          <DropdownMenuItem
                            className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                            onClick={onEditSiteClick}
                          >
                            站点设置
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                          onClick={() => setShowSiteDetail(true)}
                        >
                          关于
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {currSite && currSite.status != SITE_STATUS.Normal && (
                  <div className="bg-yellow-300 p-2 m-2 text-sm rounded-sm leading-6">
                    站点状态：
                    <span>{getSiteStatusName(currSite.status)}</span>
                    <br />
                    {String(currSite.creatorId) == authStore.userID &&
                      currSite.status != SITE_STATUS.ReadOnly && (
                        <span className="text-sm text-gray-500">
                          在当前状态下，站点内容仅自己可见
                        </span>
                      )}
                  </div>
                )}
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem key="feed">
                        <SidebarMenuButton asChild isActive={isFeedPage}>
                          <Link to={siteFrontId ? `/${siteFrontId}/feed` : `/`}>
                            <BIconCircle id="feed" size={32}>
                              <PackageIcon size={18} />
                            </BIconCircle>
                            信息流
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {siteFrontId && siteStore.site && (
                        <SidebarMenuItem key="categories">
                          <SidebarMenuButton
                            asChild
                            isActive={categoryListMatch != null}
                          >
                            <Link to={`/${siteFrontId}/categories`}>
                              <BIconCircle id="categories" size={32}>
                                <ChartBarStackedIcon size={18} />
                              </BIconCircle>
                              分类
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                {!siteFrontId && authPermit('platform_manage', 'access') && (
                  <SidebarGroup>
                    <SidebarGroupLabel>平台管理</SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {authPermit('site', 'manage_platform') && (
                          <SidebarMenuItem key="sites">
                            <SidebarMenuButton asChild>
                              <Link to="/manage/sites">
                                <BIconCircle id="sites" size={32}>
                                  <GlobeIcon size={18} />
                                </BIconCircle>
                                站点
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {authPermit('activity', 'manage_platform') && (
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
                        {authPermit('article', 'manage_platform') && (
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
                        {authPermit('user', 'manage_platform') && (
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
                        {authPermit('user', 'manage_platform') && (
                          <SidebarMenuItem key="banned_users">
                            <SidebarMenuButton asChild>
                              <Link to="/manage/banned_users">
                                <BIconCircle id="banned_users" size={32}>
                                  <UserRoundXIcon size={18} />
                                </BIconCircle>
                                已封锁
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {authPermit('role', 'manage_platform') && (
                          <SidebarMenuItem key="user_roles">
                            <SidebarMenuButton asChild>
                              <Link to="/manage/roles">
                                <BIconCircle id="user_roles" size={32}>
                                  <UserIcon size={18} />
                                </BIconCircle>
                                角色
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                )}

                {siteFrontId && (
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
                                  `/${siteFrontId}/categories/${item.frontId}` ||
                                category?.frontId == item.frontId
                              }
                            >
                              <Link
                                to={`/${siteFrontId}/categories/${item.frontId}`}
                              >
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
                )}
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

        <Dialog open={showSiteForm} onOpenChange={onSiteFormClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editSite.editting ? '设置站点' : '创建站点'}
              </DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>

            <SiteForm
              isEdit={editSite.editting}
              site={editSite.data}
              onChange={setSiteFormDirty}
              onSuccess={onSiteCreated}
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

        <Dialog open={showSiteDetail} onOpenChange={setShowSiteDetail}>
          <DialogContent>
            {currSite && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-bold">
                    关于{currSite.name}{' '}
                  </DialogTitle>
                  <DialogDescription></DialogDescription>
                </DialogHeader>
                <div>{currSite.description}</div>
                <div className="mt-2 font-bold">规则</div>
                <div>
                  <div>1. 规则一</div>
                  <div>2. 规则二</div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }
)

BContainer.displayName = 'BContainer'

export default BContainer
