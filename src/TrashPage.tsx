import { useCallback, useEffect, useState } from 'react'
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

import BContainer from './components/base/BContainer'

import ArticleControls from './components/ArticleControls'
import { ListPagination } from './components/ListPagination'

import { getArticleList } from './api/article'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { cn } from './lib/utils'
import { useCategoryStore } from './state/global'
import { Article, ArticleListSort, ListPageState } from './types/types'

interface SearchFields {
  keywords?: string
  category?: string
}

const defaultSearchData: SearchFields = {
  keywords: '',
  category: '',
}

export default function TrashPage() {
  const [loadingList, setLoadingList] = useState(true)
  const [list, updateList] = useState<Article[]>([])
  const [pageState, setPageState] = useState<ListPageState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalCount: 0,
    totalPage: 0,
  })
  const [searchData, setSearchData] = useState<SearchFields>({
    ...defaultSearchData,
  })

  const [params, setParams] = useSearchParams()
  const cateStore = useCategoryStore()

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

          if (showLoading) {
            setLoadingList(true)
          }

          const resp = await getArticleList(
            page,
            pageSize,
            sort,
            category,
            '',
            'deleted',
            keywords
          )

          if (!resp.code) {
            const { data } = resp
            if (data.articles) {
              updateList([...data.articles])
              setPageState({
                currPage: data.currPage,
                pageSize: data.pageSize,
                totalCount: data.articleTotal,
                totalPage: data.totalPage,
              })
            } else {
              updateList([])
              setPageState({
                currPage: 1,
                pageSize: data.pageSize,
                totalCount: 0,
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
      [params]
    )
  )

  const resetParams = useCallback(() => {
    setParams((params) => {
      params.delete('page')
      params.delete('pageSize')
      params.delete('keywords')
      params.delete('category')
      return params
    })
  }, [params])

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

  useEffect(() => {
    fetchList(true)
  }, [params])

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
        className="flex flex-wrap justify-between p-2"
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
            upVote={false}
            bookmark={false}
            notify={false}
            article={item}
            ctype="list"
          />
          <div className="p-2 bg-gray-200 text-sm">
            {item.delLog.details && (
              <>
                由&nbsp;
                <Link
                  to={'/users/' + item.delLog.details['deleted_by']}
                  className="text-primary"
                >
                  {item.delLog.details['deleted_by']}
                </Link>{' '}
                删除于 {timeFmt(item.delLog.createdAt, 'YYYY-M-D h:m:s')}
                {item.delLog.type == 'manage' && (
                  <div className="mt-2">
                    原因：{item.delLog.details['reason']}
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      ))}
      <ListPagination pageState={pageState} />
    </BContainer>
  )
}
