import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { Card } from './components/ui/card'
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'

import BAvatar from './components/base/BAvatar'
import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'

import { ActivityList } from './components/ActivityList'
import ArticleControls from './components/ArticleControls'
import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'

import { DEFAULT_PAGE_SIZE } from '@/constants/constants'

import { getActivityList } from './api'
import { getArticleList } from './api/article'
import { getUser } from './api/user'
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { noop } from './lib/utils'
import { useAuthedUserStore, useNotFoundStore } from './state/global'
import {
  Activity,
  Article,
  ArticleListSort,
  ArticleListState,
  ArticleListType,
  FrontCategory,
  UserData,
} from './types/types'

type UserTab = Exclude<ArticleListType, 'deleted'> | 'activity'

type UserTabMap = {
  [key in UserTab]: string
}

const tabMapData: UserTabMap = {
  all: '全部',
  reply: '回复',
  article: '帖子',
  saved: '已保存',
  subscribed: '已订阅',
  vote_up: '已投票',
  activity: '操作记录',
}

const defaultTabs: UserTab[] = ['all', 'article', 'reply']
const authedTabs: UserTab[] = ['saved', 'vote_up', 'subscribed']

type ActivityTab = 'all' | 'manage'
type ActivityTabMap = {
  [key in ActivityTab]: string
}

const activitySubTabs: ActivityTab[] = ['all', 'manage']
const activityTabMap: ActivityTabMap = {
  all: '全部',
  manage: '管理',
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
}) =>
  list.length == 0 ? (
    <Empty />
  ) : (
    <>
      {list.map((item) => (
        <Card key={item.id} className="p-3 my-2 hover:bg-slate-50">
          <div className="mb-3">
            <div className="mb-1">
              <Link className="mr-2" to={'/articles/' + item.id}>
                {item.displayTitle}
              </Link>
            </div>
            {item.replyToId != '0' && (
              <div className="max-h-5 mb-1 overflow-hidden text-sm text-gray-600 text-nowrap text-ellipsis">
                {item.content}
              </div>
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

export default function UserPage() {
  const [loading, setLoading] = useState(true)
  const [loadingList, setLoadingList] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [tabs, setTabs] = useState<UserTab[]>([...defaultTabs])
  /* const [tab, setTab] = useState<UserTab>('activity') */
  const [list, updateList] = useState<Article[]>([])
  const [actList, updateActList] = useState<Activity[]>([])
  const [pageState, setPageState] = useState<ArticleListState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalCount: 0,
    totalPage: 0,
  })

  const authStore = useAuthedUserStore()

  const { updateNotFound } = useNotFoundStore()

  const [params, setParams] = useSearchParams()
  const { username } = useParams()

  const managePermitted = useMemo(() => {
    if (user) {
      return user.permissions.some((item) => item.frontId == 'manage.access')
    }
    return false
  }, [user])

  const tab = (params.get('tab') as UserTab | null) || 'all'
  const actType = (params.get('act_type') as ActivityTab | null) || 'all'

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
          const resp = await getUser(username, {}, { showNotFound: true })

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
      [username]
    )
  )

  const fetchList = toSync(
    useCallback(
      async (showLoading: boolean = false) => {
        try {
          const page = Number(params.get('page')) || 1
          const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE
          const sort =
            (params.get('sort') as ArticleListSort | null) || 'latest'

          if (showLoading) setLoadingList(true)

          if (tab != 'activity') {
            const resp = await getArticleList(
              page,
              pageSize,
              sort,
              '',
              username,
              tab || 'all'
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
                  totalCount: data.articleTotal,
                  totalPage: data.totalPage,
                  category,
                })
              } else {
                updateList([])
                setPageState({
                  currPage: 1,
                  pageSize: data.pageSize,
                  totalCount: 0,
                  totalPage: 0,
                  category,
                })
              }
            }
          } else {
            const resp = await getActivityList(
              '',
              username,
              actType == 'all' ? undefined : actType,
              '',
              page,
              pageSize
            )
            if (!resp.code) {
              const { data } = resp
              if (data.list) {
                updateActList([...data.list])
                setPageState({
                  currPage: data.page,
                  pageSize: data.pageSize,
                  totalCount: data.total,
                  totalPage: data.totalPage,
                  category: undefined,
                })
              } else {
                setPageState({
                  currPage: 1,
                  pageSize: data.pageSize,
                  totalCount: 0,
                  totalPage: 0,
                  category: undefined,
                })
              }
            }
          }
        } catch (e) {
          console.error('get list error: ', e)
        } finally {
          setLoadingList(false)
        }
      },
      [params, tab, username]
    )
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
    fetchList(false)
  }, [params])

  useEffect(() => {
    if (
      (authStore.isLogined() && authStore.username == username) ||
      authStore.permit('user', 'manage')
    ) {
      setTabs(() => [...defaultTabs, ...authedTabs])

      if (authStore.permit('user', 'access_activity')) {
        setTabs((state) => [...state, 'activity'])
      }
    }
  }, [authStore, username])

  return (
    <>
      <BContainer
        category={{
          isFront: true,
          frontId: 'userpage',
          name: `${username} 的个人主页`,
          describe: '',
        }}
      >
        {!loading && user && (
          <>
            <Card className="p-3 mb-4">
              <div className="flex mb-4">
                <BAvatar username={user.name} size={80} className="mr-4" />
                <div className="pt-5">
                  <div className="text-lg font-bold mb-2">{user.name}</div>
                  <div className="text-gray-500 text-sm">
                    加入于 {timeFmt(user.registeredAt, 'YYYY-M')}
                  </div>
                </div>
              </div>
              <div className="text-sm">{user.introduction}</div>
            </Card>
            <Tabs defaultValue="oldest" value={tab} onValueChange={onTabChange}>
              <TabsList className="overflow-x-auto overflow-y-hidden max-w-full">
                {tabs.map((item) => (
                  <TabsTrigger value={item} key={item}>
                    {tabMapData[item]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {tab == 'activity' && managePermitted && (
              <Tabs
                defaultValue="all"
                value={actType}
                onValueChange={onActTabChange}
                className="mt-4"
              >
                <TabsList className="overflow-x-auto overflow-y-hidden max-w-full">
                  {activitySubTabs.map((item) => (
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
          {loadingList ? (
            <div className="flex justify-center">
              <BLoader />
            </div>
          ) : tab == 'activity' ? (
            <ActivityList list={actList} pageState={pageState} />
          ) : (
            <ArticleList
              list={list}
              tab={tab}
              pageState={pageState}
              onSuccess={() => fetchList(false)}
            />
          )}
        </div>
      </BContainer>
    </>
  )
}
