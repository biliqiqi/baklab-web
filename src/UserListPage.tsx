import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Input } from './components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select'

import BAvatar from './components/base/BAvatar'
import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'

import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'

import { getUserList } from './api/user'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { cn } from './lib/utils'
import { ListPageState, UserData } from './types/types'

interface SearchFields {
  keywords?: string
  role?: string
}

const defaultSearchData: SearchFields = {
  keywords: '',
  role: '',
}

export default function UserListPage() {
  const [loading, setLoading] = useState(false)
  const [list, setList] = useState<UserData[]>([])
  const [params, setParams] = useSearchParams()
  const location = useLocation()

  const [pageState, setPageState] = useState<ListPageState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const [searchData, setSearchData] = useState<SearchFields>({
    ...defaultSearchData,
    keywords: params.get('keywords') || '',
    role: params.get('role') || '',
  })

  const resetParams = useCallback(() => {
    setParams((params) => {
      params.delete('page')
      params.delete('pageSize')
      params.delete('keywords')
      params.delete('role')
      return params
    })
  }, [params])

  const fetchUserList = toSync(
    useCallback(
      async (showLoading = false) => {
        try {
          if (showLoading) {
            setLoading(true)
          }
          const page = Number(params.get('page')) || 1
          const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE
          const keywords = params.get('keywords') || ''
          const role = params.get('role') || ''

          const resp = await getUserList(page, pageSize, keywords, role)
          if (!resp.code) {
            const { data } = resp
            if (data.list) {
              setList([...data.list])
              setPageState({
                currPage: data.page,
                pageSize: data.pageSize,
                total: data.total,
                totalPage: data.totalPage,
              })
            } else {
              setList([])
              setPageState({
                currPage: 1,
                pageSize: data.pageSize,
                total: 0,
                totalPage: 0,
              })
            }
          }
        } catch (err) {
          console.error('get user list error: ', err)
        } finally {
          setLoading(false)
        }
      },
      [params]
    )
  )

  const onResetClick = useCallback(() => {
    setSearchData({ ...defaultSearchData })
    resetParams()
  }, [params])

  const onSearchClick = useCallback(() => {
    resetParams()
    setParams((params) => {
      const { keywords, role } = searchData
      if (keywords) {
        params.set('keywords', keywords)
      }

      if (role) {
        params.set('role', role)
      }

      return params
    })
  }, [params, searchData])

  useEffect(() => {
    fetchUserList(true)
  }, [location])

  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'users',
        name: '用户列表',
        describe: '全部用户',
      }}
    >
      <Card className="flex flex-wrap justify-between p-2">
        <div className="flex flex-wrap">
          <Input
            placeholder="用户名"
            className="w-[140px] h-[36px] mr-3"
            value={searchData.keywords}
            onChange={(e) =>
              setSearchData((state) => ({
                ...state,
                keywords: e.target.value,
              }))
            }
          />
          <Select
            value={searchData.role}
            onValueChange={(role) =>
              setSearchData((state) => ({ ...state, role }))
            }
          >
            <SelectTrigger
              className={cn(
                'w-[140px] h-[36px] mr-3 bg-white',
                !searchData.role && 'text-gray-500'
              )}
            >
              <SelectValue placeholder="角色" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="common_user">普通用户</SelectItem>
              <SelectItem value="banned_user">被封用户</SelectItem>
              <SelectItem value="moderator">版主</SelectItem>
              <SelectItem value="admin">管理员</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Button size="sm" onClick={onResetClick} className="mr-3">
            重置
          </Button>
          <Button size="sm" onClick={onSearchClick}>
            搜索
          </Button>
        </div>
      </Card>

      {loading && (
        <div className="flex justify-center">
          <BLoader />
        </div>
      )}

      {list.length == 0 ? (
        <Empty />
      ) : (
        <div className="flex flex-wrap">
          {list.map((item) => (
            <div
              className="w-[50%] flex-shrink-0 p-2 even:pr-0 odd:pl-0"
              key={item.id}
            >
              <Card className="p-3 hover:bg-slate-50">
                <div className="flex">
                  <Link to={'/users/' + item.name}>
                    <BAvatar username={item.name} className="mr-2" size={50} />
                  </Link>
                  <div className="space-y-1 text-sm">
                    <div>
                      <Link to={'/users/' + item.name}>{item.name}</Link>
                    </div>
                    <div className="text-gray-500">
                      加入于 {timeFmt(item.registeredAt, 'YYYY-M-D')}
                    </div>
                    <div>
                      <b>邮箱：</b>
                      <span>{item.email}</span>
                    </div>
                    <div>
                      <b>角色：</b>
                      <span
                        className={
                          item.roleFrontId == 'banned_user'
                            ? 'text-red-500'
                            : ''
                        }
                      >
                        {item.roleName}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {pageState.totalPage > 1 && <ListPagination pageState={pageState} />}
    </BContainer>
  )
}
