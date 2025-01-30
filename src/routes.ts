import { RouteObject, redirect, replace } from 'react-router-dom'

import ActivityPage from './ActivityPage.tsx'
import ArticleListPage from './ArticleListPage.tsx'
import ArticlePage from './ArticlePage.tsx'
import BannedUserListPage from './BannedUserListPage.tsx'
import CategoryListPage from './CategoryListPage.tsx'
import EditPage from './EditPage.tsx'
import MessagePage from './MessagePage.tsx'
import NotFoundPage from './NotFoundPage.tsx'
import RoleManagePage from './RoleManagePage.tsx'
import SigninPage from './SigninPage.tsx'
import SignupPage from './SignupPage.tsx'
import SubmitPage from './SubmitPage.tsx'
import TrashPage from './TrashPage.tsx'
import UserListPage from './UserListPage.tsx'
import UserPage from './UserPage.tsx'
import { PermissionAction, PermissionModule } from './constants/types.ts'
import {
  isLogined,
  useAuthedUserStore,
  useCategoryStore,
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
    path: '/:siteFrontId',
    loader: async ({ params }) => {
      if (!params.siteFrontId) {
        return redirect('/')
      }

      const siteStore = useSiteStore.getState()
      const cateStore = useCategoryStore.getState()
      const [site, _cateList] = await Promise.all([
        siteStore.fetchSiteData(params.siteFrontId),
        cateStore.fetchCategoryList(params.siteFrontId),
      ])

      if (!site) {
        return redirect('/')
      }

      if (site.homePage == '/') {
        return redirect(`/${params.siteFrontId}/feed`)
      }

      return redirect(`/${params.siteFrontId}${site.homePage}`)
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
    loader: needPermission('manage', 'access'),
    children: [
      {
        // TODO 站点列表
        path: 'sites',
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
        loader: needPermission('activity', 'access'),
      },
      {
        path: 'trash',
        Component: TrashPage,
      },
      {
        path: 'users',
        Component: UserListPage,
        loader: needPermission('user', 'manage'),
      },
      {
        path: 'banned_users',
        Component: BannedUserListPage,
        loader: needPermission('user', 'manage'),
      },
      {
        path: 'roles',
        Component: RoleManagePage,
        loader: needPermission('role', 'access'),
      },
    ],
  },
  {
    path: '*',
    Component: NotFoundPage,
  },
]
