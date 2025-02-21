import { DropdownMenu } from '@radix-ui/react-dropdown-menu'
import ClipboardJS from 'clipboard'
import {
  ActivityIcon,
  ChartBarStackedIcon,
  CheckIcon,
  ChevronDownIcon,
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
  useRef,
  useState,
} from 'react'
import {
  Link,
  useLocation,
  useMatch,
  useNavigate,
  useParams,
} from 'react-router-dom'

import { timeAgo } from '@/lib/dayjs-custom'
import { toSync } from '@/lib/fire-and-forget'
import { cn, getSiteStatusColor, getSiteStatusName } from '@/lib/utils'

import { getSiteList, inviteToSite, joinSite, quitSite } from '@/api/site'
import {
  DEFAULT_PAGE_SIZE,
  DOCK_HEIGHT,
  FRONT_END_HOST,
  NAV_HEIGHT,
  SITE_LOGO_IMAGE,
  SITE_NAME,
} from '@/constants/constants'
import { useIsMobile } from '@/hooks/use-mobile'
import useDocumentTitle from '@/hooks/use-page-title'
import {
  useAlertDialogStore,
  useArticleHistoryStore,
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
  InviteCode,
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
import { Card } from '../ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible'
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
import { Input } from '../ui/input'
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
import BAvatar from './BAvatar'
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
    const { forceUpdate } = useForceUpdate()

    const [showCategoryForm, setShowCategoryForm] = useState(false)
    const [showSiteForm, setShowSiteForm] = useState(false)
    const [showSiteDetail, setShowSiteDetail] = useState(false)
    const [showInviteDialog, setShowInviteDialog] = useState(false)
    const [inviteCode, setInviteCode] = useState<InviteCode | null>(null)
    const [inviteCodeGeneratting, setInviteCodeGeneratting] = useState(false)
    const [copyInviteSuccess, setCopyInviteSuccess] = useState(false)

    const { open: showTopDrawer, update: setShowTopDrawer } =
      useTopDrawerStore()
    const { signin, signup, updateSignin, updateSignup } = useDialogStore()
    const { showNotFound, updateNotFound } = useNotFoundStore()

    const {
      open: sidebarOpen,
      setOpen: setSidebarOpen,
      groupsOpen,
      setGroupsOpen,
    } = useSidebarStore()
    const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false)
    const [categoryFormDirty, setCategoryFormDirty] = useState(false)
    const [openSiteMenu, setOpenSiteMenu] = useState(false)

    const [siteFormDirty, setSiteFormDirty] = useState(false)

    const copyInviteBtnRef = useRef<HTMLButtonElement | null>(null)
    const inviteCodeDialogRef = useRef<HTMLDivElement | null>(null)
    const clipboardRef = useRef<ClipboardJS | null>(null)

    const [editCategory, setEditCategory] = useState<EditCategoryData>({
      editting: false,
      data: undefined,
    })

    const [editSite, setEditSite] = useState<EditSiteData>({
      editting: false,
      data: undefined,
    })

    const { siteFrontId } = useParams()
    const navigate = useNavigate()

    const authPermit = useAuthedUserStore((state) => state.permit)

    const alertDialog = useAlertDialogStore()

    const siteStore = useSiteStore()
    const cateStore = useCategoryStore()
    const authStore = useAuthedUserStore()
    const articleHistory = useArticleHistoryStore()

    const currSite = useMemo(() => siteStore.site, [siteStore])
    const globalSiteFrontId = useMemo(() => currSite?.frontId || '', [currSite])
    const isReplyHistory = useMemo(
      () => articleHistory.article?.replyToId != '0',
      [articleHistory]
    )

    const {
      type: alertType,
      open: alertOpen,
      title: alertTitle,
      description: alertDescription,
      setOpen: setAlertOpen,
      confirmBtnText: alertConfirmBtnText,
      cancelBtnText: alertCancelBtnText,
    } = alertDialog

    const isMySite = useMemo(
      () => (currSite ? currSite.creatorId == authStore.userID : false),
      [currSite, authStore]
    )
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
    }, [alertDialog, alertType])

    const onAlertDialogConfirm = useCallback(() => {
      if (alertType == 'confirm') {
        alertDialog.setState((state) => ({
          ...state,
          open: false,
          confirmed: true,
        }))
      }
    }, [alertDialog, alertType])

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
    }, [categoryFormDirty, editCategory, alertDialog])

    const onSiteFormClose = useCallback(async () => {
      const close = () => {
        setShowSiteForm(false)
        setTimeout(() => {
          setEditSite(() => ({
            editting: false,
            data: undefined,
          }))
        }, 500)
      }

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
          close()
        }
      } else {
        close()
      }
    }, [siteFormDirty, editSite, alertDialog])

    const onCategoryCreated = useCallback(async () => {
      setShowCategoryForm(false)
      setTimeout(() => {
        setEditCategory(() => ({
          editting: false,
          data: undefined,
        }))
      }, 500)
      if (!siteFrontId) return
      await fetchCategoryList(siteFrontId)
    }, [siteFrontId, fetchCategoryList])

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
        siteStore.updateSiteList([...data.list])
      }

      setTimeout(() => {
        setEditSite(() => ({
          editting: false,
          data: undefined,
        }))
      }, 500)

      await Promise.all([
        siteStore.fetchSiteList(),
        (async () => {
          if (!siteFrontId) return
          await siteStore.fetchSiteData(siteFrontId)
        })(),
      ])
      forceUpdate()
    }, [authStore, siteStore, siteFrontId, forceUpdate])

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
        setOpenSiteMenu(false)
        setShowSiteForm(true)
      },
      [currSite]
    )

    const onJoinSiteClick = useCallback(
      async (ev: MouseEvent<HTMLButtonElement>) => {
        ev.preventDefault()
        if (!siteFrontId) return
        const { code } = await joinSite(siteFrontId)
        if (!code) {
          await Promise.all([
            siteStore.fetchSiteData(siteFrontId),
            siteStore.fetchSiteList(),
            cateStore.fetchCategoryList(siteFrontId),
          ])
        }
      },
      [cateStore, siteFrontId, siteStore]
    )

    const onQuitSiteClick = useCallback(
      async (ev: MouseEvent<HTMLDivElement>) => {
        ev.preventDefault()
        setOpenSiteMenu(false)

        if (!siteFrontId || !siteStore.site) return
        const { visible, allowNonMemberInteract } = siteStore.site
        const confirmed = await alertDialog.confirm(
          '确认',
          `${!visible || !allowNonMemberInteract ? '退出后将无法参与本站点互动，确定退出' : '确定退出站点'}？`,
          'danger'
        )
        if (!confirmed) return

        const { code } = await quitSite(siteFrontId)
        if (!code) {
          if (siteStore.site && !siteStore.site.visible) {
            siteStore.update(null)
            navigate('/', { replace: true })
          }
          await Promise.all([
            siteStore.fetchSiteData(siteFrontId),
            siteStore.fetchSiteList(),
            cateStore.fetchCategoryList(siteFrontId),
          ])
          /* forceUpdate() */
        }
      },
      [siteFrontId, siteStore, navigate, cateStore, alertDialog]
    )

    const onInviteClick = useCallback(
      async (ev: MouseEvent<HTMLDivElement>) => {
        ev.preventDefault()
        if (!siteFrontId) return

        try {
          setInviteCodeGeneratting(true)
          setShowInviteDialog(true)
          setOpenSiteMenu(false)
          const { code, data } = await inviteToSite(siteFrontId)
          if (!code) {
            setInviteCode(data.code)
          }
        } catch (err) {
          console.error('generate invite code error: ', err)
        } finally {
          setInviteCodeGeneratting(false)
        }
      },
      [siteFrontId]
    )

    useEffect(() => {
      if (siteFrontId) {
        toSync(async () =>
          Promise.all([
            (function () {
              // 避免重复请求站点数据
              if (siteFrontId != globalSiteFrontId) {
                return siteStore.fetchSiteData(siteFrontId)
              }
            })(),
            cateStore.fetchCategoryList(siteFrontId),
          ])
        )()
      } else {
        siteStore.update(null)
        cateStore.updateCategories([])
      }
    }, [siteFrontId, globalSiteFrontId])

    useDocumentTitle('')

    useEffect(() => {
      /* console.log('location change, not found: ', showNotFound) */
      updateNotFound(false)
      return () => {
        if (isMobile) {
          /* console.log('close mobile sidebar, current state: ', sidebarOpen) */
          setSidebarOpenMobile(false)
        }
      }
    }, [location, isMobile, updateNotFound])

    useEffect(() => {
      let timer: number | undefined

      if (showInviteDialog) {
        timer = setTimeout(() => {
          if (
            copyInviteBtnRef.current &&
            !clipboardRef.current &&
            inviteCodeDialogRef.current &&
            inviteCode
          ) {
            clipboardRef.current = new ClipboardJS(copyInviteBtnRef.current, {
              container: inviteCodeDialogRef.current,
            })

            clipboardRef.current.on('success', (e) => {
              setCopyInviteSuccess(true)
              e.clearSelection()
            })
          }
        }, 500) as unknown as number
      }

      return () => {
        if (timer) {
          clearTimeout(timer)
        }

        if (showInviteDialog && clipboardRef.current) {
          clipboardRef.current.destroy()
          clipboardRef.current = null
        }
      }
    }, [siteFrontId, showInviteDialog, inviteCode])

    useEffect(() => {
      if (!showInviteDialog) {
        setCopyInviteSuccess(false)
      }
    }, [showInviteDialog])

    /* console.log('auth logined: ', authStore.isLogined())
     * console.log('site user state: ', siteStore.site?.currUserState) */

    return (
      <div>
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
                  name={`首页`}
                  size={40}
                  fontSize={14}
                  showSiteName
                  active={!siteFrontId}
                  className="w-full"
                  vertical
                />
              </Link>
              {authStore.isLogined() &&
                authStore.permit('site', 'create', true) && (
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
              <SidebarContent className="gap-0">
                <div
                  className="flex justify-between items-center border-b-2 px-2 py-1"
                  style={{
                    minHeight: `${NAV_HEIGHT}px`,
                  }}
                >
                  <div className="flex-shrink-0">
                    <Link
                      className="font-bold text-2xl leading-3"
                      to={
                        siteFrontId && siteStore.site ? `/${siteFrontId}` : `/`
                      }
                    >
                      {siteFrontId && siteStore.site ? (
                        <BSiteIcon
                          key={siteStore.site.frontId}
                          className="max-w-[180px]"
                          logoUrl={siteStore.site.logoUrl}
                          name={siteStore.site.name}
                          size={42}
                          showSiteName
                        />
                      ) : (
                        <BSiteIcon
                          key="home"
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
                    <DropdownMenu
                      open={openSiteMenu}
                      onOpenChange={setOpenSiteMenu}
                    >
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
                        {!currSite.visible &&
                          authStore.permit('site', 'invite') && (
                            <DropdownMenuItem
                              className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                              onClick={onInviteClick}
                            >
                              邀请加入
                            </DropdownMenuItem>
                          )}
                        {!isMySite && currSite.currUserState.isMember && (
                          <DropdownMenuItem
                            className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0 text-destructive"
                            onClick={onQuitSiteClick}
                          >
                            退出站点
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
                    <span className={getSiteStatusColor(currSite.status)}>
                      {getSiteStatusName(currSite.status)}
                    </span>
                    <br />
                    {String(currSite.creatorId) == authStore.userID &&
                      currSite.status != SITE_STATUS.ReadOnly && (
                        <span className="text-sm text-gray-500">
                          在当前状态下，站点内容仅自己可见
                        </span>
                      )}
                  </div>
                )}
                <SidebarGroup key={'default sides'}>
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
                              全部分类
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                {!siteFrontId && authPermit('platform_manage', 'access') && (
                  <SidebarGroup key={'platformManage'}>
                    <SidebarGroupLabel>平台管理</SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {authPermit('user', 'manage_platform') && (
                          <SidebarMenuItem key="users">
                            <SidebarMenuButton asChild>
                              <Link to="/manage/users">
                                <BIconCircle id="users" size={32}>
                                  <UsersRoundIcon size={18} />
                                </BIconCircle>
                                用户
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
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                )}

                {siteFrontId && (
                  <SidebarGroup key={'categories'}>
                    <Collapsible
                      open={groupsOpen.category}
                      onOpenChange={(open) =>
                        setGroupsOpen((state) => ({
                          ...state,
                          category: open,
                        }))
                      }
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarGroupLabel
                          className={cn(
                            'flex justify-between cursor-pointer',
                            !groupsOpen.category && 'mb-0'
                          )}
                        >
                          <span>
                            <ChevronDownIcon
                              size={14}
                              className={cn(
                                'transition-transform duration-200 ease-in-out rotate-0 inline-block align-bottom mr-1',
                                !groupsOpen.category && '-rotate-90'
                              )}
                            />
                            <span>分类</span>
                          </span>

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
                      </CollapsibleTrigger>
                      <CollapsibleContent className="CollapsibleContent">
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
                                    onClick={(e) =>
                                      onEditCategoryClick(e, item)
                                    }
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
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarGroup>
                )}
                {siteFrontId && authStore.permit('site', 'manage') && (
                  <SidebarGroup key={'siteManage'}>
                    <Collapsible
                      open={groupsOpen.siteManage}
                      onOpenChange={(open) =>
                        setGroupsOpen((state) => ({
                          ...state,
                          siteManage: open,
                        }))
                      }
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarGroupLabel
                          className={cn(
                            'flex justify-between cursor-pointer',
                            !groupsOpen.siteManage && 'mb-0'
                          )}
                        >
                          <span>
                            <ChevronDownIcon
                              size={14}
                              className={cn(
                                'transition-transform duration-200 ease-in-out rotate-0 inline-block align-bottom mr-1',
                                !groupsOpen.siteManage && '-rotate-90'
                              )}
                            />
                            <span>站点管理</span>
                          </span>
                          <span></span>
                        </SidebarGroupLabel>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="CollapsibleContent">
                        <SidebarGroupContent>
                          <SidebarMenu>
                            {authPermit('user', 'manage') && (
                              <SidebarMenuItem key="users">
                                <SidebarMenuButton
                                  asChild
                                  isActive={
                                    location.pathname ==
                                    `/${siteFrontId}/manage/users`
                                  }
                                >
                                  <Link to={`/${siteFrontId}/manage/users`}>
                                    <BIconCircle id="users" size={32}>
                                      <UsersRoundIcon size={18} />
                                    </BIconCircle>
                                    成员
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}
                            {authPermit('user', 'manage') && (
                              <SidebarMenuItem key="blocklist">
                                <SidebarMenuButton
                                  asChild
                                  isActive={
                                    location.pathname ==
                                    `/${siteFrontId}/manage/blocklist`
                                  }
                                >
                                  <Link to={`/${siteFrontId}/manage/blocklist`}>
                                    <BIconCircle id="blocklist" size={32}>
                                      <UserRoundXIcon size={18} />
                                    </BIconCircle>
                                    黑名单
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}
                            {authPermit('role', 'edit') && (
                              <SidebarMenuItem key="roles">
                                <SidebarMenuButton
                                  asChild
                                  isActive={
                                    location.pathname ==
                                    `/${siteFrontId}/manage/roles`
                                  }
                                >
                                  <Link to={`/${siteFrontId}/manage/roles`}>
                                    <BIconCircle id="user_roles" size={32}>
                                      <UserIcon size={18} />
                                    </BIconCircle>
                                    角色
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}
                            {authPermit('activity', 'access') && (
                              <SidebarMenuItem key="activities">
                                <SidebarMenuButton
                                  asChild
                                  isActive={
                                    location.pathname ==
                                    `/${siteFrontId}/manage/activities`
                                  }
                                >
                                  <Link
                                    to={`/${siteFrontId}/manage/activities`}
                                  >
                                    <BIconCircle id="activities" size={32}>
                                      <ActivityIcon size={18} />
                                    </BIconCircle>
                                    管理日志
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </CollapsibleContent>
                    </Collapsible>
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
                <>
                  {children}
                  {authStore.isLogined() ? (
                    siteStore.site &&
                    siteStore.site.visible &&
                    !siteStore.site.currUserState.isMember && (
                      <Card className="p-2 px-4 text-sm mt-4 text-center">
                        你还不是当前站点成员，加入后可订阅新内容或参与互动。
                        <Button
                          size={'sm'}
                          className="ml-2"
                          onClick={onJoinSiteClick}
                        >
                          加入
                        </Button>
                      </Card>
                    )
                  ) : (
                    <Card className="p-2 text-sm mt-4 text-center">
                      登录可后参与互动。
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
                    </Card>
                  )}
                </>
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
                <div className="text-sm">
                  <span className="font-bold">创建者</span>：
                  <Link to={`/users/${currSite.creatorName}`}>
                    <BAvatar username={currSite.creatorName} showUsername />
                  </Link>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent ref={inviteCodeDialogRef}>
            {currSite && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-bold">邀请加入站点</DialogTitle>
                  <DialogDescription>
                    请复制以下链接并分享给好友
                  </DialogDescription>
                </DialogHeader>
                <div className="relative">
                  <Input
                    readOnly
                    value={
                      inviteCodeGeneratting || !inviteCode
                        ? `正在生成邀请链接...`
                        : `${FRONT_END_HOST}/invite/${inviteCode.code}`
                    }
                    className={cn(
                      'pr-[54px]',
                      inviteCodeGeneratting && 'text-gray-500'
                    )}
                  />
                  {inviteCode && (
                    <div className="my-2 text-sm text-gray-500">
                      该邀请链接将在 {timeAgo(inviteCode.expiredAt)}失效
                    </div>
                  )}
                  <Button
                    size={'sm'}
                    className="absolute top-0 right-0 h-[40px] rounded-sm rounded-l-none"
                    data-clipboard-text={`${FRONT_END_HOST}/invite/${inviteCode?.code || ''}`}
                    ref={copyInviteBtnRef}
                    disabled={!inviteCode}
                  >
                    复制
                  </Button>
                </div>
                <div className="flex justify-center py-4">
                  {copyInviteSuccess && (
                    <span className="inline-block h-[26px]">
                      <CheckIcon className="inline-block mr-2 text-primary" />
                      <span>复制成功！</span>
                    </span>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={articleHistory.showDialog}
          onOpenChange={(open) =>
            articleHistory.updateState({ showDialog: open })
          }
        >
          <DialogContent>
            {articleHistory.article && (
              <>
                <DialogHeader>
                  <DialogTitle>{`"${articleHistory.article.displayTitle}" 的编辑历史`}</DialogTitle>
                  <DialogDescription></DialogDescription>
                </DialogHeader>
                <div
                  className="overflow-y-auto"
                  style={{ maxHeight: `calc(100vh - 300px)` }}
                >
                  {articleHistory.history.map((item) => (
                    <div key={item.id}>
                      <div className="flex justify-between items-center mt-4">
                        <span className="font-bold">
                          版本：{item.versionNum}
                        </span>
                        <span className="text-sm">
                          由{' '}
                          <Link
                            to={`/users/${item.operator.name}`}
                            className="text-primary"
                          >
                            {item.operator.name}
                          </Link>{' '}
                          编辑于 {timeAgo(item.createdAt)}
                        </span>
                      </div>
                      {!isReplyHistory && (
                        <div className="flex mt-2 text-sm">
                          <div className="w-[50px] font-bold mr-1 pt-2">
                            标题：
                          </div>
                          <div
                            className="flex-shrink-0 flex-grow bg-gray-100 p-2"
                            style={{
                              maxWidth: `calc(100% - 50px)`,
                            }}
                            dangerouslySetInnerHTML={{
                              __html: item.titleDiffHTML,
                            }}
                          ></div>
                        </div>
                      )}
                      {!isReplyHistory && (
                        <div className="flex mt-2 text-sm">
                          <div className="w-[50px] font-bold mr-1 pt-2">
                            分类：
                          </div>
                          <div
                            className="flex-shrink-0 flex-grow bg-gray-100 p-2"
                            style={{
                              maxWidth: `calc(100% - 50px)`,
                            }}
                            dangerouslySetInnerHTML={{
                              __html: item.categoryFrontIdDiffHTML,
                            }}
                          ></div>
                        </div>
                      )}
                      {!isReplyHistory && (
                        <div className="flex mt-2 text-sm">
                          <div className="w-[50px] font-bold mr-1 pt-2">
                            链接：
                          </div>
                          <div
                            className="flex-shrink-0 flex-grow bg-gray-100 p-2"
                            style={{
                              maxWidth: `calc(100% - 50px)`,
                            }}
                            dangerouslySetInnerHTML={{
                              __html: item.urlDiffHTML,
                            }}
                          ></div>
                        </div>
                      )}
                      <div className="flex mt-2 text-sm">
                        <div className="w-[50px] font-bold mr-1 pt-2">
                          内容：
                        </div>
                        <div
                          className="flex-shrink-0 flex-grow bg-gray-100 p-2 whitespace-break-spaces"
                          style={{
                            maxWidth: `calc(100% - 50px)`,
                          }}
                          dangerouslySetInnerHTML={{
                            __html: item.contentDiffHTML,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
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
