import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { Card } from './components/ui/card'

import BContainer from './components/base/BContainer'

import ArticleControls from './components/ArticleControls'
import { ListPagination } from './components/ListPagination'

import { getArticleList } from './api/article'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import {
  Article,
  ArticleListSort,
  ArticleListState,
  ListPageState,
} from './types/types'

export default function TrashPage() {
  const [loadingList, setLoadingList] = useState(true)
  const [list, updateList] = useState<Article[]>([])
  const [pageState, setPageState] = useState<ListPageState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalCount: 0,
    totalPage: 0,
  })
  const [params] = useSearchParams()

  const fetchList = toSync(
    useCallback(
      async (showLoading: boolean = false) => {
        try {
          const page = Number(params.get('page')) || 1
          const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE
          const sort =
            (params.get('sort') as ArticleListSort | null) || 'latest'
          if (showLoading) {
            setLoadingList(true)
          }

          const resp = await getArticleList(
            page,
            pageSize,
            sort,
            '',
            '',
            'deleted'
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

  useEffect(() => {
    fetchList(false)
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
