import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { z } from '@/lib/zod-custom'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './components/ui/alert-dialog'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardTitle } from './components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './components/ui/form'
import { Input } from './components/ui/input'
import { RadioGroup, RadioGroupItem } from './components/ui/radio-group'
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'

import BAvatar from './components/base/BAvatar'
import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'

import { ActivityList } from './components/ActivityList'
import ArticleControls from './components/ArticleControls'
import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'

import { DEFAULT_PAGE_SIZE } from '@/constants/constants'

import { getArticleList } from './api/article'
import { getUser, getUserActivityList, setUserRole } from './api/user'
import { ROLE_DATA } from './constants/roles'
import { Role } from './constants/types'
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { cn, getPermissionName, getRoleName, noop } from './lib/utils'
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

type ActivityTab = 'all' | 'manage' | 'user'
type ActivityTabMap = {
  [key in ActivityTab]: string
}

type EditableRole = 'common_user' | 'moderator' | 'admin'

const defaultActSubTabs: ActivityTab[] = ['user']
const activityTabMap: ActivityTabMap = {
  all: '全部',
  manage: '管理行为',
  user: '用户行为',
}

const roleEditScheme = z.object({
  roleFrontId: z.enum(['common_user', 'moderator', 'admin'], {
    errorMap: () => ({ message: '请选择角色' }),
  }),
  remark: z.string(),
})

const defaultRoleEditData: RoleEditScheme = {
  roleFrontId: 'common_user',
  remark: '',
}

type RoleEditScheme = z.infer<typeof roleEditScheme>

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
  const [alertOpen, setAlertOpen] = useState(false)

  const [editableRoles, setEditableRoles] = useState<EditableRole[]>([
    'common_user',
  ])

  const [actSubTabs, setActSubTabs] = useState<ActivityTab[]>([
    ...defaultActSubTabs,
  ])

  const authStore = useAuthedUserStore()

  const { updateNotFound } = useNotFoundStore()

  const [params, setParams] = useSearchParams()
  const { username } = useParams()

  const form = useForm<RoleEditScheme>({
    resolver: zodResolver(roleEditScheme),
    defaultValues: {
      ...defaultRoleEditData,
    },
  })

  const managePermitted = useMemo(() => {
    if (user) {
      return user.permissions.some((item) => item.frontId == 'manage.access')
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
            const resp = await getUserActivityList(
              username,
              '',
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
                updateActList([])
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

  const onChancelRoleUpdate = () => {
    setAlertOpen(false)
  }

  const onUpdateRole = useCallback(
    async ({ roleFrontId, remark }: RoleEditScheme) => {
      try {
        if (!username) return

        const resp = await setUserRole(username, roleFrontId, remark)
        if (!resp.code) {
          /* const {data} */
          form.reset({ ...defaultRoleEditData })
          setAlertOpen(false)
          toast.success('用户角色已更新')
          fetchUserData(false)
        }
      } catch (err) {
        console.error('confirm delete error: ', err)
      }
    },
    [username, user, form]
  )

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

    if (authStore.permit('user', 'set_moderator')) {
      setEditableRoles(['common_user', 'moderator'])
    }

    if (authStore.permit('user', 'set_admin')) {
      setEditableRoles(['common_user', 'moderator', 'admin'])
    }

    if (authStore.permit('user', 'access_manage_activity')) {
      setActSubTabs(['user', 'manage', 'all'])
    }

    console.log(
      'authStore.levelCompare(user.roleFrontId as Role)',
      authStore.levelCompare(user?.roleFrontId as Role)
    )
  }, [authStore, username, user])

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
            {authStore.permit('user', 'manage') && (
              <Card className="p-3 mb-4 rounded-0">
                <CardTitle>用户管理</CardTitle>
                <div className="space-y-4 mt-4">
                  <div>
                    <b>邮箱：</b>
                    {user.email}
                  </div>
                  <div>
                    <b>角色：</b>
                    <Badge
                      variant="outline"
                      className={cn(
                        user.roleFrontId == 'banned_user'
                          ? 'border-red-500'
                          : '',
                        'font-normal'
                      )}
                    >
                      {getRoleName(user.roleFrontId as Role)}
                    </Badge>
                  </div>
                  {authStore.levelCompare(user.roleFrontId as Role) < 1 && (
                    <div>
                      <b>权限：</b>
                      {user.permissions.map((item) => (
                        <Badge
                          variant="outline"
                          className="mr-1 mb-1 font-normal"
                          key={item.frontId}
                        >
                          {getPermissionName(item.frontId) || ''}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <hr className="my-4" />
                <div className="flex justify-between">
                  <div></div>
                  {authStore.levelCompare(user.roleFrontId as Role) < 0 && (
                    <div>
                      <Button
                        variant="outline"
                        onClick={() => setAlertOpen(true)}
                      >
                        更新角色
                      </Button>
                      <Button variant="outline" className="ml-2">
                        封禁
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}
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

        <AlertDialog
          defaultOpen={false}
          open={alertOpen}
          onOpenChange={setAlertOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>更新角色</AlertDialogTitle>
              <AlertDialogDescription>
                将用户 {user?.name} 的角色更新为
              </AlertDialogDescription>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onUpdateRole)}
                  className="py-4 space-y-8"
                >
                  <FormField
                    control={form.control}
                    name="roleFrontId"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={user?.roleFrontId}
                            className="flex space-x-4"
                          >
                            {editableRoles.map((item) => (
                              <FormItem
                                className="flex items-center space-x-3 space-y-0"
                                key={item}
                              >
                                <FormControl>
                                  <RadioGroupItem value={item} />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {ROLE_DATA[item].name}
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  ></FormField>
                  <FormField
                    control={form.control}
                    name="remark"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="备注" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  ></FormField>
                </form>
              </Form>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={onChancelRoleUpdate}>
                取消
              </AlertDialogCancel>
              <AlertDialogAction onClick={form.handleSubmit(onUpdateRole)}>
                确认
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </BContainer>
    </>
  )
}
