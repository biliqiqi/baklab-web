import {
  ActivityIcon,
  ChartBarStackedIcon,
  ChartLineIcon,
  ChevronDownIcon,
  GlobeIcon,
  Grid2x2Icon,
  LockIcon,
  MessageCircleIcon,
  MessageSquareXIcon,
  PackageIcon,
  ShieldCheckIcon,
  TagIcon,
  TrashIcon,
  UserIcon,
  UserRoundIcon,
  UserRoundXIcon,
} from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { cn, getSiteStatusColor, getSiteStatusName } from '@/lib/utils'

import SITE_LOGO_IMAGE from '@/assets/logo.png'
import { NAV_HEIGHT, PLATFORM_NAME } from '@/constants/constants'
import { PermissionAction, PermissionModule } from '@/constants/types'
import { buildRoutePath, useRouteMatch } from '@/hooks/use-route-match'
import i18n from '@/i18n'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useCategoryStore,
  useCurrentArticleStore,
  useSidebarStore,
  useSiteStore,
  useSiteUIStore,
} from '@/state/global'
import { Category, FrontCategory, SITE_STATUS } from '@/types/types'

import CategoryForm from '../CategoryForm'
import SiteMenuButton from '../SiteMenuButton'
import BIconCircle from '../icon/Circle'
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
  bodyHeight?: string
}

interface SidebarMenuItem<T extends PermissionModule> {
  id: string
  permitModule: T
  permitAction: PermissionAction<T>
  name: string
  link: string
  icon: JSX.Element
}

const platformSidebarMenus: () => (
  | SidebarMenuItem<'user'>
  | SidebarMenuItem<'role'>
  | SidebarMenuItem<'site'>
  | SidebarMenuItem<'activity'>
  | SidebarMenuItem<'article'>
  | SidebarMenuItem<'oauth'>
  | SidebarMenuItem<'platform_manage'>
)[] = () => [
  {
    id: 'users',
    permitModule: 'user',
    permitAction: 'manage_platform',
    name: i18n.t('user'),
    link: '/manage/users',
    icon: <UserRoundIcon size={18} />,
  },
  {
    id: 'banned_users',
    permitModule: 'user',
    permitAction: 'manage_platform',
    name: i18n.t('banned'),
    link: '/manage/banned_users',
    icon: <UserRoundXIcon size={18} />,
  },
  {
    id: 'user_roles',
    permitModule: 'role',
    permitAction: 'manage_platform',
    name: i18n.t('role'),
    link: '/manage/roles',
    icon: <UserIcon size={18} />,
  },
  {
    id: 'oauth_clients',
    permitModule: 'oauth',
    permitAction: 'manage',
    name: i18n.t('oauthApplications'),
    link: '/manage/oauth_clients',
    icon: <Grid2x2Icon size={18} />,
  },
  {
    id: 'sites',
    permitModule: 'site',
    permitAction: 'manage_platform',
    name: i18n.t('site'),
    link: '/manage/sites',
    icon: <GlobeIcon size={18} />,
  },
  {
    id: 'activities',
    permitModule: 'activity',
    permitAction: 'manage_platform',
    name: i18n.t('activityLog'),
    link: '/manage/activities',
    icon: <ActivityIcon size={18} />,
  },
  {
    id: 'access_report',
    permitModule: 'platform_manage',
    permitAction: 'access',
    name: i18n.t('accessReport'),
    link: '/manage/access_report',
    icon: <ChartLineIcon size={18} />,
  },
  {
    id: 'trash',
    permitModule: 'article',
    permitAction: 'manage_platform',
    name: i18n.t('trash'),
    link: '/manage/trash',
    icon: <TrashIcon size={18} />,
  },
]

const BSidebar: React.FC<BSidebarProps> = ({ category: _, bodyHeight }) => {
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryFormDirty, setCategoryFormDirty] = useState(false)

  const [editCategory, setEditCategory] = useState<EditCategoryData>({
    editting: false,
    data: undefined,
  })

  const { siteFrontId } = useParams()

  const alertDialog = useAlertDialogStore()

  const { t } = useTranslation()

  const { authPermit, currUserId, isLogined } = useAuthedUserStore(
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

  const subscribedCateList = useMemo(
    () => cateList.filter((cate) => cate?.userState?.subscribed),
    [cateList]
  )

  const { currSite } = useSiteStore(
    useShallow(({ site, update }) => ({
      currSite: site,
      updateCurrSite: update,
    }))
  )

  const currCateList = useMemo(
    () => (isLogined() ? subscribedCateList : cateList),
    [isLogined, subscribedCateList, cateList]
  )

  const { siteMode } = useSiteUIStore(
    useShallow(({ mode }) => ({ siteMode: mode }))
  )

  const { currentCategoryFrontId } = useCurrentArticleStore(
    useShallow(({ categoryFrontId }) => ({
      currentCategoryFrontId: categoryFrontId,
    }))
  )

  const isCategoryListActive = useRouteMatch('/bankuai')
  const isAllPageActive = useRouteMatch('/all')
  const isHomePageActive = useRouteMatch('/')
  const isTagListActive = useRouteMatch('/tags')

  const siteSidebarMenus: () => (
    | SidebarMenuItem<'user'>
    | SidebarMenuItem<'role'>
    | SidebarMenuItem<'activity'>
    | SidebarMenuItem<'article'>
    | SidebarMenuItem<'site'>
  )[] = () => [
    {
      id: 'users',
      permitModule: 'user',
      permitAction: 'manage',
      name: t('members'),
      link: `/z/${siteFrontId}/manage/users`,
      icon: <UserRoundIcon size={18} />,
    },
    {
      id: 'blocklist',
      permitModule: 'user',
      permitAction: 'manage',
      name: t('blockList'),
      link: `/z/${siteFrontId}/manage/blocklist`,
      icon: <UserRoundIcon size={18} />,
    },
    {
      id: 'roles',
      permitModule: 'role',
      permitAction: 'edit',
      name: t('role'),
      link: `/z/${siteFrontId}/manage/roles`,
      icon: <UserIcon size={18} />,
    },
    {
      id: 'article_review',
      permitModule: 'article',
      permitAction: 'review',
      name: t('reviewByHuman'),
      link: `/z/${siteFrontId}/manage/article_review`,
      icon: <ShieldCheckIcon size={18} />,
    },
    {
      id: 'blocked_words',
      permitModule: 'site',
      permitAction: 'manage',
      name: t('blockedWord'),
      link: `/z/${siteFrontId}/manage/blocked_words`,
      icon: <MessageSquareXIcon size={18} />,
    },
    {
      id: 'activities',
      permitModule: 'activity',
      permitAction: 'access',
      name: t('modLog'),
      link: `/z/${siteFrontId}/manage/activities`,
      icon: <ActivityIcon size={18} />,
    },
  ]

  const onCategoryFormClose = useCallback(async () => {
    if (categoryFormDirty) {
      const { editting } = editCategory
      const confirmed = await alertDialog.confirm(
        t('confirm'),
        editting
          ? t('categoryEditDropConfirm')
          : t('categoryCreateDropConfirm'),
        'normal',
        {
          confirmBtnText: t('dropConfirm'),
          cancelBtnText: editting ? t('continueSetting') : t('continueAdding'),
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
  }, [categoryFormDirty, editCategory, alertDialog, t])

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

  return (
    <>
      <Sidebar className="relative max-h-full" gap={false}>
        <SidebarContent
          className="gap-0 pb-4"
          style={{ minHeight: bodyHeight || '' }}
        >
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
                  to={siteFrontId && currSite ? `/z/${siteFrontId}` : `/`}
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
                      name={PLATFORM_NAME}
                      size={42}
                      showSiteName
                    />
                  )}
                </Link>
                {currSite && !currSite.visible && (
                  <span
                    className="inline-block text-gray-500 ml-2"
                    title={t('privateSite')}
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
              {t('siteStatus')}：
              <span className={getSiteStatusColor(currSite.status)}>
                {getSiteStatusName(currSite.status)}
              </span>
              <br />
              {String(currSite.creatorId) == currUserId &&
                currSite.status != SITE_STATUS.ReadOnly && (
                  <span className="text-sm text-gray-500">
                    {t('siteReadOnlyDescribe')}
                  </span>
                )}
            </div>
          )}
          <SidebarGroup key={'default sides'}>
            <SidebarGroupContent>
              <SidebarMenu>
                {isLogined() && (
                  <SidebarMenuItem key="feed">
                    <SidebarMenuButton asChild isActive={isHomePageActive}>
                      <Link to={buildRoutePath('/', siteFrontId)}>
                        <BIconCircle id="feed" size={32}>
                          <PackageIcon size={18} />
                        </BIconCircle>
                        {t('feed')}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem key="all">
                  <SidebarMenuButton asChild isActive={isAllPageActive}>
                    <Link
                      to={buildRoutePath('/all', siteFrontId)}
                      title={
                        siteFrontId
                          ? t('siteAllPostsDescription')
                          : t('allPostsDescription')
                      }
                    >
                      <BIconCircle id="feed" size={32}>
                        <GlobeIcon size={18} />
                      </BIconCircle>
                      {t('allPosts')}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {siteFrontId && currSite && (
                  <>
                    <SidebarMenuItem key="categories">
                      <SidebarMenuButton
                        asChild
                        isActive={isCategoryListActive}
                      >
                        <Link to={buildRoutePath('/bankuai', siteFrontId)}>
                          <BIconCircle id="categories" size={32}>
                            <ChartBarStackedIcon size={18} />
                          </BIconCircle>
                          {t('allCategories')}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {currSite.tagConfig?.enabled && (
                      <SidebarMenuItem key="tags">
                        <SidebarMenuButton asChild isActive={isTagListActive}>
                          <Link to={buildRoutePath('/tags', siteFrontId)}>
                            <BIconCircle id="tags" size={32}>
                              <TagIcon size={18} />
                            </BIconCircle>
                            {t('tags')}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </>
                )}
                {siteMode == 'top_nav' && (
                  <SidebarMenuItem key="siteMenu">
                    <SidebarMenuButton asChild>
                      <a
                        href="#"
                        style={{ padding: 0, textDecoration: 'none' }}
                      >
                        <SiteMenuButton mode="block" />
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {!siteFrontId && authPermit('platform_manage', 'access') && (
            <SidebarGroup key={'platformManage'}>
              <SidebarGroupLabel>{t('platformManagement')}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {platformSidebarMenus().map(
                    ({ id, permitModule, permitAction, link, icon, name }) =>
                      authPermit(permitModule, permitAction) && (
                        <SidebarMenuItem key={id}>
                          <SidebarMenuButton
                            asChild
                            isActive={location.pathname == link}
                          >
                            {id === 'access_report' ? (
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <BIconCircle size={32}>{icon}</BIconCircle>
                                {name}
                              </a>
                            ) : (
                              <Link to={link}>
                                <BIconCircle size={32}>{icon}</BIconCircle>
                                {name}
                              </Link>
                            )}
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
                      <span>{t('category')}</span>
                    </span>

                    {/* Create functionality moved to CategoryListPage.tsx */}
                    {/* {authPermit('category', 'create') && (
                      <Button
                        variant="ghost"
                        className="p-0 w-[24px] h-[24px] rounded-full"
                        onClick={onCreateCategoryClick}
                        title={t('createCategory')}
                      >
                        <PlusIcon size={18} className="text-gray-500" />
                      </Button>
                    )} */}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent className="CollapsibleContent">
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {currCateList.map((item) => (
                        <SidebarMenuItem key={item.frontId}>
                          <SidebarMenuButton
                            asChild
                            isActive={
                              location.pathname ==
                                `/z/${siteFrontId}/b/${item.frontId}` ||
                              (currentCategoryFrontId === item.frontId &&
                                location.pathname.includes(
                                  `/z/${siteFrontId}/articles/`
                                ))
                            }
                          >
                            <Link
                              to={`/z/${siteFrontId}/b/${item.frontId}`}
                              state={item}
                            >
                              <span
                                className="relative inline-block"
                                style={{ overflow: 'visible' }}
                              >
                                <BIconColorChar
                                  iconId={item.frontId}
                                  char={item.iconContent}
                                  color={item.iconBgColor}
                                  size={32}
                                />
                                {item.contentForm?.frontId == 'chat' && (
                                  <MessageCircleIcon
                                    size={20}
                                    className="absolute -right-[9px] bottom-0 text-gray-500 z-20 bg-white rounded-full p-[2px]"
                                  />
                                )}
                              </span>
                              {item.name}
                            </Link>
                          </SidebarMenuButton>
                          {/* Edit functionality moved to CategoryListPage.tsx */}
                          {/* {authPermit('category', 'edit') && (
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
                          )} */}
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
                      <span>{t('siteManagement')}</span>
                    </span>
                    <span></span>
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent className="CollapsibleContent">
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {siteSidebarMenus().map(
                        ({
                          id,
                          permitModule,
                          permitAction,
                          name,
                          link,
                          icon,
                        }) =>
                          authPermit(permitModule, permitAction) && (
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
              {editCategory.editting ? t('editCategory') : t('createCategory')}
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
