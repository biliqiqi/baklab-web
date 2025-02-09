import { RouteObject, redirect, replace } from 'react-router-dom'

import ActivityPage from './ActivityPage.tsx'
import ArticleListPage from './ArticleListPage.tsx'
import ArticlePage from './ArticlePage.tsx'
import BannedUserListPage from './BannedUserListPage.tsx'
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
import { isLogined, useAuthedUserStore } from './state/global.ts'

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

const mustAuthed = ({ request }: { request: Request }) => {
  const data = useAuthedUserStore.getState()
  const authed = !!data && isLogined(data)

  if (!authed) {
    return redirectToSignin(request.url)
  }
  return null
}

const needPermission =
  <T extends PermissionModule>(module: T, action: PermissionAction<T>) =>
  ({ request }: { request: Request }) => {
    const authState = useAuthedUserStore.getState()

    if (!authState.isLogined()) {
      return redirectToSignin(request.url)
    }

    if (!authState.permit(module, action)) {
      return redirect('/')
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
        // TODO 分类列表
        path: 'categories',
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
    children: [
      /* {
       *   path: 'manage',
       *   loader: needPermission('manage', 'access'),
       *   children: [
       *     {
       *       path: '',
       *       loader: () => redirect('/manage/activities'),
       *     },
       *     {
       *       path: 'activities',
       *       Component: ActivityPage,
       *       loader: needPermission('activity', 'access'),
       *     },
       *     {
       *       path: 'trash',
       *       Component: TrashPage,
       *     },
       *     {
       *       path: 'users',
       *       Component: UserListPage,
       *       loader: needPermission('user', 'manage'),
       *     },
       *     {
       *       path: 'blocklist',
       *     },
       *     {
       *       path: 'roles',
       *       Component: RoleManagePage,
       *       loader: needPermission('role', 'access'),
       *     },
       *   ],
       * }, */
    ],
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
    loader: mustAuthed,
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
  },
  {
    path: '*',
    Component: NotFoundPage,
  },
]
