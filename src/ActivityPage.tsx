import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'

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

import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'

import { ActivityList } from './components/ActivityList'

import { getActivityList } from './api'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { toSync } from './lib/fire-and-forget'
import { cn } from './lib/utils'
import { useAuthedUserStore } from './state/global'
import {
  Activity,
  ActivityActionType,
  ListPageState,
  OptionItem,
} from './types/types'

interface SearchFields {
  username?: string
  actType?: string
  action?: string
}

const defaultSearchData: SearchFields = {
  username: '',
  actType: '',
  action: '',
}

export default function ActivityPage() {
  const [loading, setLoading] = useState(false)
  const [list, updateActList] = useState<Activity[]>([])
  const [actionList, setActionList] = useState<OptionItem[]>([])
  const [pageState, setPageState] = useState<ListPageState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })
  const usernameRef = useRef<HTMLInputElement | null>(null)

  const { siteFrontId } = useParams()
  const [params, setParams] = useSearchParams()
  const location = useLocation()

  const authStore = useAuthedUserStore()

  const [searchData, setSearchData] = useState<SearchFields>({
    ...defaultSearchData,
    username: params.get('username') || '',
    actType: (params.get('actType') as ActivityActionType) || '',
    action: params.get('action') || '',
  })

  const resetParams = useCallback(() => {
    setParams((params) => {
      params.delete('page')
      params.delete('pageSize')
      params.delete('username')
      params.delete('act_type')
      params.delete('action')
      return params
    })
  }, [params])

  const fetchList = toSync(
    useCallback(
      async (showLoading: boolean = false) => {
        try {
          const page = Number(params.get('page')) || 1
          const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE
          const username = params.get('username') || ''
          let actType =
            (params.get('act_type') as ActivityActionType | null) || undefined
          const action = params.get('action') || ''

          if (!authStore.permit('activity', 'manage_platform')) {
            actType = 'manage'
          }

          if (showLoading) setLoading(true)
          const resp = await getActivityList(
            '',
            username,
            actType,
            action,
            page,
            pageSize,
            { siteFrontId }
          )
          if (!resp.code) {
            const { data } = resp
            if (data.acActionOptions) {
              setActionList([...data.acActionOptions])
            }

            if (data.list) {
              updateActList([...data.list])
              setPageState({
                currPage: data.page,
                pageSize: data.pageSize,
                total: data.total,
                totalPage: data.totalPage,
              })
            } else {
              updateActList([])
              setPageState({
                currPage: 1,
                pageSize: data.pageSize,
                total: 0,
                totalPage: 0,
              })
            }
          }
        } catch (e) {
          console.error('get list error: ', e)
        } finally {
          setLoading(false)
        }
      },
      [params, siteFrontId]
    )
  )

  const onResetClick = useCallback(() => {
    setSearchData({ ...defaultSearchData })
    resetParams()
  }, [params])

  const onSearchClick = useCallback(() => {
    resetParams()
    setParams((params) => {
      const { username, actType, action } = searchData
      if (username) {
        params.set('username', username)
      }

      if (actType) {
        params.set('act_type', actType)
      }

      if (action) {
        params.set('action', action)
      }
      return params
    })
  }, [params, searchData])

  useEffect(() => {
    fetchList(true)
  }, [location])

  return (
    <BContainer
      category={
        siteFrontId
          ? {
              isFront: true,
              frontId: 'site_activites',
              name: '管理日志',
              describe: '站点内管理行为记录',
            }
          : {
              isFront: true,
              frontId: 'activites',
              name: '活动记录',
              describe: '站点成员活动记录',
            }
      }
    >
      <Card className="flex flex-wrap justify-between p-2">
        <div className="flex flex-wrap">
          <Input
            placeholder="管理者用户名"
            className="w-[140px] h-[36px] mr-3"
            ref={usernameRef}
            value={searchData.username}
            onChange={() =>
              setSearchData((state) => ({
                ...state,
                username: usernameRef.current?.value || '',
              }))
            }
          />
          {authStore.permit('activity', 'manage_platform') && (
            <Select
              value={searchData.actType}
              onValueChange={(actType) =>
                setSearchData((state) => ({ ...state, actType }))
              }
            >
              <SelectTrigger
                className={cn(
                  'w-[140px] h-[36px] mr-3 bg-white',
                  !searchData.actType && 'text-gray-500'
                )}
              >
                <SelectValue placeholder="操作类别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">普通用户</SelectItem>
                <SelectItem value="manage">管理</SelectItem>
                {authStore.permit('platform_manage', 'access') && (
                  <>
                    <SelectItem value="platform_manage">平台管理</SelectItem>
                    <SelectItem value="anonymous">匿名</SelectItem>
                    <SelectItem value="dev">开发</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          )}
          <Select
            value={searchData.action}
            onValueChange={(action) =>
              setSearchData((state) => ({ ...state, action }))
            }
          >
            <SelectTrigger
              className={cn(
                'w-[140px] h-[36px] mr-3 bg-white',
                !searchData.action && 'text-gray-500'
              )}
            >
              <SelectValue placeholder="操作名称" />
            </SelectTrigger>
            <SelectContent>
              {actionList.map((item) => (
                <SelectItem value={item.value} key={item.value}>
                  {item.name}
                </SelectItem>
              ))}
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
      {loading ? (
        <div className="flex justify-center py-4">
          <BLoader />
        </div>
      ) : (
        <ActivityList
          list={list}
          pageState={pageState}
          isPlatfromManager={authStore.permit('platform_manage', 'access')}
        />
      )}
    </BContainer>
  )
}
