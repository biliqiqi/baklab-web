import { useQuery } from '@tanstack/react-query'
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

import { useSiteParams } from '@/hooks/use-site-params'

import { getActivityList } from './api'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { cn } from './lib/utils'
import { useAuthedUserStore } from './state/global'
import { ActivityActionType, OptionItem } from './types/types'

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
  const [actionList, setActionList] = useState<OptionItem[]>([])
  const usernameRef = useRef<HTMLInputElement | null>(null)

  const { t } = useTranslation()

  const { siteFrontId } = useSiteParams()
  const search = useSearch()
  const navigate = useNavigate()

  const { checkPermit } = useAuthedUserStore(
    useShallow(({ permit }) => ({ checkPermit: permit }))
  )

  const page = Number(search.page) || 1
  const pageSize = Number(search.page_size) || DEFAULT_PAGE_SIZE
  const username = search.username || ''
  let actType = (search.act_type as ActivityActionType | null) || undefined
  const action = search.action || ''

  if (!checkPermit('activity', 'manage_platform')) {
    actType = 'manage'
  }

  const { data: activitiesData, refetch } = useQuery({
    queryKey: ['activities', siteFrontId, username, actType, action, page, pageSize],
    queryFn: async () => {
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
          return {
            list: data.list,
            page: data.page,
            pageSize: data.pageSize,
            total: data.total,
            totalPage: data.totalPage,
          }
        } else {
          return {
            list: [],
            page: 1,
            pageSize: data.pageSize,
            total: 0,
            totalPage: 0,
          }
        }
      }

      return {
        list: [],
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        total: 0,
        totalPage: 0,
      }
    },
  })

  const [searchData, setSearchData] = useState<SearchFields>({
    ...defaultSearchData,
    username,
    actType: actType || '',
    action,
  })

  useEffect(() => {
    setSearchData({
      username,
      actType: actType || '',
      action,
    })
  }, [username, actType, action])

  const onResetClick = useCallback(() => {
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

  const onSearchClick = useCallback(() => {
    const hasChanged =
      (searchData.username || '') !== username ||
      (searchData.actType || '') !== (actType || '') ||
      (searchData.action || '') !== action

    if (hasChanged) {
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
    } else {
      refetch()
    }
  }, [navigate, searchData, username, actType, action, refetch])

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
        list={activitiesData?.list || []}
        pageState={{
          currPage: activitiesData?.page || 1,
          pageSize: activitiesData?.pageSize || DEFAULT_PAGE_SIZE,
          total: activitiesData?.total || 0,
          totalPage: activitiesData?.totalPage || 0,
        }}
        isPlatfromManager={checkPermit('platform_manage', 'access')}
      />
    </BContainer>
  )
}
