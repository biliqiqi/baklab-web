import { useCallback, useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'

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
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'

import BContainer from './components/base/BContainer'
import SiteLink from './components/base/SiteLink'

import ArticleControls from './components/ArticleControls'
import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'

import { useLocationKey } from '@/hooks/use-location-key'
import { useSiteParams } from '@/hooks/use-site-params'

import { getArticleTrash, recoverArticle } from './api/article'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import i18n from './i18n'
import { timeAgo } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { cn, genArticlePath } from './lib/utils'
import {
  useAlertDialogStore,
  useCategoryStore,
  useLoading,
} from './state/global'
import { Article, ArticleListSort, ListPageState } from './types/types'

interface SearchFields {
  keywords?: string
  category?: string
}

const defaultSearchData: SearchFields = {
  keywords: '',
  category: '',
}

type ArticleTab = 'all' | 'article' | 'reply'

const TabMapData = (tab: ArticleTab) => {
  switch (tab) {
    case 'all':
      return i18n.t('all')
    case 'reply':
      return i18n.t('reply')
    case 'article':
      return i18n.t('post')
  }
}

const defaultTabs: ArticleTab[] = ['all', 'article', 'reply']

export default function TrashPage() {
  /* const [loadingList, setLoadingList] = useState(true) */
  const [list, updateList] = useState<Article[]>([])
  const [pageState, setPageState] = useState<ListPageState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const { setLoading } = useLoading()

  const { siteFrontId } = useSiteParams()
  const { locationKey } = useLocationKey()
  const [params, setParams] = useSearchParams()
  const [searchData, setSearchData] = useState<SearchFields>({
    ...defaultSearchData,
    keywords: params.get('keywords') || '',
    category: params.get('category') || '',
  })

  const resetParams = useCallback(() => {
    setParams((params) => {
      params.delete('page')
      params.delete('pageSize')
      params.delete('keywords')
      params.delete('category')
      return params
    })
  }, [setParams])

  const cateStore = useCategoryStore()
  const alertDialog = useAlertDialogStore()

  const { t } = useTranslation()

  const tab = (params.get('tab') as ArticleTab | null) || 'all'

  const fetchList = toSync(
    useCallback(
      async (showLoading: boolean = false) => {
        try {
          const page = Number(params.get('page')) || 1
          const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE
          const sort =
            (params.get('sort') as ArticleListSort | null) || 'latest'
          const keywords = params.get('keywords') || ''
          const category = params.get('category') || ''

          let currTab = tab
          if (!defaultTabs.includes(tab)) {
            currTab = 'all'
          }

          if (showLoading) {
            setLoading(true)
          }

          const resp = await getArticleTrash(
            page,
            pageSize,
            sort,
            category,
            '',
            currTab,
            keywords,
            { siteFrontId }
          )

          if (!resp.code) {
            const { data } = resp
            if (data.articles) {
              updateList([...data.articles])
              setPageState({
                currPage: data.currPage,
                pageSize: data.pageSize,
                total: data.articleTotal,
                totalPage: data.totalPage,
              })
            } else {
              updateList([])
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
      [params, siteFrontId, tab, setLoading]
    )
  )

  const onResetClick = useCallback(() => {
    setSearchData({ ...defaultSearchData })
    resetParams()
  }, [resetParams])

  const onSearchClick = useCallback(() => {
    resetParams()
    setParams((params) => {
      const { keywords, category } = searchData
      if (keywords) {
        params.set('keywords', keywords)
      }

      if (category) {
        params.set('category', category)
      }

      return params
    })
  }, [resetParams, setParams, searchData])

  const onRecoverClick = useCallback(
    async (id: string, title: string, siteFrontId: string) => {
      try {
        const confirmed = await alertDialog.confirm(
          t('confirm'),
          t('confirmRecover', { title }),
          'normal'
        )
        if (!confirmed) return

        const resp = await recoverArticle(id, {
          siteFrontId,
        })
        if (!resp.code) {
          fetchList(false)
        }
      } catch (err) {
        console.error('recover article error: ', err)
      }
    },
    [alertDialog, fetchList, t]
  )

  const onTabChange = (tab: string) => {
    setParams((prevParams) => {
      prevParams.delete('page')
      prevParams.set('tab', tab)
      return prevParams
    })
  }

  useEffect(() => {
    fetchList(true)
  }, [locationKey])

  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'trash',
        name: t('trash'),
        describe: '',
      }}
    >
      <Card
        className="flex flex-wrap justify-between p-2 mb-3"
        onKeyUp={(e) => {
          if (e.ctrlKey && e.key == 'Enter') {
            onSearchClick()
          }
        }}
      >
        <div className="flex flex-wrap">
          <Input
            placeholder={`${t('title')}/${t('authorName')}`}
            className="w-[140px] h-[36px] mr-3"
            value={searchData.keywords}
            onChange={(e) =>
              setSearchData((state) => ({
                ...state,
                keywords: e.target.value || '',
              }))
            }
            onKeyUp={(e) => {
              if (e.key == 'Enter') {
                onSearchClick()
              }
            }}
          />
          {siteFrontId && (
            <Select
              value={searchData.category}
              onValueChange={(category) =>
                setSearchData((state) => ({ ...state, category }))
              }
            >
              <SelectTrigger
                className={cn(
                  'w-[140px] h-[36px] mr-3 bg-white',
                  !searchData.category && 'text-gray-500'
                )}
              >
                <SelectValue placeholder={t('category')} />
              </SelectTrigger>
              <SelectContent>
                {cateStore.categories.map((item) => (
                  <SelectItem value={item.frontId} key={item.frontId}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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

      <Tabs
        defaultValue="oldest"
        value={tab}
        onValueChange={onTabChange}
        className="mb-4"
      >
        <TabsList className="overflow-x-auto overflow-y-hidden max-w-full">
          {defaultTabs.map((item) => (
            <TabsTrigger value={item} key={item}>
              {TabMapData(item)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {pageState.total == 0 ? (
        <Empty />
      ) : (
        list.map((item) => (
          <Card key={item.id} className="p-3 my-2 hover:bg-slate-50">
            <div className="mb-3">
              <div className="mb-1">
                <SiteLink
                  className="mr-2"
                  to={genArticlePath(item)}
                  siteFrontId={item.siteFrontId}
                >
                  {item.displayTitle}
                </SiteLink>
              </div>
              {item.replyToId != '0' && (
                <div className="max-h-5 mb-1 overflow-hidden text-sm text-gray-600 text-nowrap text-ellipsis">
                  {item.content}
                </div>
              )}
            </div>
            <ArticleControls
              comment={false}
              upVote={false}
              bookmark={false}
              notify={false}
              article={item}
              ctype="list"
              className="mb-2"
            />
            <div className="flex justify-between p-2 bg-gray-200 text-sm">
              <div>
                {item.delLog?.extraInfo && (
                  <Trans
                    i18nKey={'deletedBy'}
                    values={{
                      deletedBy: item.delLog.extraInfo['deletedBy'] as string,
                      createdAt: timeAgo(item.delLog.createdAt),
                      reason: item.delLog.extraInfo['reason'] as string,
                    }}
                    components={{
                      creatorLink: (
                        <Link
                          to={'/users/' + item.delLog.extraInfo['deletedBy']}
                          className="text-primary"
                        />
                      ),
                      reasonDiv: (
                        <div
                          className="mt-2"
                          style={{
                            display: item.delLog.type == 'manage' ? '' : 'none',
                          }}
                        />
                      ),
                    }}
                  />
                )}
              </div>
              <div>
                <Button
                  variant="outline"
                  onClick={() =>
                    onRecoverClick(item.id, item.displayTitle, item.siteFrontId)
                  }
                  size="sm"
                >
                  {t('recover')}
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}
      <ListPagination pageState={pageState} />
    </BContainer>
  )
}
