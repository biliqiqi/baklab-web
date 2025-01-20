import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'

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
import BLoader from './components/base/BLoader'

import ArticleControls from './components/ArticleControls'
import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'

import { getArticleTrash, recoverArticle } from './api/article'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { timeAgo, timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { cn, genArticlePath } from './lib/utils'
import { useAlertDialogStore, useCategoryStore } from './state/global'
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

type UserTabMap = {
  [key in ArticleTab]: string
}

const TabMapData: UserTabMap = {
  all: '全部',
  reply: '回复',
  article: '帖子',
}

const defaultTabs: ArticleTab[] = ['all', 'article', 'reply']

export default function TrashPage() {
  const [loadingList, setLoadingList] = useState(true)
  const [list, updateList] = useState<Article[]>([])
  const [pageState, setPageState] = useState<ListPageState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const { siteFrontId } = useParams()

  const location = useLocation()
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
  }, [params])

  const cateStore = useCategoryStore()
  const alertDialog = useAlertDialogStore()

  let tab = (params.get('tab') as ArticleTab | null) || 'all'

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

          if (!defaultTabs.includes(tab)) {
            tab = 'all'
          }

          if (showLoading) {
            setLoadingList(true)
          }

          const resp = await getArticleTrash(
            page,
            pageSize,
            sort,
            category,
            '',
            tab,
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
          setLoadingList(false)
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
      const { keywords, category } = searchData
      if (keywords) {
        params.set('keywords', keywords)
      }

      if (category) {
        params.set('category', category)
      }

      return params
    })
  }, [params, searchData])

  const onRecoverClick = useCallback(
    async (id: string, title: string, siteFrontId: string) => {
      try {
        const confirmed = await alertDialog.confirm(
          '确认',
          `确认恢复《${title}》？`,
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
    []
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
  }, [location])

  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'trash',
        name: '回收站',
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
            placeholder="标题/作者名"
            className="w-[140px] h-[36px] mr-3"
            value={searchData.keywords}
            onChange={(e) =>
              setSearchData((state) => ({
                ...state,
                keywords: e.target.value || '',
              }))
            }
          />
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
              <SelectValue placeholder="类别" />
            </SelectTrigger>
            <SelectContent>
              {cateStore.categories.map((item) => (
                <SelectItem value={item.frontId} key={item.frontId}>
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

      <Tabs
        defaultValue="oldest"
        value={tab}
        onValueChange={onTabChange}
        className="mb-4"
      >
        <TabsList className="overflow-x-auto overflow-y-hidden max-w-full">
          {defaultTabs.map((item) => (
            <TabsTrigger value={item} key={item}>
              {TabMapData[item]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loadingList && (
        <div className="flex justify-center py-4">
          <BLoader />
        </div>
      )}

      {pageState.total == 0 ? (
        <Empty />
      ) : (
        list.map((item) => (
          <Card key={item.id} className="p-3 my-2 hover:bg-slate-50">
            <div className="mb-3">
              <div className="mb-1">
                <Link className="mr-2" to={genArticlePath(item)}>
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
                {item.delLog?.details && (
                  <>
                    由&nbsp;
                    <Link
                      to={'/users/' + item.delLog.details['deletedBy']}
                      className="text-primary"
                    >
                      {item.delLog.details['deletedBy']}
                    </Link>{' '}
                    删除于 {timeAgo(item.delLog.createdAt)}
                    {item.delLog.type == 'manage' && (
                      <div className="mt-2">
                        原因：{item.delLog.details['reason']}
                      </div>
                    )}
                  </>
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
                  恢复
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
