import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import { useNavigate, useSearch } from '@/lib/router'
import {
  omitSearchParams,
  updateSearchParams,
  withSearchUpdater,
} from '@/lib/search'

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

import { useLocationKey } from '@/hooks/use-location-key'
import { useSiteParams } from '@/hooks/use-site-params'

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

  const { siteFrontId } = useSiteParams()
  const search = useSearch()
  const navigate = useNavigate()
  const { locationKey } = useLocationKey()

  const { checkPermit } = useAuthedUserStore(
    useShallow(({ permit }) => ({ checkPermit: permit }))
  )

  const [searchData, setSearchData] = useState<SearchFields>({
    ...defaultSearchData,
    username: search.username || '',
    actType: (search.act_type as ActivityActionType) || '',
    action: search.action || '',
  })

  const resetParams = useCallback(() => {
    navigate({
      search: withSearchUpdater((prev) =>
        omitSearchParams(prev, [
          'page',
          'page_size',
          'pageSize',
          'username',
          'act_type',
          'actType',
          'action',
        ])
      ),
    })
  }, [navigate])

  const hasSearchParamsChanged = useCallback(() => {
    const currentUsername = search.username || ''
    const currentActType = search.act_type || ''
    const currentAction = search.action || ''

    return (
      currentUsername !== (searchData.username || '') ||
      currentActType !== (searchData.actType || '') ||
      currentAction !== (searchData.action || '')
    )
  }, [search, searchData])

  const fetchList = toSync(
    useCallback(
      async (showLoading: boolean = false) => {
        try {
          const page = Number(search.page) || 1
          const pageSize = Number(search.page_size) || DEFAULT_PAGE_SIZE
          const username = search.username || ''
          let actType =
            (search.act_type as ActivityActionType | null) || undefined
          const action = search.action || ''

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
      [search, siteFrontId, checkPermit, setLoading]
    )
  )

  const onResetClick = useCallback(() => {
    setSearchData({ ...defaultSearchData })
    resetParams()
  }, [resetParams])

  const onSearchClick = useCallback(() => {
    const changed = hasSearchParamsChanged()
    navigate({
      search: withSearchUpdater((prev) =>
        updateSearchParams(
          prev,
          {
            username: searchData.username || undefined,
            act_type: searchData.actType || undefined,
            action: searchData.action || undefined,
          },
          [
            'page',
            'page_size',
            'pageSize',
            'username',
            'act_type',
            'actType',
            'action',
          ]
        )
      ),
    })
    if (!changed) {
      fetchList(true)
    }
  }, [navigate, searchData, hasSearchParamsChanged, fetchList])

  useEffect(() => {
    fetchList(true)
  }, [locationKey])

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
          <Button
            variant="outline"
            size="sm"
            onClick={onResetClick}
            className="mr-3"
          >
            {t('reset')}
          </Button>
          <Button variant="outline" size="sm" onClick={onSearchClick}>
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
