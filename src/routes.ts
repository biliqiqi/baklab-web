import {
  LoaderFunction,
  RouteObject,
  redirect,
  replace,
} from 'react-router-dom'

import ActivityPage from './ActivityPage.tsx'
import ArticleListPage from './ArticleListPage.tsx'
import ArticlePage from './ArticlePage.tsx'
import { ArticleReviewPage } from './ArticleReviewPage.tsx'
import BannedUserListPage from './BannedUserListPage.tsx'
import BlockedUserListPage from './BlockedUserListPage.tsx'
import BlockedWordListPage from './BlockedWordListPage.tsx'
import CategoryListPage from './CategoryListPage.tsx'
import EditPage from './EditPage.tsx'
import InvitePage from './InvitePage.tsx'
import MessagePage from './MessagePage.tsx'
import NotFoundPage from './NotFoundPage.tsx'
import RoleManagePage from './RoleManagePage.tsx'
import SigninPage from './SigninPage.tsx'
import SignupPage from './SignupPage.tsx'
import SiteListPage from './SiteListPage.tsx'
import SubmitPage from './SubmitPage.tsx'
import TrashPage from './TrashPage.tsx'
import UserListPage from './UserListPage.tsx'
import UserPage from './UserPage.tsx'
import { getSiteWithFrontId } from './api/site.ts'
import { PermissionAction, PermissionModule } from './constants/types.ts'
import {
  ensureLogin,
  isLogined,
  useAuthedUserStore,
  useSiteStore,
} from './state/global.ts'
import { Site } from './types/types.ts'

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
  await ensureLogin()
  const authState = useAuthedUserStore.getState()
  if (!authState.isLogined()) {
    return redirectToSignin(request.url)
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
      const logined = await ensureLogin()

      const authState = useAuthedUserStore.getState()

      // console.log('logined: ', logined)
      if (!logined) {
        return redirectToSignin(request.url)
      }

      if (siteFrontId) {
        let site: Site | null | undefined = null
        const siteStore = useSiteStore.getState()
        site = siteStore.site
        if (!site) {
          site = await siteStore.fetchSiteData(siteFrontId)
        }

        // console.log('the site data: ', site)

        // if (site) {
        //   console.log(
        //     'route permision: ',
        //     authState.permitUnderSite(site, module, action)
        //   )
        // }

        if (!site || !authState.permitUnderSite(site, module, action)) {
          return redirect(`/${siteFrontId}`)
        }
      } else {
        if (!authState.permit(module, action)) {
          return redirect('/')
        }
      }
    } catch (err) {
      console.error('permission check error in router: ', err)
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
    Component: ArticleListPage,
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
    Component: ArticleListPage,
  },
  {
    path: '/:siteFrontId/feed',
    Component: ArticleListPage,
  },
  {
    path: '/:siteFrontId/categories',
    Component: CategoryListPage,
  },
  {
    path: '/:siteFrontId/submit',
    Component: SubmitPage,
    loader: needPermission('article', 'create'),
  },
  {
    path: '/:siteFrontId/categories/:categoryFrontId',
    Component: ArticleListPage,
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
