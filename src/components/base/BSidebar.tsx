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
import { useShallow } from 'zustand/react/shallow'

import { cn, getSiteStatusColor, getSiteStatusName } from '@/lib/utils'

import { NAV_HEIGHT, PLATFORM_NAME } from '@/constants/constants'
import { PermissionAction, PermissionModule } from '@/constants/types'
import { buildRoutePath, useRouteMatch } from '@/hooks/use-route-match'
import { useSiteParams } from '@/hooks/use-site-params'
import i18n from '@/i18n'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useCategoryStore,
  useContextStore,
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
import BSiteListDock from './BSiteListDock'
import SiteLink from './SiteLink'

interface EditCategoryData {
  editting: boolean
  data: Category | undefined
}

interface BSidebarProps {
  category?: FrontCategory
  bodyHeight?: string
  preventMobileCloseUntil?: number
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

const BSidebar: React.FC<BSidebarProps> = ({
  category: _,
  bodyHeight,
  preventMobileCloseUntil,
}) => {
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryFormDirty, setCategoryFormDirty] = useState(false)

  const [editCategory, setEditCategory] = useState<EditCategoryData>({
    editting: false,
    data: undefined,
  })

  const { siteFrontId } = useSiteParams()

  const alertDialog = useAlertDialogStore()

  const { t } = useTranslation()

  const { authPermit, currUserId, isLogined } = useAuthedUserStore(
    useShallow(({ permit, userID, isLogined }) => ({
      currUserId: userID,
      authPermit: permit,
      isLogined,
    }))
  )

  const { groupsOpen, setGroupsOpen, closeMobileSidebar } = useSidebarStore(
    useShallow(
      ({ open, setOpen, groupsOpen, setGroupsOpen, closeMobileSidebar }) => ({
        sidebarOpen: open,
        setSidebarOpen: setOpen,
        groupsOpen,
        setGroupsOpen,
        closeMobileSidebar,
      })
    )
  )

  const { cateList, fetchCategoryList, cateStoreSiteFrontId } =
    useCategoryStore(
      useShallow(
        ({ fetchCategoryList, updateCategories, categories, siteFrontId }) => ({
          cateList: categories,
          fetchCategoryList,
          updateCategories,
          cateStoreSiteFrontId: siteFrontId,
        })
      )
    )

  const subscribedCateList = useMemo(
    () => cateList.filter((cate) => cate?.userState?.subscribed),
    [cateList]
  )

  const { currSite, siteList } = useSiteStore(
    useShallow(({ site, update, siteList }) => ({
      currSite: site,
      updateCurrSite: update,
      siteList,
    }))
  )
  const isSingleSite = useContextStore((state) => state.isSingleSite)

  const currCateList = useMemo(() => {
    if (cateStoreSiteFrontId === siteFrontId) {
      return isLogined() ? subscribedCateList : cateList
    }

    const targetSite = siteList?.find((s) => s.frontId === siteFrontId)
    if (targetSite?.categories) {
      return isLogined()
        ? targetSite.categories.filter((cate) => cate?.userState?.subscribed)
        : targetSite.categories
    }

    return []
  }, [
    isLogined,
    subscribedCateList,
    cateList,
    cateStoreSiteFrontId,
    siteFrontId,
    siteList,
  ])

  const displaySite = useMemo(() => {
    if (!siteFrontId) {
      return currSite
    }

    const cachedSite = siteList?.find((s) => s.frontId === siteFrontId)

    if (cachedSite) {
      return currSite?.frontId === siteFrontId ? currSite : cachedSite
    }

    return currSite?.frontId === siteFrontId ? currSite : null
  }, [currSite, siteFrontId, siteList])

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
      link: `/manage/users`,
      icon: <UserRoundIcon size={18} />,
    },
    {
      id: 'blocklist',
      permitModule: 'user',
      permitAction: 'manage',
      name: t('blockList'),
      link: `/manage/blocklist`,
      icon: <UserRoundIcon size={18} />,
    },
    {
      id: 'roles',
      permitModule: 'role',
      permitAction: 'edit',
      name: t('role'),
      link: `/manage/roles`,
      icon: <UserIcon size={18} />,
    },
    {
      id: 'article_review',
      permitModule: 'article',
      permitAction: 'review',
      name: t('reviewByHuman'),
      link: `/manage/article_review`,
      icon: <ShieldCheckIcon size={18} />,
    },
    {
      id: 'blocked_words',
      permitModule: 'site',
      permitAction: 'manage',
      name: t('blockedWord'),
      link: `/manage/blocked_words`,
      icon: <MessageSquareXIcon size={18} />,
    },
    {
      id: 'activities',
      permitModule: 'activity',
      permitAction: 'access',
      name: t('modLog'),
      link: `/manage/activities`,
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

  const onCategoryCreated = useCallback(
    async () => {
      setShowCategoryForm(false)
      setTimeout(() => {
        setEditCategory(() => ({
          editting: false,
          data: undefined,
        }))
      }, 500)
      if (!siteFrontId) return
      await fetchCategoryList(siteFrontId, true)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [siteFrontId]
  )

  return (
    <>
      <Sidebar
        className="relative max-h-full"
        gap={false}
        preventMobileCloseUntil={preventMobileCloseUntil}
      >
        <SidebarContent
          className="gap-0 h-full"
          style={{ minHeight: bodyHeight || '' }}
        >
          <div
            className={cn(
              'flex h-full min-h-0 w-full grow overflow-hidden',
              'bg-[hsl(var(--sidebar-background))]'
            )}
          >
            {!isSingleSite && (
              <BSiteListDock
                className="h-full"
                style={{ height: bodyHeight }}
              />
            )}
            <div
              className={cn(
                'flex-1 min-w-0 overflow-y-auto pb-4',
                'bg-[hsl(var(--sidebar-background))]'
              )}
            >
              {siteMode == 'sidebar' && (
                <div
                  className="flex items-center justify-between px-2"
                  style={{
                    minHeight: `${NAV_HEIGHT}px`,
                  }}
                >
                  <div className="flex flex-shrink-0 items-center">
                    <SiteLink
                      className="flex max-w-full items-center truncate font-semibold"
                      to="/"
                      siteFrontId={siteFrontId}
                      style={{
                        maxWidth: `calc(${SIDEBAR_WIDTH} - 60px)`,
                        fontSize: '16px',
                        lineHeight: 1.2,
                      }}
                    >
                      {displaySite?.name ?? PLATFORM_NAME}
                    </SiteLink>
                    {displaySite && !displaySite.visible && (
                      <span
                        className="ml-2 inline-block text-gray-500"
                        title={t('privateSite')}
                      >
                        <LockIcon size={14} />
                      </span>
                    )}
                  </div>
                  {displaySite && <SiteMenuButton />}
                </div>
              )}
              {displaySite && displaySite.status != SITE_STATUS.Normal && (
                <div className="m-2 rounded-sm bg-yellow-300 p-2 text-sm leading-6">
                  {t('siteStatus')}：
                  <span className={getSiteStatusColor(displaySite.status)}>
                    {getSiteStatusName(displaySite.status)}
                  </span>
                  <br />
                  {String(displaySite.creatorId) == currUserId &&
                    displaySite.status != SITE_STATUS.ReadOnly && (
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
                          <SiteLink
                            to="/"
                            siteFrontId={siteFrontId}
                            closeSidebarOnClick
                          >
                            <BIconCircle id="feed" size={32}>
                              <PackageIcon size={18} />
                            </BIconCircle>
                            {t('feed')}
                          </SiteLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    <SidebarMenuItem key="all">
                      <SidebarMenuButton asChild isActive={isAllPageActive}>
                        <SiteLink
                          to="/all"
                          siteFrontId={siteFrontId}
                          title={
                            siteFrontId
                              ? t('siteAllPostsDescription')
                              : t('allPostsDescription')
                          }
                          closeSidebarOnClick
                        >
                          <BIconCircle id="feed" size={32}>
                            <GlobeIcon size={18} />
                          </BIconCircle>
                          {t('allPosts')}
                        </SiteLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {siteFrontId && displaySite && (
                      <>
                        <SidebarMenuItem key="categories">
                          <SidebarMenuButton
                            asChild
                            isActive={isCategoryListActive}
                          >
                            <SiteLink
                              to="/bankuai"
                              siteFrontId={siteFrontId}
                              closeSidebarOnClick
                            >
                              <BIconCircle id="categories" size={32}>
                                <ChartBarStackedIcon size={18} />
                              </BIconCircle>
                              {t('allCategories')}
                            </SiteLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        {displaySite?.tagConfig?.enabled && (
                          <SidebarMenuItem key="tags">
                            <SidebarMenuButton
                              asChild
                              isActive={isTagListActive}
                            >
                              <SiteLink
                                to="/tags"
                                siteFrontId={siteFrontId}
                                closeSidebarOnClick
                              >
                                <BIconCircle id="tags" size={32}>
                                  <TagIcon size={18} />
                                </BIconCircle>
                                {t('tags')}
                              </SiteLink>
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
                  <SidebarGroupLabel>
                    {t('platformManagement')}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {platformSidebarMenus().map(
                        ({
                          id,
                          permitModule,
                          permitAction,
                          link,
                          icon,
                          name,
                        }) =>
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
                                    onClick={() => closeMobileSidebar()}
                                  >
                                    <BIconCircle size={32}>{icon}</BIconCircle>
                                    {name}
                                  </a>
                                ) : (
                                  <SiteLink
                                    to={link}
                                    siteFrontId={siteFrontId}
                                    closeSidebarOnClick
                                  >
                                    <BIconCircle size={32}>{icon}</BIconCircle>
                                    {name}
                                  </SiteLink>
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
                          'flex cursor-pointer justify-between',
                          !groupsOpen.category && 'mb-0'
                        )}
                      >
                        <span>
                          <ChevronDownIcon
                            size={14}
                            className={cn(
                              'inline-block rotate-0 align-bottom transition-transform duration-200 ease-in-out',
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
                          {currCateList.map((item) => {
                            const isActive =
                              location.pathname ==
                                buildRoutePath(
                                  `/b/${item.frontId}`,
                                  siteFrontId
                                ) ||
                              (currentCategoryFrontId === item.frontId &&
                                location.pathname.includes(
                                  buildRoutePath('/articles/', siteFrontId)
                                ))

                            return (
                              <SidebarMenuItem key={item.frontId}>
                                <SidebarMenuButton asChild isActive={isActive}>
                                  <SiteLink
                                    to={`/b/${item.frontId}`}
                                    state={item}
                                    siteFrontId={siteFrontId}
                                    closeSidebarOnClick
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
                                          className="absolute -right-[9px] bottom-0 z-20 rounded-full bg-white p-[2px] text-text-secondary"
                                        />
                                      )}
                                    </span>
                                    {item.name}

                                    {!item.visible && (
                                      <span
                                        className={cn(
                                          'ml-2 inline-flex items-center text-current transition-opacity',
                                          isActive
                                            ? 'opacity-100'
                                            : 'opacity-70'
                                        )}
                                        title={t('privateCategory')}
                                      >
                                        <LockIcon
                                          size={14}
                                          className="text-current"
                                        />
                                      </span>
                                    )}
                                  </SiteLink>
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
                            )
                          })}
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
                          'flex cursor-pointer justify-between',
                          !groupsOpen.siteManage && 'mb-0'
                        )}
                      >
                        <span>
                          <ChevronDownIcon
                            size={14}
                            className={cn(
                              'inline-block rotate-0 align-bottom transition-transform duration-200 ease-in-out',
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
                            }) => {
                              if (!authPermit(permitModule, permitAction)) {
                                return null
                              }
                              const resolvedPath = buildRoutePath(
                                link,
                                siteFrontId
                              )
                              return (
                                <SidebarMenuItem key={id}>
                                  <SidebarMenuButton
                                    asChild
                                    isActive={location.pathname == resolvedPath}
                                  >
                                    <SiteLink
                                      to={link}
                                      siteFrontId={siteFrontId}
                                      closeSidebarOnClick
                                    >
                                      <BIconCircle size={32}>
                                        {icon}
                                      </BIconCircle>
                                      {name}
                                    </SiteLink>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              )
                            }
                          )}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarGroup>
              )}
            </div>
          </div>
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
