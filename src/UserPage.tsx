import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { cn, getArticleStatusName, renderMD } from '@/lib/utils'

import { Badge } from './components/ui/badge'
import { Card } from './components/ui/card'
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'

import BAvatar from './components/base/BAvatar'
import BContainer from './components/base/BContainer'

import { ActivityList } from './components/ActivityList'
import ArticleControls from './components/ArticleControls'
import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'
import UserDetailCard from './components/UserDetailCard'

import { DEFAULT_PAGE_SIZE } from '@/constants/constants'

import { getArticleList } from './api/article'
import { getUser, getUserActivityList, getUserPunishedList } from './api/user'
import { ARTICLE_STATUS_COLOR_MAP } from './constants/maps'
import i18n from './i18n'
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { genArticlePath, noop } from './lib/utils'
import {
  useAuthedUserStore,
  useLoading,
  useNotFoundStore,
} from './state/global'
import {
  Activity,
  ActivityListResponse,
  Article,
  ArticleListSort,
  ArticleListState,
  ArticleListType,
  FrontCategory,
  ResponseData,
  UserData,
} from './types/types'

type UserTab = Exclude<ArticleListType, 'deleted'> | 'activity' | 'violation'

const tabMapData = (tab: UserTab) => {
  switch (tab) {
    case 'all':
      return i18n.t('all')
    case 'reply':
      return i18n.t('reply')
    case 'article':
      return i18n.t('post')
    case 'saved':
      return i18n.t('saved')
    case 'subscribed':
      return i18n.t('subscribed')
    case 'vote_up':
      return i18n.t('voted')
    case 'activity':
      return i18n.t('operationLog')
    case 'violation':
      return i18n.t('violationLog')
  }
}

const defaultTabs: UserTab[] = ['all', 'article', 'reply']
const authedTabs: UserTab[] = ['saved', 'vote_up', 'subscribed']

type ActivityTab = 'all' | 'manage' | 'user'
type ActivityTabMap = {
  [key in ActivityTab]: string
}

/* type EditableRole = 'common_user' | 'moderator' | 'admin' */

const defaultActSubTabs: ActivityTab[] = ['user']
const activityTabMap: ActivityTabMap = {
  all: i18n.t('all'),
  manage: i18n.t('managementLog'),
  user: i18n.t('userActivityLog'),
}

interface ArticleListProps {
  list: Article[]
  tab: UserTab
  pageState: ArticleListState
  onSuccess?: () => void
}

const ArticleList: React.FC<ArticleListProps> = ({
  list,
  tab,
  pageState,
  onSuccess = noop,
}) => {
  const isMySelf = useAuthedUserStore((state) => state.isMySelf)
  const checkPermit = useAuthedUserStore((state) => state.permit)

  return list.length == 0 ? (
    <Empty />
  ) : (
    <>
      {list.map((item) => (
        <Card
          key={item.id}
          className="p-3 my-2 hover:bg-slate-50 dark:hover:bg-slate-900"
        >
          <div className="mb-3">
            <div className="mb-1">
              <Link className="mr-2" to={genArticlePath(item)}>
                {item.displayTitle}
              </Link>
            </div>

            {(isMySelf(item.authorId) || checkPermit('article', 'manage')) &&
              item.status != 'published' && (
                <div className="py-1">
                  <Badge
                    variant={'secondary'}
                    className={cn(ARTICLE_STATUS_COLOR_MAP[item.status] || '')}
                  >
                    {getArticleStatusName(item.status) || '-'}
                  </Badge>
                </div>
              )}

            {item.replyToId != '0' && (
              <div
                className="max-h-5 mb-1 overflow-hidden text-sm text-gray-600 text-nowrap text-ellipsis"
                dangerouslySetInnerHTML={{ __html: renderMD(item.content) }}
              ></div>
            )}
          </div>
          <ArticleControls
            article={item}
            ctype="list"
            bookmark={tab == 'saved'}
            notify={tab == 'subscribed'}
            onSuccess={onSuccess}
          />
        </Card>
      ))}
      <ListPagination pageState={pageState} />
    </>
  )
}

export default function UserPage() {
  /* const [loading, setLoading] = useState(true) */
  /* const [loadingList, setLoadingList] = useState(true) */
  const [user, setUser] = useState<UserData | null>(null)
  const [tabs, setTabs] = useState<UserTab[]>([...defaultTabs])
  /* const [tab, setTab] = useState<UserTab>('activity') */
  const [list, updateList] = useState<Article[]>([])
  const [actList, updateActList] = useState<Activity[]>([])
  const [pageState, setPageState] = useState<ArticleListState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const { setLoading } = useLoading()

  const [actSubTabs, setActSubTabs] = useState<ActivityTab[]>([
    ...defaultActSubTabs,
  ])

  const authStore = useAuthedUserStore()

  const { updateNotFound } = useNotFoundStore()
  const { t } = useTranslation()

  const [params, setParams] = useSearchParams()
  const { username, siteFrontId } = useParams()

  const managePermitted = useMemo(() => {
    if (user) {
      return (
        user.permissions?.some((item) => item.frontId == 'manage.access') ||
        false
      )
    }
    return false
  }, [user])

  const tab = (params.get('tab') as UserTab | null) || 'all'
  const actType = (params.get('act_type') as ActivityTab | null) || 'user'

  const fetchUserData = toSync(
    useCallback(
      async (showLoading: boolean) => {
        try {
          if (!username) {
            /* redirect('/404') */
            updateNotFound(true)
            return
          }

          if (showLoading) setLoading(true)
          const resp = await getUser(
            username,
            {},
            { showNotFound: true, siteFrontId }
          )

          if (!resp.code) {
            /* console.log('user data: ', resp.data) */
            setUser(resp.data)
          }
        } catch (err) {
          console.error('fetch user data error:', err)
        } finally {
          setLoading(false)
        }
      },
      [username, siteFrontId, updateNotFound]
    )
  )

  const fetchList = toSync(
    useCallback(async () => {
      try {
        const page = Number(params.get('page')) || 1
        const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE
        const sort = (params.get('sort') as ArticleListSort | null) || 'latest'

        setLoading(true)

        if (tab != 'activity' && tab != 'violation') {
          const resp = await getArticleList(
            page,
            pageSize,
            sort,
            '',
            username,
            tab || 'all',
            '',
            ['pending', 'rejected', 'published'],
            { siteFrontId }
          )

          if (!resp.code) {
            /* console.log('article list: ', resp.data) */
            const { data } = resp
            let category: FrontCategory | undefined
            if (data.category) {
              const { frontId, name, describe } = data.category
              category = { frontId, name, describe } as FrontCategory
            }

            if (data.articles) {
              updateList([...data.articles])
              setPageState({
                currPage: data.currPage,
                pageSize: data.pageSize,
                total: data.articleTotal,
                totalPage: data.totalPage,
                category,
              })
            } else {
              updateList([])
              setPageState({
                currPage: 1,
                pageSize: data.pageSize,
                total: 0,
                totalPage: 0,
                category,
              })
            }
          }
        } else {
          if (!username) return

          let resp: ResponseData<ActivityListResponse> | undefined

          if (tab == 'activity') {
            resp = await getUserActivityList(
              username,
              '',
              actType == 'all' ? undefined : actType,
              '',
              page,
              pageSize,
              { siteFrontId }
            )
          } else {
            resp = await getUserPunishedList(username)
          }

          if (!resp.code) {
            const { data } = resp
            if (data.list) {
              updateActList([...data.list])
              setPageState({
                currPage: data.page,
                pageSize: data.pageSize,
                total: data.total,
                totalPage: data.totalPage,
                category: undefined,
              })
            } else {
              updateActList([])
              setPageState({
                currPage: 1,
                pageSize: data.pageSize,
                total: 0,
                totalPage: 0,
                category: undefined,
              })
            }
          }
        }
      } catch (e) {
        console.error('get list error: ', e)
        updateList([])
        updateActList([])
        setPageState({
          currPage: 1,
          pageSize: DEFAULT_PAGE_SIZE,
          total: 0,
          totalPage: 0,
          category: undefined,
        })
      } finally {
        setLoading(false)
      }
    }, [params, tab, username, siteFrontId, actType, setLoading])
  )

  const onTabChange = (tab: string) => {
    setParams((prevParams) => {
      prevParams.delete('page')
      prevParams.set('tab', tab)
      return prevParams
    })
  }

  const onActTabChange = (tab: string) => {
    setParams((prevParams) => {
      prevParams.delete('page')
      prevParams.set('act_type', tab)
      return prevParams
    })
  }

  useEffect(() => {
    fetchUserData(true)
  }, [username])

  useEffect(() => {
    fetchList()
  }, [params])

  useEffect(() => {
    if (
      (authStore.isLogined() && authStore.username == username) ||
      authStore.permit('user', 'manage')
    ) {
      setTabs(() => [...defaultTabs, ...authedTabs])

      if (authStore.permit('user', 'access_activity')) {
        setTabs((state) => [...state, 'activity', 'violation'])
      }
    }

    if (authStore.permit('user', 'access_manage_activity')) {
      setActSubTabs(['user', 'manage', 'all'])
    }
  }, [authStore, username, user])

  return (
    <>
      <BContainer
        category={{
          isFront: true,
          frontId: 'userpage',
          name: `${username}`,
          describe: '',
        }}
      >
        {user && (
          <>
            {authStore.permit('user', 'manage') && (
              <UserDetailCard
                user={user}
                onSuccess={() => fetchUserData(false)}
              />
            )}
            <Card className="p-3 mb-4">
              <div className="flex mb-4">
                <BAvatar username={user.name} size={80} className="mr-4" />
                <div className="pt-5">
                  <div className="text-lg font-bold mb-2">{user.name}</div>
                  <div className="text-gray-500 text-sm">
                    {t('joinedAtTime', {
                      time: timeFmt(user.registeredAt, 'YYYY-M'),
                    })}
                  </div>
                </div>
              </div>
              <div className="text-sm">{user.introduction}</div>
            </Card>
            <Tabs defaultValue="oldest" value={tab} onValueChange={onTabChange}>
              <TabsList className="overflow-x-auto overflow-y-hidden max-w-full">
                {tabs.map((item) => (
                  <TabsTrigger value={item} key={item}>
                    {tabMapData(item)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {tab == 'activity' && managePermitted && (
              <Tabs
                defaultValue="user"
                value={actType}
                onValueChange={onActTabChange}
                className="mt-4"
              >
                <TabsList className="overflow-x-auto overflow-y-hidden max-w-full">
                  {actSubTabs.map((item) => (
                    <TabsTrigger value={item} key={item}>
                      {activityTabMap[item]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
          </>
        )}

        <div className="py-4" key={tab}>
          {tab == 'activity' || tab == 'violation' ? (
            <ActivityList list={actList} pageState={pageState} />
          ) : (
            <ArticleList
              list={list}
              tab={tab}
              pageState={pageState}
              onSuccess={() => fetchList()}
            />
          )}
        </div>
      </BContainer>
    </>
  )
}
