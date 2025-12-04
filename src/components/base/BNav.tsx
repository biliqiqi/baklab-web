import { DialogDescription, DialogTitle } from '@radix-ui/react-dialog'
import {
  BellIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  Loader,
  LogOutIcon,
  MenuIcon,
  PaletteIcon,
  SearchIcon,
  SettingsIcon,
  UserRoundIcon,
} from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'

import { cn, summaryText } from '@/lib/utils'

import { logoutToken } from '@/api'
import SITE_LOGO_IMAGE from '@/assets/logo.png'
import { NAV_HEIGHT, PLATFORM_NAME } from '@/constants/constants'
import { useIsMobile } from '@/hooks/use-mobile'
import { useSiteParams } from '@/hooks/use-site-params'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useContextStore,
  useDialogStore,
  useLoading,
  useNotificationStore,
  useRightSidebarStore,
  useSidebarStore,
  useSiteStore,
  useSiteUIStore,
} from '@/state/global'
import { FrontCategory } from '@/types/types'

import ArticleSearchDialog from '../ArticleSearchDialog'
import MessageList, { MessageListRef } from '../MessageList'
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
import SiteLink from './SiteLink'

export interface NavProps extends React.HTMLAttributes<HTMLDivElement> {
  category?: FrontCategory
  goBack?: boolean
}

const isOneOfPath = (loc: Location, pathes: string[]) =>
  pathes.some((path) => loc.pathname == path)

const BNav = React.forwardRef<HTMLDivElement, NavProps>(
  ({ className, style, category, goBack = false, ...props }, ref) => {
    /* const [loading, setLoading] = useState(false) */
    const [showCategoryDetail, setShowCategoryDetail] = useState(false)
    const { siteFrontId } = useSiteParams()
    const [searchOpen, setSearchOpen] = useState(false)

    useEffect(() => {
      const shouldSkipShortcut = (target: EventTarget | null) => {
        if (!target || !(target instanceof HTMLElement)) return false
        const tagName = target.tagName
        return (
          tagName === 'INPUT' ||
          tagName === 'TEXTAREA' ||
          tagName === 'SELECT' ||
          target.isContentEditable
        )
      }

      const handleShortcut = (event: KeyboardEvent) => {
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === 'k'
        ) {
          if (shouldSkipShortcut(event.target)) {
            return
          }
          event.preventDefault()
          setSearchOpen(true)
          return
        }

        if (event.key === 'Escape' && searchOpen) {
          event.preventDefault()
          setSearchOpen(false)
        }
      }

      window.addEventListener('keydown', handleShortcut)
      return () => {
        window.removeEventListener('keydown', handleShortcut)
      }
    }, [searchOpen])

    const { loading, setLoading } = useLoading()
    /* const authState = useAuthedUserStore() */
    const navigate = useNavigate()
    const isMobile = useIsMobile()

    const alertConfirm = useAlertDialogStore((state) => state.confirm)
    /* const sidebar = useSidebar() */
    const { isLogined, authLogout, currUsername } = useAuthedUserStore(
      useShallow(({ isLogined, logout, username }) => ({
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
      preventMobileCloseUntil,
    } = useSidebarStore(
      useShallow(
        ({
          open,
          setOpen,
          openMobile,
          setOpenMobile,
          preventMobileCloseUntil,
        }) => ({
          sidebarOpen: open,
          setSidebarOpen: setOpen,
          sidebarOpenMobile: openMobile,
          setSidebarOpenMobile: setOpenMobile,
          preventMobileCloseUntil,
        })
      )
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
    const isSingleSite = useContextStore((state) => state.isSingleSite)
    const mainSiteHost = useContextStore((state) => state.mainSiteHost)

    const msgListRef = useRef<MessageListRef | null>(null)

    const { mainSiteMessagesUrl, mainSiteProfileUrl, mainSiteSettingsUrl } =
      useMemo(() => {
        if (!mainSiteHost) {
          return {
            mainSiteMessagesUrl: null,
            mainSiteProfileUrl: null,
            mainSiteSettingsUrl: null,
          }
        }

        const normalizedHost = mainSiteHost.replace(/\/+$/, '')
        const hasProtocol = /^https?:\/\//i.test(normalizedHost)
        const protocol = hasProtocol
          ? ''
          : typeof window !== 'undefined' && window.location?.protocol
            ? `${window.location.protocol}//`
            : 'https://'
        const base = hasProtocol
          ? normalizedHost
          : `${protocol}${normalizedHost}`
        const formatPath = (path: string) =>
          `${base}${path.startsWith('/') ? path : `/${path}`}`

        return {
          mainSiteMessagesUrl: formatPath('/messages'),
          mainSiteProfileUrl: currUsername
            ? formatPath(`/users/${currUsername}`)
            : null,
          mainSiteSettingsUrl: formatPath('/settings'),
        }
      }, [mainSiteHost, currUsername])

    const sidebarExpanded = useMemo(
      () => sidebarOpen || sidebarOpenMobile,
      [sidebarOpen, sidebarOpenMobile]
    )

    const { updateSignin } = useDialogStore()
    const notiStore = useNotificationStore()
    const { t } = useTranslation()

    const { currSite } = useSiteStore(
      useShallow(({ site }) => ({
        currSite: site,
      }))
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
      if (
        isMobile &&
        !sidebarOpenMobile &&
        preventMobileCloseUntil > Date.now()
      ) {
        return
      }

      if (isMobile) {
        setSidebarOpenMobile(!sidebarOpenMobile)
      } else {
        setSidebarOpen(!sidebarOpen)
      }
    }, [
      isMobile,
      setSidebarOpen,
      sidebarOpen,
      setSidebarOpenMobile,
      sidebarOpenMobile,
      preventMobileCloseUntil,
    ])

    const logout = useCallback(async () => {
      if (loading) return
      try {
        const confirmed = await alertConfirm(t('confirm'), t('logoutConfirm'))
        if (!confirmed) return

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
    }, [loading, navigate, setLoading, authLogout, t, alertConfirm])

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
          'flex justify-between items-center py-2 bg-[hsl(var(--sidebar-background))] sticky top-0 z-10',
          siteMode == 'sidebar' && 'px-4 shadow-sm',
          isMobile && 'px-2',
          className
        )}
        style={{
          height: `${NAV_HEIGHT}px`,
          ...style,
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
                <SiteLink
                  className="flex-shrink-0 font-bold text-2xl leading-3 mr-2"
                  to="/"
                  siteFrontId={siteFrontId || undefined}
                  useFallbackSiteFrontId={false}
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
                </SiteLink>
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
                  <SiteLink
                    to={`/b/${category.frontId}`}
                    siteFrontId={siteFrontId}
                    className="flex-shrink-0 text-ellipsis overflow-hidden whitespace-nowrap"
                  >
                    {category.name}
                  </SiteLink>
                )}
                <span
                  className="flex-shrink-1 px-4 ml-4 border-l-2 text-sm text-gray-500 cursor-pointer flex-grow overflow-hidden whitespace-nowrap text-ellipsis"
                  onClick={() => setShowCategoryDetail(true)}
                >
                  {summaryText(category.describe, isMobile ? 20 : 100)}{' '}
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
          {/* {siteMode == 'top_nav' && <SiteMenuButton className="mr-2" />} */}
          <Button
            variant="ghost"
            size="sm"
            className="w-[36px] h-[36px] p-0 rounded-full mr-2"
            title={t('search')}
            onClick={() => setSearchOpen(true)}
          >
            <SearchIcon size={20} />
          </Button>
          {!isLogined() && (
            <DropdownMenu onOpenChange={onDropdownChange}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-[36px] h-[36px] p-0 rounded-full mr-2"
                  title={t('moreSettings')}
                >
                  <EllipsisVerticalIcon size={20} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="px-0" align="end" sideOffset={6}>
                <DropdownMenuItem
                  className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                  onClick={onUserUISettingClick}
                >
                  <PaletteIcon size={20} /> {t('personalizationUI')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {isLogined() ? (
            <>
              {!isMobile &&
                (isSingleSite && mainSiteMessagesUrl ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative w-[36px] h-[36px] p-0 rounded-full mr-2"
                    title={t('notifications')}
                    asChild
                  >
                    <a
                      href={mainSiteMessagesUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <BellIcon size={20} />
                      {notiStore.unreadCount > 0 && (
                        <Badge className="absolute bg-pink-600 hover:bg-pink-600 right-[2px] top-[3px] text-xs px-[4px] py-[0px]">
                          {notiStore.unreadCount}
                        </Badge>
                      )}
                    </a>
                  </Button>
                ) : (
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
                        maxHeight: `calc(100vh - ${NAV_HEIGHT + 200}px)`,
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
                ))}

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
                  {isMobile &&
                    (isSingleSite && mainSiteMessagesUrl ? (
                      <DropdownMenuItem
                        className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                        asChild
                      >
                        <a
                          href={mainSiteMessagesUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <BellIcon size={20} /> {t('notifications')}{' '}
                          {notiStore.unreadCount > 0 && (
                            <Badge className="inline-block bg-pink-600 hover:bg-pink-600 text-xs px-[4px] py-[0px]">
                              {notiStore.unreadCount}
                            </Badge>
                          )}
                        </a>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                        asChild
                      >
                        <Link to={'/messages'}>
                          <BellIcon size={20} /> {t('notifications')}{' '}
                          {notiStore.unreadCount > 0 && (
                            <Badge className="inline-block bg-pink-600 hover:bg-pink-600 text-xs px-[4px] py-[0px]">
                              {notiStore.unreadCount}
                            </Badge>
                          )}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  {isSingleSite && mainSiteProfileUrl ? (
                    <DropdownMenuItem
                      className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                      asChild
                    >
                      <a
                        href={mainSiteProfileUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <UserRoundIcon size={20} /> {t('personalHomePage')}
                      </a>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                      asChild
                    >
                      <Link to={'/users/' + currUsername}>
                        <UserRoundIcon size={20} /> {t('personalHomePage')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                    onClick={onUserUISettingClick}
                  >
                    <PaletteIcon size={20} /> {t('personalizationUI')}
                  </DropdownMenuItem>
                  {isSingleSite && mainSiteSettingsUrl ? (
                    <DropdownMenuItem
                      className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                      asChild
                    >
                      <a
                        href={mainSiteSettingsUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <SettingsIcon size={20} /> {t('settings')}
                      </a>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                      asChild
                    >
                      <Link to={'/settings'}>
                        <SettingsIcon size={20} /> {t('settings')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                    onClick={logout}
                    disabled={loading}
                  >
                    <LogOutIcon size={20} />{' '}
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

        <ArticleSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
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
