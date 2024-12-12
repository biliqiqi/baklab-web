import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { Badge } from './components/ui/badge'
import { Card } from './components/ui/card'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './components/ui/pagination'
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'

import BAvatar from './components/base/BAvatar'
import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'

import ArticleControls from './components/ArticleControls'

import { DEFAULT_PAGE_SIZE } from '@/constants/constants'

import { getArticleList } from './api/article'
import { getUser } from './api/user'
import { useAuth } from './hooks/use-auth'
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { useAuthedUserStore, useNotFoundStore } from './state/global'
import {
  Article,
  ArticleListSort,
  ArticleListState,
  ArticleListType,
  FrontCategory,
  UserData,
} from './types/types'

type UserTab = ArticleListType | 'activity'

type UserTabMap = {
  [key in UserTab]: string
}

const TabMapData: UserTabMap = {
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

export default function UserPage() {
  const [loading, setLoading] = useState(true)
  const [loadingList, setLoadingList] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [tabs, setTabs] = useState<UserTab[]>([...defaultTabs])
  /* const [tab, setTab] = useState<UserTab>('activity') */
  const [list, updateList] = useState<Article[]>([])
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

  const tab = (params.get('tab') as UserTab | null) || 'all'

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

  const fetchArticles = toSync(
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
                  totalCount: data.articleTotal,
                  totalPage: data.totalPage,
                  category,
                })
              }
            }
          }
        } catch (e) {
          console.error('get article list error: ', e)
        } finally {
          setLoadingList(false)
        }
      },
      [params, tab, username]
    )
  )

  const onTabChange = (tab: string) => {
    setParams((prevParams) => {
      prevParams.set('page', '1')
      prevParams.set('tab', tab)
      return prevParams
    })
  }

  const genParamStr = useCallback(
    (page: number) => {
      const cloneParams = new URLSearchParams(params.toString())
      cloneParams.set('page', page ? String(page) : '1')
      return cloneParams.toString()
    },
    [params]
  )

  useEffect(() => {
    fetchUserData(true)
  }, [username])

  useEffect(() => {
    if (tab == 'activity') {
      // TODO get activity
    } else {
      fetchArticles(false)
    }
  }, [username, params])

  useEffect(() => {
    if (authStore.isLogined() && authStore.username == username) {
      setTabs(() => [...defaultTabs, ...authedTabs])
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
              <TabsList>
                {tabs.map((item) => (
                  <TabsTrigger value={item} key={item}>
                    {TabMapData[item]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </>
        )}

        <div className="py-4" key={tab}>
          {loadingList ? (
            <div className="flex justify-center">
              <BLoader />
            </div>
          ) : list.length == 0 ? (
            <div className="flex justify-center">
              <Badge variant="secondary" className="text-gray-500">
                空空如也
              </Badge>
            </div>
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
                    onSuccess={() => fetchArticles(false)}
                  />
                </Card>
              ))}
              {pageState.totalPage > 1 && (
                <Card>
                  <Pagination className="py-1">
                    <PaginationContent>
                      {pageState.currPage > 1 && (
                        <PaginationItem>
                          <PaginationPrevious
                            to={'?' + genParamStr(pageState.currPage - 1)}
                          />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink
                          to={'?' + genParamStr(pageState.currPage)}
                          isActive
                        >
                          {pageState.currPage}
                        </PaginationLink>
                      </PaginationItem>
                      {pageState.currPage < pageState.totalPage && (
                        <PaginationItem>
                          <PaginationNext
                            to={'?' + genParamStr(pageState.currPage + 1)}
                          />
                        </PaginationItem>
                      )}
                    </PaginationContent>
                  </Pagination>
                </Card>
              )}
            </>
          )}
        </div>
      </BContainer>
    </>
  )
}
