import {
  LoaderFunction,
  RouteObject,
  redirect,
  replace,
} from 'react-router-dom'

import OAuthCallback from './components/OAuthCallback.tsx'

import ActivityPage from './ActivityPage.tsx'
import ArticlePage from './ArticlePage.tsx'
import { ArticleReviewPage } from './ArticleReviewPage.tsx'
import BankuaiPage from './BankuaiPage.tsx'
import BannedUserListPage from './BannedUserListPage.tsx'
import BlockedUserListPage from './BlockedUserListPage.tsx'
import BlockedWordListPage from './BlockedWordListPage.tsx'
import CategoryListPage from './CategoryListPage.tsx'
import EditPage from './EditPage.tsx'
import FeedPage from './FeedPage.tsx'
import InvitePage from './InvitePage.tsx'
import MessagePage from './MessagePage.tsx'
import NotFoundPage from './NotFoundPage.tsx'
import OAuthAuthorizationManagePage from './OAuthAuthorizationManagePage.tsx'
import OAuthAuthorizePage from './OAuthAuthorizePage.tsx'
import OAuthClientListPage from './OAuthClientListPage.tsx'
import RoleManagePage from './RoleManagePage.tsx'
import SigninPage from './SigninPage.tsx'
import SignupPage from './SignupPage.tsx'
import SiteListPage from './SiteListPage.tsx'
import SubmitPage from './SubmitPage.tsx'
import TrashPage from './TrashPage.tsx'
import UserListPage from './UserListPage.tsx'
import UserPage from './UserPage.tsx'
import UserProfileSettingsPage from './UserProfileSettingsPage.tsx'
import { getSiteWithFrontId } from './api/site.ts'
import { PermissionAction, PermissionModule } from './constants/types.ts'
import { isLogined, useAuthedUserStore, useSiteStore } from './state/global.ts'

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
          return redirect(`/${siteFrontId}`)
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

const checkSiteFeedAuth = ({ params }: { params: { siteFrontId?: string } }) => {
  const authState = useAuthedUserStore.getState()
  if (!authState.isLogined()) {
    return redirect(`/${params.siteFrontId}/all`)
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
        return redirect(`/${siteFrontId}`)
      } else {
        return redirect('/')
      }
    }

    return null
  }

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: FeedPage,
    loader: checkHomepageAuth,
  },
  {
    path: '/all',
    Component: BankuaiPage,
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
    loader: () => redirect('/settings/profile'),
  },
  {
    path: '/settings/profile',
    Component: UserProfileSettingsPage,
    loader: mustAuthed,
  },
  {
    path: '/settings/authorizations',
    Component: OAuthAuthorizationManagePage,
    loader: mustAuthed,
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
  {
    path: '/:siteFrontId',
    loader: async ({ params }) => {
      if (!params.siteFrontId) {
        return redirect('/')
      }

      try {
        const { code, data: site } = await getSiteWithFrontId(
          params.siteFrontId
        )

        if (code || !site) {
          return null
        }

        if (site.homePage == '/') {
          return redirect(`/${params.siteFrontId}/feed`)
        }
        return redirect(`/${params.siteFrontId}${site.homePage}`)
      } catch (err) {
        console.error('error in /:siteFrontId route: ', err)
        return null
      }
    },
    Component: BankuaiPage,
  },
  {
    path: '/:siteFrontId/feed',
    Component: FeedPage,
    loader: checkSiteFeedAuth,
  },
  {
    path: '/:siteFrontId/all',
    Component: BankuaiPage,
  },
  {
    path: '/:siteFrontId/bankuai',
    Component: CategoryListPage,
  },
  {
    path: '/:siteFrontId/submit',
    Component: SubmitPage,
    loader: needPermission('article', 'create'),
  },
  {
    path: '/:siteFrontId/bankuai/:categoryFrontId',
    Component: BankuaiPage,
  },
  {
    path: '/:siteFrontId/b/:categoryFrontId',
    Component: BankuaiPage,
  },
  {
    path: '/:siteFrontId/articles/:articleId',
    Component: ArticlePage,
  },
  {
    path: '/:siteFrontId/articles/:articleId/edit',
    Component: EditPage,
    loader: somePermissions(
      ['article', 'edit_mine'],
      ['article', 'edit_others']
    ),
  },
  {
    path: '/:siteFrontId/manage/users',
    Component: UserListPage,
    loader: needPermission('user', 'manage'),
  },
  {
    path: '/:siteFrontId/manage/blocklist',
    Component: BlockedUserListPage,
    loader: needPermission('user', 'manage'),
  },
  {
    path: '/:siteFrontId/manage/roles',
    Component: RoleManagePage,
    loader: needPermission('role', 'manage'),
  },
  {
    path: '/:siteFrontId/manage/activities',
    Component: ActivityPage,
    loader: needPermission('activity', 'access'),
  },
  {
    path: '/:siteFrontId/manage/article_review',
    Component: ArticleReviewPage,
    loader: needPermission('article', 'review'),
  },
  {
    path: '/:siteFrontId/manage/blocked_words',
    Component: BlockedWordListPage,
    loader: needPermission('site', 'manage'),
  },
  {
    path: '*',
    Component: NotFoundPage,
  },
]
