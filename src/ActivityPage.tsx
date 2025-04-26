import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

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

import { ActivityList } from './components/ActivityList'

import { getActivityList } from './api'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { toSync } from './lib/fire-and-forget'
import { cn } from './lib/utils'
import { useAuthedUserStore, useLoading } from './state/global'
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
  /* const [loading, setLoading] = useState(false) */
  const [list, updateActList] = useState<Activity[]>([])
  const [actionList, setActionList] = useState<OptionItem[]>([])
  const [pageState, setPageState] = useState<ListPageState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })
  const usernameRef = useRef<HTMLInputElement | null>(null)

  const { t } = useTranslation()
  const { setLoading } = useLoading()

  const { siteFrontId } = useParams()
  const [params, setParams] = useSearchParams()
  const location = useLocation()

  const { checkPermit } = useAuthedUserStore(
    useShallow(({ permit }) => ({ checkPermit: permit }))
  )

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
  }, [setParams])

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

          if (!checkPermit('activity', 'manage_platform')) {
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
      [params, siteFrontId, checkPermit, setLoading]
    )
  )

  const onResetClick = useCallback(() => {
    setSearchData({ ...defaultSearchData })
    resetParams()
  }, [resetParams])

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
  }, [resetParams, setParams, searchData])

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
              name: t('modLog'),
              describe: t('modLogDescribe'),
            }
          : {
              isFront: true,
              frontId: 'activites',
              name: t('activityLog'),
              describe: t('activityLogDescribe'),
            }
      }
    >
      <Card className="flex flex-wrap justify-between p-2">
        <div className="flex flex-wrap">
          <Input
            placeholder={t('moderatorName')}
            className="w-[140px] h-[36px] mr-3"
            ref={usernameRef}
            value={searchData.username}
            onChange={() =>
              setSearchData((state) => ({
                ...state,
                username: usernameRef.current?.value || '',
              }))
            }
            onKeyUp={(e) => {
              if (e.key == 'Enter') {
                onSearchClick()
              }
            }}
          />
          {checkPermit('activity', 'manage_platform') && (
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
                <SelectValue placeholder={t('modAction')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{t('commonUser')}</SelectItem>
                <SelectItem value="manage">{t('management')}</SelectItem>
                {checkPermit('platform_manage', 'access') && (
                  <>
                    <SelectItem value="platform_manage">
                      {t('platformManagement')}
                    </SelectItem>
                    <SelectItem value="anonymous">{t('anonymous')}</SelectItem>
                    <SelectItem value="dev">{t('dev')}</SelectItem>
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
              <SelectValue placeholder={t('actionName')} />
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
            {t('reset')}
          </Button>
          <Button size="sm" onClick={onSearchClick}>
            {t('search')}
          </Button>
        </div>
      </Card>

      <ActivityList
        list={list}
        pageState={pageState}
        isPlatfromManager={checkPermit('platform_manage', 'access')}
      />
    </BContainer>
  )
}
