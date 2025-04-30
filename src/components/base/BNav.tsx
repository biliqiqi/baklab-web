import { DialogDescription, DialogTitle } from '@radix-ui/react-dialog'
import {
  BellIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GripIcon,
  Loader,
  MenuIcon,
} from 'lucide-react'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'

import { cn, summryText } from '@/lib/utils'

import { logoutToken } from '@/api'
import {
  NAV_HEIGHT,
  PLATFORM_NAME,
  SITE_LOGO_IMAGE,
} from '@/constants/constants'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  useAuthedUserStore,
  useDialogStore,
  useLoading,
  useNotificationStore,
  useRightSidebarStore,
  useSidebarStore,
  useSiteStore,
  useSiteUIStore,
  useUserUIStore,
} from '@/state/global'
import { FrontCategory } from '@/types/types'

import MessageList, { MessageListRef } from '../MessageList'
import SiteMenuButton from '../SiteMenuButton'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader } from '../ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { SIDEBAR_WIDTH } from '../ui/sidebar'
import BAvatar from './BAvatar'
import BLoader from './BLoader'
import BSiteIcon from './BSiteIcon'

export interface NavProps extends React.HTMLAttributes<HTMLDivElement> {
  category?: FrontCategory
  goBack?: boolean
  onGripClick?: () => void
}

const isOneOfPath = (loc: Location, pathes: string[]) =>
  pathes.some((path) => loc.pathname == path)

const BNav = React.forwardRef<HTMLDivElement, NavProps>(
  ({ className, category, goBack = false, onGripClick, ...props }, ref) => {
    /* const [loading, setLoading] = useState(false) */
    const [showCategoryDetail, setShowCategoryDetail] = useState(false)
    const { siteFrontId } = useParams()

    const { loading, setLoading } = useLoading()
    /* const authState = useAuthedUserStore() */
    const navigate = useNavigate()
    const isMobile = useIsMobile()
    /* const sidebar = useSidebar() */
    const { checkPermit, isLogined, authLogout, currUsername } =
      useAuthedUserStore(
        useShallow(({ permit, isLogined, logout, username }) => ({
          checkPermit: permit,
          authLogout: logout,
          currUsername: username,
          isLogined,
        }))
      )
    const {
      sidebarOpen,
      setSidebarOpen,
      sidebarOpenMobile,
      setSidebarOpenMobile,
    } = useSidebarStore(
      useShallow(({ open, setOpen, openMobile, setOpenMobile }) => ({
        sidebarOpen: open,
        setSidebarOpen: setOpen,
        sidebarOpenMobile: openMobile,
        setSidebarOpenMobile: setOpenMobile,
      }))
    )

    const { setOpenRightSidebar, setSettingsType, setOpenRightSidebarMobile } =
      useRightSidebarStore(
        useShallow(({ open, setOpen, setSettingsType, setOpenMobile }) => ({
          openRightSidebar: open,
          setOpenRightSidebar: setOpen,
          setOpenRightSidebarMobile: setOpenMobile,
          setSettingsType,
        }))
      )

    const { siteMode } = useSiteUIStore(
      useShallow(({ mode }) => ({ siteMode: mode }))
    )

    const { siteListMode } = useUserUIStore(
      useShallow(({ siteListMode }) => ({ siteListMode }))
    )

    const msgListRef = useRef<MessageListRef | null>(null)

    const sidebarExpanded = useMemo(
      () => sidebarOpen || sidebarOpenMobile,
      [sidebarOpen, sidebarOpenMobile]
    )

    const { updateSignin } = useDialogStore()
    const notiStore = useNotificationStore()
    const { t } = useTranslation()

    const {
      currSite,
      siteList,
      setShowSiteForm,
      showSiteListDropdown,
      setShowSiteListDropdown,
    } = useSiteStore(
      useShallow(
        ({
          site,
          siteList,
          setShowSiteForm,
          showSiteListDropdown,
          setShowSiteListDropdown,
        }) => ({
          currSite: site,
          siteList,
          setShowSiteForm,
          showSiteListDropdown,
          setShowSiteListDropdown,
        })
      )
    )

    const onDropdownChange = (open: boolean) => {
      if (!open) {
        document.body.style.pointerEvents = ''
      }
    }

    const onNotiClick = (open: boolean) => {
      if (!open) {
        document.body.style.pointerEvents = ''
      }
    }

    const onMenuClick = useCallback(() => {
      /* sidebarStore.setOpen(!sidebarStore.open) */
      /* sidebar.toggleSidebar() */
      if (isMobile) {
        /* sidebar.setOpenMobile(!sidebar.openMobile) */
        setSidebarOpenMobile(!sidebarOpenMobile)
      } else {
        /* console.log('toggle desktop sidebar') */
        /* sidebar.toggleSidebar() */
        setSidebarOpen(!sidebarOpen)
      }
    }, [
      isMobile,
      setSidebarOpen,
      sidebarOpen,
      setSidebarOpenMobile,
      sidebarOpenMobile,
    ])

    const logout = useCallback(async () => {
      if (loading) return
      try {
        setLoading(true)
        const data = await logoutToken()
        if (!data.code) {
          authLogout()
          navigate(0)
        }
      } catch (e) {
        console.error('logout error: ', e)
        toast.error(t('logoutFailed'))
      } finally {
        setLoading(false)
      }
    }, [loading, navigate, setLoading, authLogout, t])

    const onUserUISettingClick = useCallback(() => {
      setSettingsType('user_ui')
      if (isMobile) {
        setOpenRightSidebarMobile(true)
      } else {
        setOpenRightSidebar(true)
      }
    }, [
      setOpenRightSidebar,
      setSettingsType,
      setOpenRightSidebarMobile,
      isMobile,
    ])

    /* console.log('msgListRef: ', msgListRef.current?.pageState.totalCount) */

    return (
      <div
        className={cn(
          'flex justify-between items-center py-2 bg-white dark:bg-slate-900 sticky top-0 z-10',
          siteMode == 'sidebar' && 'px-4 border-b-2 shadow-sm',
          isMobile && 'px-2',
          className
        )}
        style={{
          height: `${NAV_HEIGHT}px`,
        }}
        ref={ref}
        {...props}
      >
        <div
          className="flex flex-grow  items-center"
          style={{
            maxWidth: 'calc(100% - 8rem)',
            lineHeight: '36px',
          }}
        >
          {goBack && isMobile && history.length > 2 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex-shrink-0 w-[36px] h-[36px] p-0 rounded-full mr-2"
            >
              <ChevronLeftIcon size={20} />
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onMenuClick}
                className="flex-shrink-0 w-[36px] h-[36px] p-0 rounded-full mr-2 text-gray-500"
              >
                <MenuIcon size={20} />
              </Button>
              {(!sidebarExpanded || siteMode == 'top_nav') && (
                <Link
                  className="flex-shrink-0 font-bold text-2xl leading-3 mr-2"
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
                          height: isMobile
                            ? `${NAV_HEIGHT - 20}px`
                            : `${NAV_HEIGHT - 8}px`,
                          width: isMobile ? `60px` : '',
                          maxWidth: `calc(${SIDEBAR_WIDTH} - 60px)`,
                          minWidth: `50px`,
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
                      className="max-w-[180px]"
                      logoUrl={SITE_LOGO_IMAGE}
                      name={PLATFORM_NAME}
                      size={42}
                    />
                  )}
                </Link>
              )}
            </>
          )}

          {loading ? (
            <>
              <BLoader
                className="inline-block ml-6 b-loader--gray"
                style={{ fontSize: '4px' }}
              />
              <span></span>
            </>
          ) : (
            category != undefined && (
              <>
                {!isMobile && (!sidebarExpanded || siteMode == 'top_nav') && (
                  <ChevronRightIcon
                    size={16}
                    className="inline-block mr-2 align-middle text-gray-500"
                  />
                )}
                {category.isFront ? (
                  <span className="flex-shrink-0 text-ellipsis overflow-hidden whitespace-nowrap">
                    {category.name}
                  </span>
                ) : (
                  <Link
                    to={`/${siteFrontId}/bankuai/${category.frontId}`}
                    className="flex-shrink-0 text-ellipsis overflow-hidden whitespace-nowrap"
                  >
                    {category.name}
                  </Link>
                )}
                <span
                  className="flex-shrink-1 px-4 ml-4 border-l-2 text-sm text-gray-500 cursor-pointer flex-grow overflow-hidden whitespace-nowrap text-ellipsis"
                  onClick={() => setShowCategoryDetail(true)}
                >
                  {summryText(category.describe, 20)}{' '}
                </span>
              </>
            )
          )}
        </div>
        <div className="flex flex-wrap items-center">
          {!isOneOfPath(location, ['/signin', '/submit']) && (
            <>
              {/* <Button
                variant="outline"
                size="sm"
                asChild
                className="mr-4 max-sm:hidden"
                onClick={onSubmitClick}
              >
                <Link to={submitPath}>+ {t('submit')}</Link>
              </Button> */}
              {/* <DrawerTrigger>
                <Button variant="outline" size="sm" className="mr-4">
                  + {t('submit')}
                </Button>
              </DrawerTrigger> */}
            </>
          )}
          {siteMode == 'top_nav' && <SiteMenuButton className="mr-2" />}
          {!isMobile && siteListMode == 'top_drawer' && (
            <Button
              variant="ghost"
              size="sm"
              className="w-[36px] h-[36px] p-0 rounded-full mr-2"
              title={t('siteList')}
              onClick={() => {
                if (onGripClick && typeof onGripClick == 'function') {
                  onGripClick()
                }
              }}
            >
              <GripIcon size={20} />
            </Button>
          )}
          {!isMobile && siteListMode == 'dropdown_menu' && (
            <DropdownMenu
              open={showSiteListDropdown}
              onOpenChange={setShowSiteListDropdown}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-[36px] h-[36px] p-0 rounded-full mr-2"
                  title={t('siteList')}
                >
                  <GripIcon size={20} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                sideOffset={6}
                align="end"
                className={cn(
                  `w-[330px] px-2 pt-2 pb-4 bg-gray-200 text-sm overflow-y-auto`
                )}
                style={{
                  maxHeight: `calc(100vh - ${NAV_HEIGHT}px)`,
                }}
              >
                <div>
                  <div className="flex flex-wrap items-center">
                    {siteList &&
                      siteList.map((site) => (
                        <Link
                          to={`/${site.frontId}`}
                          key={site.frontId}
                          className={cn(
                            'flex justify-center w-[60px] overflow-hidden flex-shrink-0 flex-grow-0 mx-2 my-4 leading-3'
                          )}
                          onClick={() => setShowSiteListDropdown(false)}
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
                  {siteList && siteList.length > 0 && (
                    <div className="my-4 border-t-2 border-gray-300 dark:border-slate-600"></div>
                  )}
                  <div className="flex flex-wrap  items-center">
                    <Link
                      to={`/`}
                      className={cn(
                        'flex justify-center w-[60px] overflow-hidden flex-shrink-0 flex-grow-0 mx-2 my-4 leading-3'
                      )}
                      onClick={() => setShowSiteListDropdown(false)}
                    >
                      <BSiteIcon
                        logoUrl={SITE_LOGO_IMAGE}
                        name={t('homePage')}
                        size={40}
                        fontSize={14}
                        showSiteName
                        active={!siteFrontId}
                        className="w-full"
                        vertical
                      />
                    </Link>
                    {isLogined() && checkPermit('site', 'create', true) && (
                      <span
                        className="inline-flex flex-col items-center align-middle cursor-pointer mx-2 my-4"
                        onClick={(e) => {
                          e.preventDefault()
                          setShowSiteForm(true)
                          setShowSiteListDropdown(false)
                        }}
                      >
                        <Button
                          variant="secondary"
                          className="rounded-full w-[40px] h-[40px] text-[24px] text-center text-gray-500 mb-1"
                          key="new-site"
                          title={t('createSite')}
                        >
                          +
                        </Button>
                        <span className="text-[14px] leading-[1.2]">
                          {t('createSite')}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {isLogined() ? (
            <>
              {!isMobile && (
                <DropdownMenu onOpenChange={onNotiClick}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative w-[36px] h-[36px] p-0 rounded-full mr-2"
                      title={t('notifications')}
                    >
                      <BellIcon size={20} />
                      {notiStore.unreadCount > 0 && (
                        <Badge className="absolute bg-pink-600 hover:bg-pink-600 right-[2px] top-[3px] text-xs px-[4px] py-[0px]">
                          {notiStore.unreadCount}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    sideOffset={6}
                    align="end"
                    className={cn(
                      `w-[360px] px-2 pt-2 pb-4 bg-gray-200 text-sm overflow-y-auto`
                    )}
                    style={{
                      maxHeight: `calc(100vh - ${NAV_HEIGHT}px)`,
                    }}
                  >
                    <MessageList ref={msgListRef} pageSize={10} />
                    <div className="flex justify-center mt-4">
                      <Button variant="secondary" size="sm" asChild>
                        <Link to="/messages">{t('viewAll')}</Link>
                      </Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <DropdownMenu onOpenChange={onDropdownChange}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative w-[36px] h-[36px] p-0 rounded-full"
                  >
                    <BAvatar
                      username={currUsername}
                      className="cursor-pointer"
                      size={32}
                    />

                    {isMobile && notiStore.unreadCount > 0 && (
                      <Badge className="absolute bg-pink-600 hover:bg-pink-600 right-[0px] top-[0px] text-xs px-[4px] py-[0px]">
                        {notiStore.unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="px-0"
                  align="end"
                  sideOffset={6}
                >
                  {isMobile && (
                    <DropdownMenuItem
                      className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                      asChild
                    >
                      <Link to={'/messages'}>
                        {t('notifications')}{' '}
                        {notiStore.unreadCount > 0 && (
                          <Badge className="inline-block bg-pink-600 hover:bg-pink-600 text-xs px-[4px] py-[0px]">
                            {notiStore.unreadCount}
                          </Badge>
                        )}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                    asChild
                  >
                    <Link to={'/users/' + currUsername}>
                      {t('personalHomePage')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                    onClick={onUserUISettingClick}
                  >
                    {t('personalizationUI')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                    onClick={logout}
                    disabled={loading}
                  >
                    {loading ? <Loader /> : t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              asChild
              onClick={(e) => {
                e.preventDefault()
                updateSignin(true)
              }}
            >
              <Link to="/signin">{t('signin')}</Link>
            </Button>
          )}
        </div>

        <Dialog open={showCategoryDetail} onOpenChange={setShowCategoryDetail}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-bold">{category?.name}</DialogTitle>
              <DialogDescription>{category?.describe}</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
)

BNav.displayName = 'BNav'

export default BNav
