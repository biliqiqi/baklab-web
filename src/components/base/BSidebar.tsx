import {
  ActivityIcon,
  ChartBarStackedIcon,
  ChevronDownIcon,
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
import React, { MouseEvent, useCallback, useMemo, useState } from 'react'
import { Link, useMatch, useNavigate, useParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { cn, getSiteStatusColor, getSiteStatusName } from '@/lib/utils'

import { NAV_HEIGHT, SITE_LOGO_IMAGE, SITE_NAME } from '@/constants/constants'
import { PermissionAction, PermissionModule } from '@/constants/types'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useCategoryStore,
  useSidebarStore,
  useSiteStore,
  useSiteUIStore,
} from '@/state/global'
import { Category, FrontCategory, SITE_STATUS } from '@/types/types'

import CategoryForm from '../CategoryForm'
import SiteMenuButton from '../SiteMenuButton'
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
import BIconColorChar from './BIconColorChar'
import BSiteIcon from './BSiteIcon'

interface EditCategoryData {
  editting: boolean
  data: Category | undefined
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
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryFormDirty, setCategoryFormDirty] = useState(false)

  const [editCategory, setEditCategory] = useState<EditCategoryData>({
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

  const { currSite } = useSiteStore(
    useShallow(({ site, update }) => ({
      currSite: site,
      updateCurrSite: update,
    }))
  )

  const { siteMode } = useSiteUIStore(
    useShallow(({ mode }) => ({ siteMode: mode }))
  )

  const categoryListMatch = useMatch(`/${siteFrontId}/bankuai`)

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

  const onCategoryFormClose = useCallback(async () => {
    if (categoryFormDirty) {
      const { editting } = editCategory
      const confirmed = await alertDialog.confirm(
        '确认',
        editting ? '板块设置未完成，确认舍弃？' : '板块创建未完成，确认舍弃？',
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

  return (
    <>
      <Sidebar className="relative max-h-full" gap={false}>
        <SidebarContent className="gap-0">
          {siteMode == 'sidebar' && (
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
              {currSite && <SiteMenuButton />}
            </div>
          )}
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
                      <Link to={`/${siteFrontId}/bankuai`}>
                        <BIconCircle id="categories" size={32}>
                          <ChartBarStackedIcon size={18} />
                        </BIconCircle>
                        全部板块
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
                      <span>板块</span>
                    </span>

                    {authPermit('category', 'create') && (
                      <Button
                        variant="ghost"
                        className="p-0 w-[24px] h-[24px] rounded-full"
                        onClick={onCreateCategoryClick}
                        title="创建板块"
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
                                `/${siteFrontId}/bankuai/${item.frontId}` ||
                              category?.frontId == item.frontId
                            }
                          >
                            <Link
                              to={`/${siteFrontId}/bankuai/${item.frontId}`}
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
              {editCategory.editting ? '设置板块' : '创建板块'}
            </DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <CategoryForm
              isEdit={editCategory.editting}
              category={editCategory.data}
              onChange={setCategoryFormDirty}
              onSuccess={onCategoryCreated}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default BSidebar
