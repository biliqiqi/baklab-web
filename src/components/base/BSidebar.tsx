import { DropdownMenu } from '@radix-ui/react-dropdown-menu'
import {
  ActivityIcon,
  ChartBarStackedIcon,
  ChevronDownIcon,
  EllipsisVerticalIcon,
  GlobeIcon,
  LockIcon,
  MessageSquareXIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserIcon,
  UserRoundIcon,
  UserRoundXIcon,
} from 'lucide-react'
import React, {
  MouseEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link, useMatch, useNavigate, useParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { timeFmt } from '@/lib/dayjs-custom'
import {
  cn,
  getFirstChar,
  getSiteStatusColor,
  getSiteStatusName,
} from '@/lib/utils'

import { getSiteList, inviteToSite, quitSite } from '@/api/site'
import {
  DEFAULT_PAGE_SIZE,
  NAV_HEIGHT,
  SITE_LOGO_IMAGE,
  SITE_NAME,
} from '@/constants/constants'
import { PermissionAction, PermissionModule } from '@/constants/types'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useCategoryStore,
  useForceUpdate,
  useSidebarStore,
  useSiteStore,
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
import Invite from '../Invite'
import SiteForm from '../SiteForm'
import BIconCircle from '../icon/Circle'
import { Button } from '../ui/button'
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
import {
  SIDEBAR_WIDTH,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../ui/sidebar'
import BAvatar from './BAvatar'
import BIconColorChar from './BIconColorChar'
import BSiteIcon from './BSiteIcon'

interface EditCategoryData {
  editting: boolean
  data: Category | undefined
}

interface EditSiteData {
  editting: boolean
  data: Site | undefined
}

interface BSidebarProps {
  category?: FrontCategory
}

interface SidebarMenuItem<T extends PermissionModule> {
  id: string
  permitModule: T
  permitAction: PermissionAction<T>
  name: string
  link: string
  icon: JSX.Element
}

const platformSidebarMenus: (
  | SidebarMenuItem<'user'>
  | SidebarMenuItem<'role'>
  | SidebarMenuItem<'site'>
  | SidebarMenuItem<'activity'>
  | SidebarMenuItem<'article'>
)[] = [
  {
    id: 'users',
    permitModule: 'user',
    permitAction: 'manage_platform',
    name: '用户',
    link: '/manage/users',
    icon: <UserRoundIcon size={18} />,
  },
  {
    id: 'banned_users',
    permitModule: 'user',
    permitAction: 'manage_platform',
    name: '已封锁',
    link: '/manage/banned_users',
    icon: <UserRoundXIcon size={18} />,
  },
  {
    id: 'user_roles',
    permitModule: 'role',
    permitAction: 'manage_platform',
    name: '角色',
    link: '/manage/roles',
    icon: <UserIcon size={18} />,
  },
  {
    id: 'sites',
    permitModule: 'site',
    permitAction: 'manage_platform',
    name: '站点',
    link: '/manage/sites',
    icon: <GlobeIcon size={18} />,
  },
  {
    id: 'activities',
    permitModule: 'activity',
    permitAction: 'manage_platform',
    name: '活动记录',
    link: '/manage/activities',
    icon: <ActivityIcon size={18} />,
  },
  {
    id: 'trash',
    permitModule: 'article',
    permitAction: 'manage_platform',
    name: '回收站',
    link: '/manage/trash',
    icon: <TrashIcon size={18} />,
  },
]

const BSidebar: React.FC<BSidebarProps> = ({ category }) => {
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteCode, setInviteCode] = useState<InviteCode | null>(null)
  const [inviteCodeGeneratting, setInviteCodeGeneratting] = useState(false)
  const [openSiteMenu, setOpenSiteMenu] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showSiteDetail, setShowSiteDetail] = useState(false)
  const [categoryFormDirty, setCategoryFormDirty] = useState(false)
  const [siteFormDirty, setSiteFormDirty] = useState(false)

  const forceUpdate = useForceUpdate((state) => state.forceUpdate)

  const inviteCodeDialogRef = useRef<HTMLDivElement | null>(null)

  const [editCategory, setEditCategory] = useState<EditCategoryData>({
    editting: false,
    data: undefined,
  })

  const [editSite, setEditSite] = useState<EditSiteData>({
    editting: false,
    data: undefined,
  })

  const { siteFrontId } = useParams()

  const alertDialog = useAlertDialogStore()

  const navigate = useNavigate()

  const { authPermit, currUserId } = useAuthedUserStore(
    useShallow(({ permit, userID, isLogined }) => ({
      currUserId: userID,
      authPermit: permit,
      isLogined,
    }))
  )

  const { groupsOpen, setGroupsOpen } = useSidebarStore(
    useShallow(({ open, setOpen, groupsOpen, setGroupsOpen }) => ({
      sidebarOpen: open,
      setSidebarOpen: setOpen,
      groupsOpen,
      setGroupsOpen,
    }))
  )

  const { cateList, fetchCategoryList } = useCategoryStore(
    useShallow(({ fetchCategoryList, updateCategories, categories }) => ({
      cateList: categories,
      fetchCategoryList,
      updateCategories,
    }))
  )

  const {
    currSite,
    updateCurrSite,
    showSiteForm,
    setShowSiteForm,
    updateSiteList,
    fetchSiteList,
    fetchSiteData,
  } = useSiteStore(
    useShallow(
      ({
        site,
        update,
        showSiteForm,
        setShowSiteForm,
        updateSiteList,
        fetchSiteList,
        fetchSiteData,
      }) => ({
        currSite: site,
        updateCurrSite: update,
        showSiteForm,
        setShowSiteForm,
        updateSiteList,
        fetchSiteList,
        fetchSiteData,
      })
    )
  )

  const categoryListMatch = useMatch(`/${siteFrontId}/categories`)

  const isMySite = useMemo(
    () => (currSite ? currSite.creatorId == currUserId : false),
    [currSite, currUserId]
  )

  const isFeedPage = useMemo(
    () => ['/', `/${siteFrontId}/feed`].includes(location.pathname),
    [siteFrontId, navigate]
  )

  const siteSidebarMenus: (
    | SidebarMenuItem<'user'>
    | SidebarMenuItem<'role'>
    | SidebarMenuItem<'activity'>
    | SidebarMenuItem<'article'>
    | SidebarMenuItem<'site'>
  )[] = [
    {
      id: 'users',
      permitModule: 'user',
      permitAction: 'manage',
      name: '成员',
      link: `/${siteFrontId}/manage/users`,
      icon: <UserRoundIcon size={18} />,
    },
    {
      id: 'blocklist',
      permitModule: 'user',
      permitAction: 'manage',
      name: '黑名单',
      link: `/${siteFrontId}/manage/blocklist`,
      icon: <UserRoundIcon size={18} />,
    },
    {
      id: 'roles',
      permitModule: 'role',
      permitAction: 'edit',
      name: '角色',
      link: `/${siteFrontId}/manage/roles`,
      icon: <UserIcon size={18} />,
    },
    {
      id: 'article_review',
      permitModule: 'article',
      permitAction: 'review',
      name: '人工审核',
      link: `/${siteFrontId}/manage/article_review`,
      icon: <ShieldCheckIcon size={18} />,
    },
    {
      id: 'blocked_words',
      permitModule: 'site',
      permitAction: 'manage',
      name: '屏蔽词',
      link: `/${siteFrontId}/manage/blocked_words`,
      icon: <MessageSquareXIcon size={18} />,
    },
    {
      id: 'activities',
      permitModule: 'activity',
      permitAction: 'access',
      name: '管理日志',
      link: `/${siteFrontId}/manage/activities`,
      icon: <ActivityIcon size={18} />,
    },
  ]

  const onQuitSiteClick = useCallback(
    async (ev: MouseEvent<HTMLDivElement>) => {
      ev.preventDefault()
      setOpenSiteMenu(false)

      if (!siteFrontId || !currSite) return
      const { visible, allowNonMemberInteract } = currSite
      const confirmed = await alertDialog.confirm(
        '确认',
        `${!visible || !allowNonMemberInteract ? '退出后将无法参与本站点互动，确定退出' : '确定退出站点'}？`,
        'danger'
      )
      if (!confirmed) return

      const { code } = await quitSite(siteFrontId)
      if (!code) {
        if (currSite && !currSite.visible) {
          updateCurrSite(null)
          navigate('/', { replace: true })
        }
        await Promise.all([
          fetchSiteData(siteFrontId),
          fetchSiteList(),
          fetchCategoryList(siteFrontId),
        ])
      }
    },
    [
      siteFrontId,
      navigate,
      fetchCategoryList,
      alertDialog,
      currSite,
      fetchSiteData,
      fetchSiteList,
    ]
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

  const onCategoryFormClose = useCallback(async () => {
    if (categoryFormDirty) {
      const { editting } = editCategory
      const confirmed = await alertDialog.confirm(
        '确认',
        editting ? '分类设置未完成，确认舍弃？' : '分类创建未完成，确认舍弃？',
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
    [currSite, setShowSiteForm]
  )

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
        editting ? '站点设置未完成，确认舍弃？' : '站点创建未完成，确认舍弃？',
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
  }, [siteFormDirty, editSite, alertDialog, setShowSiteForm])

  const onSiteCreated = useCallback(
    async (newSiteFrontId: string) => {
      setShowSiteForm(false)
      const { code, data } = await getSiteList(
        1,
        DEFAULT_PAGE_SIZE,
        '',
        currUserId,
        '',
        SITE_VISIBLE.All
      )
      if (!code && data.list) {
        updateSiteList([...data.list])
        if (newSiteFrontId) {
          navigate(`/${newSiteFrontId}`)
        }
      }

      setTimeout(() => {
        setEditSite(() => ({
          editting: false,
          data: undefined,
        }))
      }, 500)

      await Promise.all([
        fetchSiteList(),
        (async () => {
          if (!newSiteFrontId) return
          await fetchSiteData(newSiteFrontId)
        })(),
      ])
      forceUpdate()
    },
    [
      currUserId,
      setShowSiteForm,
      forceUpdate,
      updateSiteList,
      fetchSiteList,
      fetchSiteData,
      navigate,
    ]
  )

  return (
    <>
      <Sidebar className="relative max-h-full" gap={false}>
        <SidebarContent className="gap-0">
          <div
            className="flex justify-between items-center px-2 py-1"
            style={{
              minHeight: `${NAV_HEIGHT}px`,
            }}
          >
            <div className="flex items-center flex-shrink-0">
              <Link
                className="font-bold text-2xl leading-3"
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
                  className="inline-block text-gray-500 ml-2"
                  title={'私有站点'}
                >
                  <LockIcon size={14} />
                </span>
              )}
            </div>
            {currSite && (
              <DropdownMenu open={openSiteMenu} onOpenChange={setOpenSiteMenu}>
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
                  {authPermit('site', 'manage') && (
                    <DropdownMenuItem
                      className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                      onClick={onEditSiteClick}
                    >
                      站点设置
                    </DropdownMenuItem>
                  )}
                  {!currSite.visible && authPermit('site', 'invite') && (
                    <DropdownMenuItem
                      className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                      onClick={onInviteClick}
                    >
                      邀请加入
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                    onClick={() => setShowSiteDetail(true)}
                  >
                    关于
                  </DropdownMenuItem>
                  {!isMySite && currSite.currUserState.isMember && (
                    <DropdownMenuItem
                      className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0 text-destructive"
                      onClick={onQuitSiteClick}
                    >
                      退出站点
                    </DropdownMenuItem>
                  )}
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
              {String(currSite.creatorId) == currUserId &&
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
                {siteFrontId && currSite && (
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
                  {platformSidebarMenus.map(
                    ({ id, permitModule, permitAction, link, icon, name }) =>
                      authPermit(
                        permitModule,
                        permitAction as PermissionAction<typeof permitModule>
                      ) && (
                        <SidebarMenuItem key={id}>
                          <SidebarMenuButton
                            asChild
                            isActive={location.pathname == link}
                          >
                            <Link to={link}>
                              <BIconCircle size={32}>{icon}</BIconCircle>
                              {name}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
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
                                char={item.iconContent}
                                color={item.iconBgColor}
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
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          )}
          {siteFrontId && authPermit('site', 'manage') && (
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
                      {siteSidebarMenus.map(
                        ({
                          id,
                          permitModule,
                          permitAction,
                          name,
                          link,
                          icon,
                        }) =>
                          authPermit(
                            permitModule,
                            permitAction as PermissionAction<
                              typeof permitModule
                            >
                          ) && (
                            <SidebarMenuItem key={id}>
                              <SidebarMenuButton
                                asChild
                                isActive={location.pathname == link}
                              >
                                <Link to={link}>
                                  <BIconCircle size={32}>{icon}</BIconCircle>
                                  {name}
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          )
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          )}
        </SidebarContent>
      </Sidebar>

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
              <div className="text-sm text-gray-500">
                由&nbsp;
                <Link to={`/users/${currSite.creatorName}`}>
                  <BAvatar username={currSite.creatorName} showUsername />
                </Link>
                &nbsp;创建于{timeFmt(currSite.createdAt, 'YYYY-M-D')}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showSiteForm} onOpenChange={onSiteFormClose}>
        <DialogContent className="max-md:max-h-[90vh]">
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
              <Invite
                data={inviteCode}
                loading={inviteCodeGeneratting}
                container={inviteCodeDialogRef.current}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default BSidebar
