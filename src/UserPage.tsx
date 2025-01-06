import { zodResolver } from '@hookform/resolvers/zod'
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'
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
import { getRoles } from './api/role'
import {
  banUser,
  getUser,
  getUserActivityList,
  getUserPunishedList,
  setUserRole,
  unBanUser,
} from './api/user'
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { cn, formatMinutes, getPermissionName, noop } from './lib/utils'
import {
  useAlertDialogStore,
  useAuthedUserStore,
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
  Role,
  UserData,
} from './types/types'

type UserTab = Exclude<ArticleListType, 'deleted'> | 'activity' | 'violation'

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
  violation: '违规记录',
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
  all: '全部',
  manage: '管理行为',
  user: '用户行为',
}

const roleEditScheme = z.object({
  roleFrontId: z.string().min(1, '请选择角色'),
  remark: z.string(),
})

type RoleEditScheme = z.infer<typeof roleEditScheme>

const defaultRoleEditData: RoleEditScheme = {
  roleFrontId: 'common_user',
  remark: '',
}

const banScheme = z.object({
  reason: z.string().min(1, '请输入封禁原因'),
  duration: z.string().min(1, '请输入封禁时长'), // seconds
})

type BanScheme = z.infer<typeof banScheme>

const defaultBanData: BanScheme = {
  reason: '',
  duration: '',
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

const banDays = [1, 2, 3, 4, 5, 6, 7, -1]
const banReasons = ['广告营销', '不友善', '违反法律法规', 'others']

interface BanCustomInputs {
  days: number
  hours: number
  minutes: number
}

const defaultBanCustomInputs: BanCustomInputs = {
  days: 0,
  hours: 0,
  minutes: 0,
}

interface EditableRolesMap {
  [x: string]: Role
}

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
    total: 0,
    totalPage: 0,
  })
  const [alertOpen, setAlertOpen] = useState(false)
  const [banOpen, setBanOpen] = useState(false)

  /* const [editableRoles, setEditableRoles] = useState<EditableRole[]>([
   *   'common_user',
   * ]) */

  const [editableRoles, setEditableRoles] = useState<Role[]>([])

  const [actSubTabs, setActSubTabs] = useState<ActivityTab[]>([
    ...defaultActSubTabs,
  ])

  const [banCustom, setBanCustom] = useState<BanCustomInputs>({
    ...defaultBanCustomInputs,
  })
  const [otherReason, setOtherReason] = useState('')

  const authStore = useAuthedUserStore()

  const { updateNotFound } = useNotFoundStore()

  const [params, setParams] = useSearchParams()
  const { username } = useParams()

  const alertDialog = useAlertDialogStore()

  const editableRolesMap = useMemo(
    () =>
      editableRoles.reduce<EditableRolesMap>((obj, item) => {
        obj[item.frontId] = item
        return obj
      }, {}),
    [editableRoles]
  )

  const form = useForm<RoleEditScheme>({
    resolver: zodResolver(roleEditScheme),
    defaultValues: {
      ...defaultRoleEditData,
    },
  })

  const formVals = form.watch()
  const selectedPermissions = useMemo(
    () => editableRolesMap[formVals.roleFrontId]?.permissions || [],
    [editableRolesMap, formVals]
  )

  const banForm = useForm<BanScheme>({
    resolver: zodResolver(banScheme),
    defaultValues: {
      ...defaultBanData,
    },
  })

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

          if (tab != 'activity' && tab != 'violation') {
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
                pageSize
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
        } finally {
          setLoadingList(false)
        }
      },
      [params, tab, username]
    )
  )

  const fetchEditableRoles = toSync(
    useCallback(async () => {
      if (!authStore.isLogined()) return
      const { code, data } = await getRoles()
      if (!code && data.list) {
        setEditableRoles([...data.list])
      } else {
        setEditableRoles([])
      }
    }, [authStore])
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

  const onCancelRoleUpdate = () => {
    setAlertOpen(false)
  }

  const onUpdateRole = useCallback(
    async ({ roleFrontId, remark }: RoleEditScheme) => {
      try {
        if (!username) return

        console.log('role front id: ', roleFrontId)

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

  const onCancelBanAlert = () => {
    setBanOpen(false)
  }

  const onBanSubmit = useCallback(
    async ({ duration, reason }: BanScheme) => {
      const durationVal =
        duration == 'custom'
          ? banCustom.days * 24 * 60 + banCustom.hours * 60 + banCustom.minutes
          : Number(duration) * 24 * 60

      const reasonVal = reason == 'others' ? otherReason : reason

      if (!durationVal || durationVal < -1) {
        banForm.setError('duration', { message: '数据有误' })
        return
      }

      if (!reasonVal.trim()) {
        banForm.setError('reason', { message: '请输入封禁原因' })
        return
      }

      /* console.log('durationVal', durationVal)
       * console.log('reasonVal', reasonVal) */

      try {
        if (!username) return

        const resp = await banUser(username, durationVal, reasonVal)
        if (!resp.code) {
          setBanOpen(false)
          banForm.reset({ duration: '1', reason: '' })
          fetchUserData(false)
        }
      } catch (err) {
        console.error('ban user error: ', err)
      }
    },
    [banForm, banCustom, otherReason, username]
  )

  const onUnbanClick = useCallback(async () => {
    try {
      if (!username) return

      const confirmed = await alertDialog.confirm(
        '确认',
        `确定解封 ${username} ？`
      )
      if (confirmed) {
        const resp = await unBanUser(username)
        if (!resp.code) {
          fetchUserData(false)
        }
      }
    } catch (err) {
      console.error('unban user error: ', err)
    }
  }, [username])

  const onBanInputFocus = useCallback(
    () => banForm.setValue('duration', 'custom'),
    [banForm]
  )

  const onBanInputChange = useCallback(
    (inputType: keyof BanCustomInputs) => {
      return (e: ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10)
        if (!val || val < 1) {
          banForm.setError('duration', {
            message: '数据有误',
          })
          return
        }
        setBanCustom((state) => ({ ...state, [inputType]: val }))

        banForm.setValue('duration', 'custom')
      }
    },
    [banForm]
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
        setTabs((state) => [...state, 'activity', 'violation'])
      }
    }

    if (authStore.permit('user', 'access_manage_activity')) {
      setActSubTabs(['user', 'manage', 'all'])
    }

    fetchEditableRoles()
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
                <div className="table mt-4 w-full">
                  <div className="table-row">
                    <b className="table-cell py-2 w-24">邮箱：</b>
                    <span className="table-cell py-2">{user.email}</span>
                  </div>
                  <div className="table-row">
                    <b className="table-cell py-2">角色：</b>
                    <div className="table-cell py-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          user.roleFrontId == 'banned_user'
                            ? 'border-red-500'
                            : '',
                          'font-normal'
                        )}
                      >
                        {user.roleName}
                      </Badge>
                      {user.banned && (
                        <div className="bg-gray-100 text-sm mt-2 p-2 leading-6">
                          封禁于 {timeFmt(user.bannedStartAt, 'YYYY-M-D h:m:s')}
                          <br />
                          封禁时长：
                          {user.bannedMinutes == -1
                            ? '永久'
                            : formatMinutes(user.bannedMinutes)}
                          <br />
                          总封禁次数：
                          {user.bannedCount} 次 <br />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="table-row">
                    <b className="table-cell py-2">权限级别：</b>{' '}
                    {user.role.level}
                  </div>
                  <div className="table-row">
                    {authStore.levelCompare(user.role) < 1 && (
                      <>
                        <b className="table-cell py-2">权限：</b>
                        <div className="table-cell py-2">
                          {user.permissions
                            ? user.permissions.map((item) => (
                                <Badge
                                  variant="outline"
                                  className="mr-1 mb-1 font-normal"
                                  key={item.frontId}
                                >
                                  {getPermissionName(item.frontId) || ''}
                                </Badge>
                              ))
                            : '-'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <hr className="my-4" />
                <div className="flex justify-between">
                  <div></div>
                  {authStore.levelCompare(user.role) < 0 && (
                    <div>
                      {!user.banned && (
                        <Button
                          variant="outline"
                          onClick={() => setAlertOpen(true)}
                        >
                          更新角色
                        </Button>
                      )}

                      {user.banned ? (
                        <Button
                          variant="outline"
                          className="ml-2"
                          onClick={onUnbanClick}
                        >
                          解封
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="ml-2"
                          onClick={() => setBanOpen(true)}
                        >
                          封禁
                        </Button>
                      )}
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
          ) : tab == 'activity' || tab == 'violation' ? (
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
            </AlertDialogHeader>
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
                          className="flex flex-wrap"
                        >
                          {editableRoles.map((item) => (
                            <FormItem
                              className="flex items-center space-y-0 mr-2 mb-2"
                              key={item.frontId}
                            >
                              <FormControl>
                                <RadioGroupItem
                                  value={item.frontId}
                                  className="mr-1"
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {item.name}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                ></FormField>

                <div className="p-2 mb-2 border-[1px] rounded-sm bg-white text-sm text-gray-500">
                  {selectedPermissions.length > 0 ? (
                    <>
                      <div className="mb-4">角色拥有权限：</div>
                      {selectedPermissions.map((item) => (
                        <Badge
                          variant="outline"
                          key={item.frontId}
                          className="mr-2 mb-2"
                        >
                          {getPermissionName(item.frontId)}
                        </Badge>
                      ))}
                    </>
                  ) : (
                    '所选角色没有任何权限'
                  )}
                </div>
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
            <AlertDialogFooter>
              <AlertDialogCancel onClick={onCancelRoleUpdate}>
                取消
              </AlertDialogCancel>
              <AlertDialogAction onClick={form.handleSubmit(onUpdateRole)}>
                确认
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          defaultOpen={false}
          open={banOpen}
          onOpenChange={setBanOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>封禁</AlertDialogTitle>
              <AlertDialogDescription>
                封禁用户 {user?.name}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Form {...banForm}>
              <form
                onSubmit={banForm.handleSubmit(onBanSubmit)}
                className="py-4 space-y-8"
              >
                <FormField
                  control={banForm.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>封禁时长</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue="1"
                          className="flex flex-wrap"
                          value={banForm.getValues('duration')}
                        >
                          {banDays.map((item) => (
                            <FormItem
                              className="flex items-center space-y-0 mr-4 mb-4"
                              key={item}
                            >
                              <FormControl>
                                <RadioGroupItem
                                  value={String(item)}
                                  className="mr-1"
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {item == -1 ? '永久' : item + ' 天'}
                              </FormLabel>
                            </FormItem>
                          ))}
                          <FormItem
                            className="flex items-center space-x-3 space-y-0"
                            key="custom"
                          >
                            <FormControl>
                              <RadioGroupItem value="custom" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              <Input
                                type="number"
                                pattern="/\d+/"
                                className="inline-block w-[80px]"
                                value={banCustom.days}
                                onFocus={onBanInputFocus}
                                onChange={onBanInputChange('days')}
                              />{' '}
                              天
                              <Input
                                type="number"
                                pattern="/\d+/"
                                className="inline-block w-[80px]"
                                value={banCustom.hours}
                                onFocus={onBanInputFocus}
                                onChange={onBanInputChange('hours')}
                              />{' '}
                              小时
                              <Input
                                type="number"
                                pattern="/\d+/"
                                className="inline-block w-[80px]"
                                value={banCustom.minutes}
                                onFocus={onBanInputFocus}
                                onChange={onBanInputChange('minutes')}
                              />{' '}
                              分
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={banForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>封禁原因</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue="广告营销"
                          className="flex flex-wrap"
                          value={banForm.getValues('reason')}
                        >
                          {banReasons.map((item) => (
                            <FormItem
                              className="flex items-center space-x-3 space-y-0 mr-4"
                              key={item}
                            >
                              <FormControl>
                                <RadioGroupItem value={item} />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {item == 'others' ? '其他' : item}
                              </FormLabel>
                            </FormItem>
                          ))}
                          {banForm.getValues('reason') == 'others' && (
                            <Input
                              placeholder="请填写其他原因"
                              className="mt-4"
                              onChange={(e) => setOtherReason(e.target.value)}
                            />
                          )}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={onCancelBanAlert}>
                取消
              </AlertDialogCancel>
              <AlertDialogAction onClick={banForm.handleSubmit(onBanSubmit)}>
                确认
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </BContainer>
    </>
  )
}
