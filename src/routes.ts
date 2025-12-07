import {
  LoaderFunction,
  RouteObject,
  redirect,
  replace,
} from 'react-router-dom'

import OAuthCallback from './components/OAuthCallback.tsx'

import AboutPage from './AboutPage.tsx'
import ActivityPage from './ActivityPage.tsx'
import ArticlePage from './ArticlePage.tsx'
import { ArticleReviewPage } from './ArticleReviewPage.tsx'
import BannedUserListPage from './BannedUserListPage.tsx'
import BlockedUserListPage from './BlockedUserListPage.tsx'
import BlockedWordListPage from './BlockedWordListPage.tsx'
import CategoryListPage from './CategoryListPage.tsx'
import CategoryPage from './CategoryPage.tsx'
import EditPage from './EditPage.tsx'
import InvitePage from './InvitePage.tsx'
import MessagePage from './MessagePage.tsx'
import NotCompatiblePage from './NotCompatiblePage.tsx'
import NotFoundPage from './NotFoundPage.tsx'
import OAuthAuthorizationManagePage from './OAuthAuthorizationManagePage.tsx'
import OAuthAuthorizePage from './OAuthAuthorizePage.tsx'
import OAuthClientListPage from './OAuthClientListPage.tsx'
import RoleManagePage from './RoleManagePage.tsx'
import SettingsLayout from './SettingsLayout.tsx'
import SigninPage from './SigninPage.tsx'
import SignupPage from './SignupPage.tsx'
import SiteListPage from './SiteListPage.tsx'
import SubmitPage from './SubmitPage.tsx'
import TagListPage from './TagListPage.tsx'
import TagPage from './TagPage.tsx'
import TrashPage from './TrashPage.tsx'
import UserListPage from './UserListPage.tsx'
import UserPage from './UserPage.tsx'
import UserProfileSettingsPage from './UserProfileSettingsPage.tsx'
import { PermissionAction, PermissionModule } from './constants/types.ts'
import {
  isLogined,
  useAuthedUserStore,
  useContextStore,
  useSiteStore,
} from './state/global.ts'

const notAtAuthed = () => {
  const data = useAuthedUserStore.getState()
  const authed = !!data && isLogined(data)
  if (authed) return redirect('/')
  return null
}

const redirectToSignin = (returnUrl?: string) => {
  if (location.pathname == '/signin' || !returnUrl) {
    return replace(location.href.replace(location.origin, ''))
  } else {
    return redirect(`/signin?return=${encodeURIComponent(returnUrl)}`)
  }
}

const mustAuthed = async ({ request }: { request: Request }) => {
  // Give app time to initialize user state
  await new Promise((resolve) => setTimeout(resolve, 100))

  const authState = useAuthedUserStore.getState()
  if (!authState.isLogined()) {
    // Give one more chance, wait for possible ongoing token refresh
    await new Promise((resolve) => setTimeout(resolve, 500))
    const finalAuthState = useAuthedUserStore.getState()
    if (!finalAuthState.isLogined()) {
      return redirectToSignin(request.url)
    }
  }
  return null
}

const needPermission =
  <T extends PermissionModule>(
    module: T,
    action: PermissionAction<T>
  ): LoaderFunction =>
  async ({ request, params: { siteFrontId } }) => {
    try {
      // Give app time to initialize user state
      await new Promise((resolve) => setTimeout(resolve, 100))

      let authState = useAuthedUserStore.getState()
      if (!authState.isLogined()) {
        // Give one more chance, wait for possible ongoing token refresh
        await new Promise((resolve) => setTimeout(resolve, 500))
        authState = useAuthedUserStore.getState()
        if (!authState.isLogined()) {
          return redirectToSignin(request.url)
        }
      }

      const checkPermit = authState.permit
      const checkPermitUnderSite = authState.permitUnderSite

      if (siteFrontId) {
        const siteStore = useSiteStore.getState()
        const site = siteStore.site

        // If site data not loaded, skip permission check, let page handle
        if (site && !checkPermitUnderSite(site, module, action)) {
          return redirect(`/z/${siteFrontId}`)
        }
      } else {
        if (!checkPermit(module, action)) {
          return redirect('/')
        }
      }
    } catch (err) {
      console.error('permission check error in router: ', err)
    }

    return null
  }

const checkHomepageAuth = () => {
  const authState = useAuthedUserStore.getState()
  if (!authState.isLogined()) {
    return redirect('/all')
  }
  return null
}

const somePermissions =
  <T extends PermissionModule>(
    ...pairs: [T, PermissionAction<T>][]
  ): LoaderFunction =>
  ({ request, params: { siteFrontId } }) => {
    const authState = useAuthedUserStore.getState()

    if (!authState.isLogined()) {
      return redirectToSignin(request.url)
    }

    const permitted = pairs.some(([module, action]) =>
      authState.permit(module, action)
    )
    if (!permitted) {
      if (siteFrontId) {
        return redirect(`/z/${siteFrontId}`)
      } else {
        return redirect('/')
      }
    }

    return null
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

const singleSiteLoader: LoaderFunction = async () => {
  const site = await setSingleSiteState()
  if (!site) {
    return redirect('/')
  }
  return null
}

const singleSiteEntryLoader: LoaderFunction = async ({ request }) => {
  const site = await setSingleSiteState()
  if (!site) {
    return null
  }

  const pathname = new URL(request.url).pathname
  if (site.homePage !== '/' && pathname === '/') {
    return redirect(site.homePage)
  }

  const authState = useAuthedUserStore.getState()
  if (!authState.isLogined()) {
    return redirect('/all')
  }

  return null
}

const withSingleSite =
  (nextLoader?: LoaderFunction): LoaderFunction =>
  async (args) => {
    const siteRedirect = await singleSiteLoader(args)
    if (siteRedirect) {
      return siteRedirect
    }
    if (nextLoader) {
      return nextLoader(args)
    }
    return null
  }

const singleSiteRoutes: RouteObject[] = [
  {
    path: '/bankuai',
    Component: CategoryListPage,
    loader: singleSiteLoader,
  },
  {
    path: '/bankuai/:categoryFrontId',
    Component: CategoryPage,
    loader: singleSiteLoader,
  },
  {
    path: '/b/:categoryFrontId',
    Component: CategoryPage,
    loader: singleSiteLoader,
  },
  {
    path: '/tags',
    Component: TagListPage,
    loader: singleSiteLoader,
  },
  {
    path: '/tags/:tagName',
    Component: TagPage,
    loader: singleSiteLoader,
  },
  {
    path: '/submit',
    Component: SubmitPage,
    loader: withSingleSite(needPermission('article', 'create')),
  },
  {
    path: '/about',
    Component: AboutPage,
    loader: singleSiteLoader,
  },
  {
    path: '/articles/:articleId',
    Component: ArticlePage,
    loader: singleSiteLoader,
  },
  {
    path: '/articles/:articleId/edit',
    Component: EditPage,
    loader: withSingleSite(
      somePermissions(['article', 'edit_mine'], ['article', 'edit_others'])
    ),
  },
  {
    path: '/manage/blocklist',
    Component: BlockedUserListPage,
    loader: withSingleSite(needPermission('user', 'manage')),
  },
  {
    path: '/manage/article_review',
    Component: ArticleReviewPage,
    loader: withSingleSite(needPermission('article', 'review')),
  },
  {
    path: '/manage/blocked_words',
    Component: BlockedWordListPage,
    loader: withSingleSite(needPermission('site', 'manage')),
  },
]

const createSiteRoutes = (prefix: '/z' | '/zhandian'): RouteObject[] => {
  return [
    {
      path: `${prefix}/:siteFrontId`,
      loader: ({ params }) => {
        const authState = useAuthedUserStore.getState()

        const siteFrontId = params.siteFrontId
        if (!siteFrontId) {
          return redirect('/')
        }

        if (!authState.isLogined()) {
          return redirect(`${prefix}/${siteFrontId}/all`)
        }

        return null
      },
      Component: CategoryPage,
    },
    {
      path: `${prefix}/:siteFrontId/all`,
      Component: CategoryPage,
    },
    {
      path: `${prefix}/:siteFrontId/bankuai`,
      Component: CategoryListPage,
    },
    {
      path: `${prefix}/:siteFrontId/tags`,
      Component: TagListPage,
    },
    {
      path: `${prefix}/:siteFrontId/tags/:tagName`,
      Component: TagPage,
    },
    {
      path: `${prefix}/:siteFrontId/submit`,
      Component: SubmitPage,
      loader: needPermission('article', 'create'),
    },
    {
      path: `${prefix}/:siteFrontId/bankuai/:categoryFrontId`,
      Component: CategoryPage,
    },
    {
      path: `${prefix}/:siteFrontId/about`,
      Component: AboutPage,
    },
    {
      path: `${prefix}/:siteFrontId/b/:categoryFrontId`,
      Component: CategoryPage,
    },
    {
      path: `${prefix}/:siteFrontId/articles/:articleId`,
      Component: ArticlePage,
    },
    {
      path: `${prefix}/:siteFrontId/articles/:articleId/edit`,
      Component: EditPage,
      loader: somePermissions(
        ['article', 'edit_mine'],
        ['article', 'edit_others']
      ),
    },
    {
      path: `${prefix}/:siteFrontId/manage/users`,
      Component: UserListPage,
      loader: needPermission('user', 'manage'),
    },
    {
      path: `${prefix}/:siteFrontId/manage/blocklist`,
      Component: BlockedUserListPage,
      loader: needPermission('user', 'manage'),
    },
    {
      path: `${prefix}/:siteFrontId/manage/roles`,
      Component: RoleManagePage,
      loader: needPermission('role', 'manage'),
    },
    {
      path: `${prefix}/:siteFrontId/manage/activities`,
      Component: ActivityPage,
      loader: needPermission('activity', 'access'),
    },
    {
      path: `${prefix}/:siteFrontId/manage/article_review`,
      Component: ArticleReviewPage,
      loader: needPermission('article', 'review'),
    },
    {
      path: `${prefix}/:siteFrontId/manage/blocked_words`,
      Component: BlockedWordListPage,
      loader: needPermission('site', 'manage'),
    },
  ]
}

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: CategoryPage,
    loader: async (args) => {
      const singleSiteResult = await singleSiteEntryLoader(args)
      if (singleSiteResult) {
        return singleSiteResult
      }
      return checkHomepageAuth()
    },
  },
  {
    path: '/all',
    Component: CategoryPage,
  },
  {
    path: '/invite/:inviteCode',
    Component: InvitePage,
  },
  {
    path: '/signup',
    Component: SignupPage,
    loader: notAtAuthed,
  },
  {
    path: '/signin',
    Component: SigninPage,
    loader: notAtAuthed,
  },
  {
    path: '/oauth_provider/authorize',
    Component: OAuthAuthorizePage,
    loader: mustAuthed,
  },
  {
    path: '/oauth_callback',
    Component: OAuthCallback,
  },
  {
    path: '/users/:username',
    Component: UserPage,
  },
  {
    path: '/u/:username',
    Component: UserPage,
  },
  {
    path: '/messages',
    Component: MessagePage,
    loader: mustAuthed,
  },
  {
    path: '/settings',
    Component: SettingsLayout,
    loader: mustAuthed,
    children: [
      {
        path: 'profile',
        Component: UserProfileSettingsPage,
      },
      {
        path: 'authorizations',
        Component: OAuthAuthorizationManagePage,
      },
      {
        path: '',
        loader: () => redirect('/settings/profile'),
      },
    ],
  },
  {
    path: '/manage',
    loader: needPermission('platform_manage', 'access'),
    children: [
      {
        path: 'sites',
        Component: SiteListPage,
        loader: needPermission('site', 'manage_platform'),
      },
      {
        path: '',
        loader: () => redirect('/manage/activities'),
      },
      {
        path: 'activities',
        Component: ActivityPage,
        loader: needPermission('activity', 'manage_platform'),
      },
      {
        path: 'trash',
        Component: TrashPage,
        loader: needPermission('platform_manage', 'access'),
      },
      {
        path: 'users',
        Component: UserListPage,
        loader: needPermission('user', 'manage_platform'),
      },
      {
        path: 'banned_users',
        Component: BannedUserListPage,
        loader: needPermission('user', 'manage_platform'),
      },
      {
        path: 'roles',
        Component: RoleManagePage,
        loader: needPermission('role', 'manage_platform'),
      },
      {
        path: 'oauth_clients',
        Component: OAuthClientListPage,
        loader: needPermission('oauth', 'manage'),
      },
    ],
  },
  ...singleSiteRoutes,
  ...createSiteRoutes('/z'),
  ...createSiteRoutes('/zhandian'),
  {
    path: '/not_compatible',
    Component: NotCompatiblePage,
  },
  {
    path: '*',
    Component: NotFoundPage,
  },
]
