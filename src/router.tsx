import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  stringifySearchWith,
  useRouterState,
} from '@tanstack/react-router'
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useShallow } from 'zustand/react/shallow'

import { Toaster } from './components/ui/sonner'

import BLoader from './components/base/BLoader'

// Page imports
import OAuthCallback from './components/OAuthCallback'
import { useTheme } from './components/theme-provider'

import '@/state/chat-db'
import { deleteIDBMessage, saveIDBMessage } from '@/state/chat-db'
import { useNewArticlesStore } from '@/state/new-articles'

import AboutPage from './AboutPage'
import ActivityPage from './ActivityPage'
import ArticlePage from './ArticlePage'
import { ArticleReviewPage } from './ArticleReviewPage'
import BannedUserListPage from './BannedUserListPage'
import BlockedUserListPage from './BlockedUserListPage'
import BlockedWordListPage from './BlockedWordListPage'
import CategoryListPage from './CategoryListPage'
import CategoryPage from './CategoryPage'
import EditPage from './EditPage'
import InvitePage from './InvitePage'
import MessagePage from './MessagePage'
import NotCompatiblePage from './NotCompatiblePage'
import NotFoundPage from './NotFoundPage'
import OAuthAuthorizationManagePage from './OAuthAuthorizationManagePage'
import OAuthAuthorizePage from './OAuthAuthorizePage'
import OAuthClientListPage from './OAuthClientListPage'
import RoleManagePage from './RoleManagePage'
import SettingsLayout from './SettingsLayout'
import SigninPage from './SigninPage'
import SignupPage from './SignupPage'
import SiteListPage from './SiteListPage'
import SubmitPage from './SubmitPage'
import TagListPage from './TagListPage'
import TagPage from './TagPage'
import TrashPage from './TrashPage'
import UserListPage from './UserListPage'
import UserPage from './UserPage'
import UserProfileSettingsPage from './UserProfileSettingsPage'
import {
  API_HOST,
  API_PATH_PREFIX,
  DEFAULT_THEME,
  LEFT_SIDEBAR_DEFAULT_OPEN,
  LEFT_SIDEBAR_STATE_KEY,
  RIGHT_SIDEBAR_SETTINGS_TYPE_KEY,
  RIGHT_SIDEBAR_STATE_KEY,
} from './constants/constants'
import { PermissionAction, PermissionModule } from './constants/types'
import { useIsMobile } from './hooks/use-mobile'
import './i18n'
import { setFaviconBadge } from './lib/favicon'
import { toSync } from './lib/fire-and-forget'
import { refreshAuthState, refreshToken } from './lib/request'
import { useNavigate } from './lib/router'
import { setRootFontSize } from './lib/utils'
import {
  getLocalUserUISettings,
  useAuthedUserStore,
  useContextStore,
  useDefaultFontSizeStore,
  useEventSourceStore,
  useForceUpdate,
  useNotificationStore,
  useRightSidebarStore,
  useSidebarStore,
  useSiteStore,
  useUserUIStore,
} from './state/global'
import { Article, SSE_EVENT, SettingsType } from './types/types'

const DESKTOP_FONT_SIZE = '16'
const MOBILE_FONT_SIZE = '14'

interface RouterState {
  __settingsModalKey?: number
}

const fetchNotiCount = toSync(async () => {
  const notiState = useNotificationStore.getState()
  const authState = useAuthedUserStore.getState()

  if (authState.isLogined()) {
    await notiState.fetchUnread()
  }
})

const EVENT_URL = `${API_HOST}${API_PATH_PREFIX}events`

const connectEvents = () => {
  const eventSource = new EventSource(EVENT_URL, {
    withCredentials: true,
  })

  eventSource.addEventListener(SSE_EVENT.Ping, () => undefined)

  eventSource.addEventListener(
    SSE_EVENT.UpdateRole,
    (_event: MessageEvent<string>) => {
      toSync(refreshAuthState)(true)
      const siteState = useSiteStore.getState()
      if (siteState.site) {
        toSync(siteState.fetchSiteData)(siteState.site.frontId)
      }
    }
  )

  eventSource.addEventListener(SSE_EVENT.UpdateNoties, (_ev) => {
    fetchNotiCount()
  })

  eventSource.addEventListener(SSE_EVENT.Close, (_ev) => {
    eventSource.close()
  })

  eventSource.addEventListener(
    SSE_EVENT.DeleteMessage,
    (ev: MessageEvent<string>) => {
      try {
        if (ev.data) {
          toSync(deleteIDBMessage)(ev.data)
        }
      } catch (err) {
        console.error('parse event data error in deletemessage event: ', err)
      }
    }
  )

  eventSource.addEventListener(
    SSE_EVENT.NewArticle,
    (ev: MessageEvent<string>) => {
      try {
        if (!ev.data || ev.data === 'undefined') {
          return
        }
        const article = JSON.parse(ev.data) as Article
        if (article) {
          if (article.category?.contentForm?.frontId === 'chat') {
            toSync(saveIDBMessage)(
              article.siteFrontId,
              article.categoryFrontId,
              article
            )
          } else {
            useNewArticlesStore.getState().addNewArticle(article)
          }
        }
      } catch (err) {
        console.error('parse event data error in newarticle event: ', err)
      }
    }
  )

  eventSource.onerror = (err) => {
    console.error('event source error: ', err)
  }

  return eventSource
}

function RootComponent() {
  const [initialized, setInitialized] = useState(false)

  const { currUsername, authToken, updateBaseData, updateUserData } =
    useAuthedUserStore(
      useShallow(
        ({
          username,
          authToken,
          isLogined,
          updateBaseData,
          updateUserData,
        }) => ({
          currUsername: username,
          authToken,
          isLogined,
          updateBaseData,
          updateUserData,
        })
      )
    )

  const setEventSource = useEventSourceStore((state) => state.setEventSource)
  const eventSource = useEventSourceStore((state) => state.eventSource)

  const { fetchSiteList } = useSiteStore(
    useShallow(({ fetchSiteList }) => ({
      fetchSiteList,
    }))
  )

  const { theme, setTheme } = useTheme()

  const setSidebarOpen = useSidebarStore((state) => state.setOpen)
  const setRightSidebarOpen = useRightSidebarStore((state) => state.setOpen)
  const setSettingsType = useRightSidebarStore((state) => state.setSettingsType)

  const setUserUIState = useUserUIStore((state) => state.setState)
  const unreadCount = useNotificationStore((state) => state.unreadCount)

  const isMobile = useIsMobile()
  const setDefaultFontSize = useDefaultFontSizeStore(
    (state) => state.setDefaultFontSize
  )
  const { forceState, forceUpdate } = useForceUpdate(
    useShallow(({ forceState, forceUpdate }) => ({ forceState, forceUpdate }))
  )
  const routerLocation = useRouterState({
    select: (s) => s.location,
  })
  const navigateRouter = useNavigate()

  const maskedSettingsPath =
    routerLocation.maskedLocation?.pathname?.startsWith('/settings') &&
    routerLocation.maskedLocation.pathname
      ? routerLocation.maskedLocation.pathname
      : null

  const refreshTokenSync = toSync(
    useCallback(
      async (refreshUser: boolean) => {
        const {
          data: { token, username, userID, user },
          code,
        } = await refreshToken(refreshUser)

        if (!code) {
          updateBaseData(token, username, userID)
          if (refreshUser) {
            updateUserData(user)
          }
        }
      },
      [updateBaseData, updateUserData]
    )
  )

  const handleSettingsModalClose = useCallback(() => {
    navigateRouter(-1)
  }, [navigateRouter])

  const handleSettingsRouteChange = useCallback(
    (path: string) => {
      if (!path.startsWith('/settings')) {
        return
      }
      const nextState: RouterState = {
        __settingsModalKey: Date.now(),
      }
      navigateRouter({
        to: '.',
        state: nextState,
        mask: {
          to: path,
        },
      })
    },
    [navigateRouter]
  )

  const reconnectEventSource = useCallback(() => {
    if (eventSource && eventSource.readyState === EventSource.OPEN) {
      return
    }

    if (eventSource) {
      eventSource.close()
      setEventSource(null)
    }

    const ev = connectEvents()
    setEventSource(ev)
  }, [eventSource, setEventSource])

  useEffect(() => {
    const ev = connectEvents()
    setEventSource(ev)

    return () => {
      setEventSource(null)
      ev.close()
    }
  }, [currUsername, setEventSource])

  useEffect(() => {
    let debounceTimer: NodeJS.Timeout

    window.onfocus = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        startTransition(() => {
          reconnectEventSource()
          refreshTokenSync(true)
          fetchNotiCount()
        })
      }, 1000)
    }

    return () => {
      window.onfocus = null
      clearTimeout(debounceTimer)
    }
  }, [refreshTokenSync, reconnectEventSource])

  const fetchContext = useContextStore((state) => state.fetchContext)

  useEffect(() => {
    const initializeApp = async () => {
      await fetchContext()

      let isLoggedIn = false

      if (!authToken) {
        try {
          const {
            data: { token, username, userID, user },
            code,
          } = await refreshToken(true)

          if (!code) {
            updateBaseData(token, username, userID)
            updateUserData(user)
            isLoggedIn = true
          }
        } catch (error) {
          console.error('Failed to refresh token:', error)
        }
      } else {
        isLoggedIn = true
      }

      if (isLoggedIn) {
        fetchNotiCount()
        toSync(fetchSiteList)()
      }

      setInitialized(true)
    }

    void initializeApp()
  }, [
    authToken,
    fetchSiteList,
    fetchContext,
    forceUpdate,
    updateBaseData,
    updateUserData,
  ])

  useEffect(() => {
    const defaultFontSize = isMobile ? MOBILE_FONT_SIZE : DESKTOP_FONT_SIZE
    setDefaultFontSize(defaultFontSize)

    const leftSidebarState = localStorage.getItem(LEFT_SIDEBAR_STATE_KEY)
    const rightSidebarState = localStorage.getItem(RIGHT_SIDEBAR_STATE_KEY)
    const rightSidebarSettingsType = localStorage.getItem(
      RIGHT_SIDEBAR_SETTINGS_TYPE_KEY
    ) as SettingsType | null

    const userUISettings = getLocalUserUISettings()

    if (userUISettings) {
      setUserUIState(userUISettings)
      setTheme(userUISettings.theme || DEFAULT_THEME)
      setRootFontSize(String(userUISettings.fontSize) || defaultFontSize)
    } else {
      setRootFontSize(defaultFontSize)
    }

    if (rightSidebarSettingsType) {
      setSettingsType(rightSidebarSettingsType)
    }

    if (isMobile) {
      setSidebarOpen(false)
    } else {
      setSidebarOpen(
        leftSidebarState
          ? leftSidebarState == 'true'
          : LEFT_SIDEBAR_DEFAULT_OPEN
      )
      setRightSidebarOpen(rightSidebarState == 'true')
    }
  }, [
    isMobile,
    setSidebarOpen,
    setRightSidebarOpen,
    setSettingsType,
    setUserUIState,
    setTheme,
    setDefaultFontSize,
  ])

  useEffect(() => {
    setFaviconBadge(unreadCount).catch(console.error)
  }, [unreadCount])

  const settingsModalContent = useMemo(() => {
    if (!maskedSettingsPath) {
      return null
    }
    if (maskedSettingsPath.startsWith('/settings/authorizations')) {
      return <OAuthAuthorizationManagePage />
    }
    return <UserProfileSettingsPage />
  }, [maskedSettingsPath])

  const settingsModal =
    maskedSettingsPath && settingsModalContent ? (
      <SettingsLayout
        modalOverride
        forcedPathname={maskedSettingsPath}
        onRequestClose={handleSettingsModalClose}
        onRouteChange={handleSettingsRouteChange}
      >
        {settingsModalContent}
      </SettingsLayout>
    ) : null

  return (
    <>
      {initialized ? (
        <>
          <Outlet key={forceState} />
          {settingsModal}
        </>
      ) : (
        <div className="flex h-screen items-center justify-center">
          <BLoader className="-mt-8" />
        </div>
      )}
      <Toaster
        theme={theme}
        position="top-center"
        visibleToasts={1}
        closeButton
        toastOptions={{
          classNames: {
            error: 'bg-red-400 dark:bg-red-900',
            success: 'bg-green-400 dark:bg-green-900',
            warning: 'bg-yellow-400 dark:bg-yellow-900',
            info: 'bg-blue-400 dark:bg-blue-900',
            loading: 'bg-blue-400 dark:bg-blue-900',
            icon: 'text-white',
            content: 'text-white',
            closeButton: 'absolute left-auto right-[-10px] text-black',
          },
        }}
      />
    </>
  )
}

// Root route
const rootRoute = createRootRoute({
  component: RootComponent,
})

// Route guards
type LooseSearchState = Record<string, string | undefined>
type LooseRedirectOptions = {
  to: string
  params?: LooseSearchState
  search?: LooseSearchState | ((prev: LooseSearchState) => LooseSearchState)
  state?: unknown
  hash?: string
  replace?: boolean
  viewTransition?: boolean
} & Record<string, unknown>
type RouterRedirectOptions = Parameters<typeof redirect>[0]

const throwRouterRedirect = (options: LooseRedirectOptions): never => {
  // TanStack Router 需要直接拋出 redirect 物件
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  throw redirect(options as RouterRedirectOptions)
}

const redirectToSignin = (currentURL: string) => {
  const pathname = new URL(currentURL).pathname
  if (pathname === '/signin') {
    throwRouterRedirect({ to: currentURL.replace(window.location.origin, '') })
  }
  const callbackURL = encodeURIComponent(currentURL)
  throwRouterRedirect({
    to: '/signin',
    search: { return: callbackURL },
  })
}

const mustAuthed = async () => {
  await new Promise((resolve) => setTimeout(resolve, 100))
  const authState = useAuthedUserStore.getState()
  if (!authState.isLogined()) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const finalAuthState = useAuthedUserStore.getState()
    if (!finalAuthState.isLogined()) {
      redirectToSignin(window.location.href)
    }
  }
}

const notAtAuthed = () => {
  const authState = useAuthedUserStore.getState()
  if (authState.isLogined()) {
    throwRouterRedirect({ to: '/' })
  }
}

const needPermission = <T extends PermissionModule>(
  module: T,
  action: PermissionAction<T>
) => {
  return async ({ params }: { params?: Record<string, string> }) => {
    await new Promise((resolve) => setTimeout(resolve, 100))

    let authState = useAuthedUserStore.getState()
    if (!authState.isLogined()) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      authState = useAuthedUserStore.getState()
      if (!authState.isLogined()) {
        redirectToSignin(window.location.href)
        return
      }
    }

    const checkPermit = authState.permit
    const checkPermitUnderSite = authState.permitUnderSite
    const siteFrontId = params?.siteFrontId

    if (siteFrontId) {
      const siteStore = useSiteStore.getState()
      const site = siteStore.site

      if (site && !checkPermitUnderSite(site, module, action)) {
        throwRouterRedirect({
          to: '/z/$siteFrontId',
          params: { siteFrontId },
        })
      }
    } else {
      if (!checkPermit(module, action)) {
        throwRouterRedirect({ to: '/' })
      }
    }
  }
}

const somePermissions = <T extends PermissionModule>(
  ...pairs: [T, PermissionAction<T>][]
) => {
  return ({ params }: { params?: Record<string, string> }) => {
    const authState = useAuthedUserStore.getState()

    if (!authState.isLogined()) {
      redirectToSignin(window.location.href)
      return
    }

    const permitted = pairs.some(([module, action]) =>
      authState.permit(module, action)
    )
    if (!permitted) {
      const siteFrontId = params?.siteFrontId
      if (siteFrontId) {
        throwRouterRedirect({
          to: '/z/$siteFrontId',
          params: { siteFrontId },
        })
      } else {
        throwRouterRedirect({ to: '/' })
      }
    }
  }
}

const setSingleSiteState = async () => {
  try {
    let contextState = useContextStore.getState()

    if (!contextState.hasFetchedContext) {
      await contextState.fetchContext()
      contextState = useContextStore.getState()
    }

    if (!contextState.isSingleSite) {
      return null
    }

    if (!contextState.site) {
      await contextState.fetchContext()
      contextState = useContextStore.getState()
    }

    const site = contextState.site
    if (!site) {
      return null
    }

    const siteState = useSiteStore.getState()
    const shouldUpdateSite =
      !siteState.site ||
      siteState.site.frontId !== site.frontId ||
      siteState.site.homePage !== site.homePage ||
      siteState.site.currUserRole?.id !== site.currUserRole?.id ||
      siteState.site.currUserState?.isMember !== site.currUserState?.isMember

    if (shouldUpdateSite) {
      siteState.update(site)
      siteState.updateHomePage(site.homePage)
    }

    return site
  } catch (err) {
    console.error('sync single site state error: ', err)
    return null
  }
}

const singleSiteLoader = async () => {
  const site = await setSingleSiteState()
  if (!site) {
    throwRouterRedirect({ to: '/' })
  }
}

const singleSiteEntryLoader = async () => {
  const site = await setSingleSiteState()
  if (!site) {
    return
  }

  const pathname = window.location.pathname
  if (site.homePage !== '/' && pathname === '/') {
    throwRouterRedirect({ to: site.homePage })
  }

  const authState = useAuthedUserStore.getState()
  if (!authState.isLogined()) {
    throwRouterRedirect({ to: '/all' })
  }
}

const checkHomepageAuth = () => {
  const authState = useAuthedUserStore.getState()
  if (!authState.isLogined()) {
    throwRouterRedirect({ to: '/all' })
  }
}

const withSingleSite = (
  nextLoader?: (args: {
    params?: Record<string, string>
  }) => Promise<void> | void
) => {
  return async (args: { params?: Record<string, string> }) => {
    await singleSiteLoader()
    if (nextLoader) {
      await nextLoader(args)
    }
  }
}

// Index route
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: CategoryPage,
  beforeLoad: async () => {
    await singleSiteEntryLoader()
    checkHomepageAuth()
  },
})

// Base routes
const allRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/all',
  component: CategoryPage,
})

const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invite/$inviteCode',
  component: InvitePage,
})

const notCompatibleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/not_compatible',
  component: NotCompatiblePage,
})

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: NotFoundPage,
})

// Auth routes
const signinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signin',
  component: SigninPage,
  beforeLoad: notAtAuthed,
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  component: SignupPage,
  beforeLoad: notAtAuthed,
})

const oauthAuthorizeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/oauth_provider/authorize',
  component: OAuthAuthorizePage,
  beforeLoad: mustAuthed,
})

const oauthCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/oauth_callback',
  component: OAuthCallback,
})

// User routes
const userRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users/$username',
  component: UserPage,
})

const userShortRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/u/$username',
  component: UserPage,
})

const messagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/messages',
  component: MessagePage,
  beforeLoad: mustAuthed,
})

// Settings routes
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsLayout,
  beforeLoad: mustAuthed,
})

const settingsProfileRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/profile',
  component: UserProfileSettingsPage,
})

const settingsAuthorizationsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/authorizations',
  component: OAuthAuthorizationManagePage,
})

const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/',
  beforeLoad: () => {
    throwRouterRedirect({ to: '/settings/profile' })
  },
})

// Platform manage routes
const manageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage',
  component: Outlet,
  beforeLoad: needPermission('platform_manage', 'access'),
})

const manageSitesRoute = createRoute({
  getParentRoute: () => manageRoute,
  path: '/sites',
  component: SiteListPage,
  beforeLoad: needPermission('site', 'manage_platform'),
})

const manageActivitiesRoute = createRoute({
  getParentRoute: () => manageRoute,
  path: '/activities',
  component: ActivityPage,
  beforeLoad: needPermission('activity', 'manage_platform'),
})

const manageTrashRoute = createRoute({
  getParentRoute: () => manageRoute,
  path: '/trash',
  component: TrashPage,
  beforeLoad: needPermission('platform_manage', 'access'),
})

const manageUsersRoute = createRoute({
  getParentRoute: () => manageRoute,
  path: '/users',
  component: UserListPage,
  beforeLoad: needPermission('user', 'manage_platform'),
})

const manageBannedUsersRoute = createRoute({
  getParentRoute: () => manageRoute,
  path: '/banned_users',
  component: BannedUserListPage,
  beforeLoad: needPermission('user', 'manage_platform'),
})

const manageRolesRoute = createRoute({
  getParentRoute: () => manageRoute,
  path: '/roles',
  component: RoleManagePage,
  beforeLoad: needPermission('role', 'manage_platform'),
})

const manageOAuthClientsRoute = createRoute({
  getParentRoute: () => manageRoute,
  path: '/oauth_clients',
  component: OAuthClientListPage,
  beforeLoad: needPermission('oauth', 'manage'),
})

const manageIndexRoute = createRoute({
  getParentRoute: () => manageRoute,
  path: '/',
  beforeLoad: () => {
    throwRouterRedirect({ to: '/manage/activities' })
  },
})

// Single site routes
const ssBankuaiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bankuai',
  component: CategoryListPage,
  beforeLoad: singleSiteLoader,
})

const ssBankuaiCategoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bankuai/$categoryFrontId',
  component: CategoryPage,
  beforeLoad: singleSiteLoader,
})

const ssCategoryShortRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/b/$categoryFrontId',
  component: CategoryPage,
  beforeLoad: singleSiteLoader,
})

const ssTagsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tags',
  component: TagListPage,
  beforeLoad: singleSiteLoader,
})

const ssTagRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tags/$tagName',
  component: TagPage,
  beforeLoad: singleSiteLoader,
})

const ssSubmitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/submit',
  component: SubmitPage,
  beforeLoad: withSingleSite(needPermission('article', 'create')),
})

const ssAboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutPage,
  beforeLoad: singleSiteLoader,
})

const ssArticleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/articles/$articleId',
  component: ArticlePage,
  beforeLoad: singleSiteLoader,
})

const ssArticleEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/articles/$articleId/edit',
  component: EditPage,
  beforeLoad: withSingleSite(
    somePermissions(['article', 'edit_mine'], ['article', 'edit_others'])
  ),
})

const ssManageBlocklistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/blocklist',
  component: BlockedUserListPage,
  beforeLoad: withSingleSite(needPermission('user', 'manage')),
})

const ssManageArticleReviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/article_review',
  component: ArticleReviewPage,
  beforeLoad: withSingleSite(needPermission('article', 'review')),
})

const ssManageBlockedWordsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/blocked_words',
  component: BlockedWordListPage,
  beforeLoad: withSingleSite(needPermission('site', 'manage')),
})

// Site routes with /z prefix
const zSiteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/z/$siteFrontId',
  component: CategoryPage,
  beforeLoad: ({ params }) => {
    const authState = useAuthedUserStore.getState()
    if (!authState.isLogined()) {
      throwRouterRedirect({
        to: '/z/$siteFrontId/all',
        params: { siteFrontId: params.siteFrontId },
      })
    }
  },
})

const zSiteAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/z/$siteFrontId/all',
  component: CategoryPage,
})

const zSiteBankuaiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/z/$siteFrontId/bankuai',
  component: CategoryListPage,
})

const zSiteTagsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/z/$siteFrontId/tags',
  component: TagListPage,
})

const zSiteTagRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/z/$siteFrontId/tags/$tagName',
  component: TagPage,
})

const zSiteSubmitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/z/$siteFrontId/submit',
  component: SubmitPage,
  beforeLoad: needPermission('article', 'create'),
})

const zSiteBankuaiCategoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/z/$siteFrontId/bankuai/$categoryFrontId',
  component: CategoryPage,
})

const zSiteAboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/z/$siteFrontId/about',
  component: AboutPage,
})

const zSiteCategoryShortRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/z/$siteFrontId/b/$categoryFrontId',
  component: CategoryPage,
})

const zSiteArticleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/z/$siteFrontId/articles/$articleId',
  component: ArticlePage,
})

const zSiteArticleEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/z/$siteFrontId/articles/$articleId/edit',
  component: EditPage,
  beforeLoad: somePermissions(
    ['article', 'edit_mine'],
    ['article', 'edit_others']
  ),
})

const zSiteManageUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/z/$siteFrontId/manage/users',
  component: UserListPage,
  beforeLoad: needPermission('user', 'manage'),
})

const zSiteManageBlocklistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/z/$siteFrontId/manage/blocklist',
  component: BlockedUserListPage,
  beforeLoad: needPermission('user', 'manage'),
})

const zSiteManageRolesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/z/$siteFrontId/manage/roles',
  component: RoleManagePage,
  beforeLoad: needPermission('role', 'manage'),
})

const zSiteManageActivitiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/z/$siteFrontId/manage/activities',
  component: ActivityPage,
  beforeLoad: needPermission('activity', 'access'),
})

const zSiteManageArticleReviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/z/$siteFrontId/manage/article_review',
  component: ArticleReviewPage,
  beforeLoad: needPermission('article', 'review'),
})

const zSiteManageBlockedWordsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/z/$siteFrontId/manage/blocked_words',
  component: BlockedWordListPage,
  beforeLoad: needPermission('site', 'manage'),
})

// Site routes with /zhandian prefix
const zhandianSiteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zhandian/$siteFrontId',
  component: CategoryPage,
  beforeLoad: ({ params }) => {
    const authState = useAuthedUserStore.getState()
    if (!authState.isLogined()) {
      throwRouterRedirect({
        to: '/zhandian/$siteFrontId/all',
        params: { siteFrontId: params.siteFrontId },
      })
    }
  },
})

const zhandianSiteAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zhandian/$siteFrontId/all',
  component: CategoryPage,
})

const zhandianSiteBankuaiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zhandian/$siteFrontId/bankuai',
  component: CategoryListPage,
})

const zhandianSiteTagsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zhandian/$siteFrontId/tags',
  component: TagListPage,
})

const zhandianSiteTagRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zhandian/$siteFrontId/tags/$tagName',
  component: TagPage,
})

const zhandianSiteSubmitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zhandian/$siteFrontId/submit',
  component: SubmitPage,
  beforeLoad: needPermission('article', 'create'),
})

const zhandianSiteBankuaiCategoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zhandian/$siteFrontId/bankuai/$categoryFrontId',
  component: CategoryPage,
})

const zhandianSiteAboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zhandian/$siteFrontId/about',
  component: AboutPage,
})

const zhandianSiteCategoryShortRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zhandian/$siteFrontId/b/$categoryFrontId',
  component: CategoryPage,
})

const zhandianSiteArticleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zhandian/$siteFrontId/articles/$articleId',
  component: ArticlePage,
})

const zhandianSiteArticleEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zhandian/$siteFrontId/articles/$articleId/edit',
  component: EditPage,
  beforeLoad: somePermissions(
    ['article', 'edit_mine'],
    ['article', 'edit_others']
  ),
})

const zhandianSiteManageUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zhandian/$siteFrontId/manage/users',
  component: UserListPage,
  beforeLoad: needPermission('user', 'manage'),
})

const zhandianSiteManageBlocklistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zhandian/$siteFrontId/manage/blocklist',
  component: BlockedUserListPage,
  beforeLoad: needPermission('user', 'manage'),
})

const zhandianSiteManageRolesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zhandian/$siteFrontId/manage/roles',
  component: RoleManagePage,
  beforeLoad: needPermission('role', 'manage'),
})

const zhandianSiteManageActivitiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zhandian/$siteFrontId/manage/activities',
  component: ActivityPage,
  beforeLoad: needPermission('activity', 'access'),
})

const zhandianSiteManageArticleReviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zhandian/$siteFrontId/manage/article_review',
  component: ArticleReviewPage,
  beforeLoad: needPermission('article', 'review'),
})

const zhandianSiteManageBlockedWordsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zhandian/$siteFrontId/manage/blocked_words',
  component: BlockedWordListPage,
  beforeLoad: needPermission('site', 'manage'),
})

// Create route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  allRoute,
  inviteRoute,
  signinRoute,
  signupRoute,
  oauthAuthorizeRoute,
  oauthCallbackRoute,
  userRoute,
  userShortRoute,
  messagesRoute,
  settingsRoute.addChildren([
    settingsIndexRoute,
    settingsProfileRoute,
    settingsAuthorizationsRoute,
  ]),
  manageRoute.addChildren([
    manageIndexRoute,
    manageSitesRoute,
    manageActivitiesRoute,
    manageTrashRoute,
    manageUsersRoute,
    manageBannedUsersRoute,
    manageRolesRoute,
    manageOAuthClientsRoute,
  ]),
  ssBankuaiRoute,
  ssBankuaiCategoryRoute,
  ssCategoryShortRoute,
  ssTagsRoute,
  ssTagRoute,
  ssSubmitRoute,
  ssAboutRoute,
  ssArticleRoute,
  ssArticleEditRoute,
  ssManageBlocklistRoute,
  ssManageArticleReviewRoute,
  ssManageBlockedWordsRoute,
  zSiteRoute,
  zSiteAllRoute,
  zSiteBankuaiRoute,
  zSiteTagsRoute,
  zSiteTagRoute,
  zSiteSubmitRoute,
  zSiteBankuaiCategoryRoute,
  zSiteAboutRoute,
  zSiteCategoryShortRoute,
  zSiteArticleRoute,
  zSiteArticleEditRoute,
  zSiteManageUsersRoute,
  zSiteManageBlocklistRoute,
  zSiteManageRolesRoute,
  zSiteManageActivitiesRoute,
  zSiteManageArticleReviewRoute,
  zSiteManageBlockedWordsRoute,
  zhandianSiteRoute,
  zhandianSiteAllRoute,
  zhandianSiteBankuaiRoute,
  zhandianSiteTagsRoute,
  zhandianSiteTagRoute,
  zhandianSiteSubmitRoute,
  zhandianSiteBankuaiCategoryRoute,
  zhandianSiteAboutRoute,
  zhandianSiteCategoryShortRoute,
  zhandianSiteArticleRoute,
  zhandianSiteArticleEditRoute,
  zhandianSiteManageUsersRoute,
  zhandianSiteManageBlocklistRoute,
  zhandianSiteManageRolesRoute,
  zhandianSiteManageActivitiesRoute,
  zhandianSiteManageArticleReviewRoute,
  zhandianSiteManageBlockedWordsRoute,
  notCompatibleRoute,
  notFoundRoute,
])

const simpleStringifySearch = stringifySearchWith(JSON.stringify)
const simpleParseSearch = (searchStr: string) => {
  const params = new URLSearchParams(
    searchStr.startsWith('?') ? searchStr.slice(1) : searchStr
  )
  const next: Record<string, string> = {}
  params.forEach((value, key) => {
    next[key] = value
  })
  return next
}

// Create router
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: false,
  stringifySearch: simpleStringifySearch,
  parseSearch: simpleParseSearch,
})

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
