import { SquareArrowOutUpRightIcon } from 'lucide-react'
import { MouseEvent, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

/* import mockArticleList from '@/mock/articles.json' */
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'
import { Card } from '@/components/ui/card'

import ArticleControls from './components/ArticleControls'
import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'

import {
  extractDomain,
  genArticlePath,
  getArticleStatusName,
  renderMD,
} from './lib/utils'
import { isLogined, useAuthedUserStore } from './state/global'
import {
  Article,
  ArticleListSort,
  ArticleListState,
  Category,
} from './types/types'

/* const articleList = mockArticleList as Article[] */

interface ArticleListPageProps {
  list: Article[]
  pageState: ArticleListState
  currCate: Category | null
  onRefresh: () => void
}

const ArticleListPage: React.FC<ArticleListPageProps> = ({
  list,
  pageState,
  currCate,
  onRefresh,
}) => {
  const [showSummary] = useState(false)

  const isMySelf = useAuthedUserStore((state) => state.isMySelf)
  const checkPermit = useAuthedUserStore((state) => state.permit)
  const loginWithDialog = useAuthedUserStore((state) => state.loginWithDialog)
  const checkIsLogined = useAuthedUserStore((state) => state.isLogined)

  const [params, setParams] = useSearchParams()
  const { siteFrontId, categoryFrontId } = useParams()

  const navigate = useNavigate()
  /* const siteStore = useSiteStore() */
  const { t } = useTranslation()

  const sort = (params.get('sort') as ArticleListSort | null) || 'best'

  const submitPath = useMemo(
    () =>
      categoryFrontId && currCate
        ? `/${siteFrontId}/submit?category_id=` + currCate.id
        : `/${siteFrontId}/submit`,
    [currCate, siteFrontId, categoryFrontId]
  )

  const onSwitchTab = (tab: string) => {
    setParams((prevParams) => {
      prevParams.set('sort', tab)
      return prevParams
    })
  }

  const onSubmitClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()

      if (checkIsLogined()) {
        navigate(submitPath)
        return
      }

      try {
        const authData = await loginWithDialog()
        /* console.log('authData success', authData) */
        if (isLogined(authData)) {
          setTimeout(() => {
            navigate(submitPath)
          }, 0)
        }
      } catch (err) {
        console.error('submit click error: ', err)
      }
    },
    [submitPath, navigate, checkIsLogined, loginWithDialog]
  )

  /* console.log('list: ', list) */

  return (
    <>
      <div className="flex justify-between items-center">
        <div>
          {list.length > 0 && (
            <Tabs defaultValue="best" value={sort} onValueChange={onSwitchTab}>
              <TabsList>
                <TabsTrigger value="best">{t('best')}</TabsTrigger>
                <TabsTrigger value="latest">{t('latest')}</TabsTrigger>
                <TabsTrigger value="list_hot">{t('hot')}</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
        <div>
          {siteFrontId && checkPermit('article', 'create') && (
            <Button variant="outline" size="sm" asChild onClick={onSubmitClick}>
              <Link to={submitPath}>+ {t('submit')}</Link>
            </Button>
          )}
        </div>
      </div>
      <div className="mt-4" key={categoryFrontId}>
        {list.length == 0 ? (
          <Empty />
        ) : (
          list.map((item) => (
            <Card
              key={item.id}
              className="p-3 my-2 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <div className="mb-3">
                <div className="mb-1 ">
                  <Link className="mr-2" to={genArticlePath(item)}>
                    {item.title}
                  </Link>
                  {item.link && (
                    <span className="text-sm">
                      (<span className="text-gray-500">{t('source')}</span>
                      &nbsp;
                      <a
                        href={item.link}
                        target="_blank"
                        title={item.link}
                        className="break-all"
                      >
                        <SquareArrowOutUpRightIcon
                          size={14}
                          className="inline"
                        />
                        &nbsp;
                        {extractDomain(item.link)}...
                      </a>
                      )
                    </span>
                  )}
                </div>
                <div>{isMySelf(item.authorId)}</div>
                {(isMySelf(item.authorId) ||
                  checkPermit('article', 'manage')) &&
                  item.status != 'published' && (
                    <div className="py-1">
                      <Badge variant={'secondary'}>
                        {getArticleStatusName(item.status)}
                      </Badge>
                    </div>
                  )}
                {showSummary && (
                  <div
                    className="mb-1 break-words"
                    dangerouslySetInnerHTML={{ __html: renderMD(item.summary) }}
                  ></div>
                )}
                {item.picURL && (
                  <div className="w-[120px] h-[120px] rounded mr-4 bg-gray-200 shrink-0 overflow-hidden">
                    <a href="#">
                      <img
                        alt={item.title}
                        src={item.picURL}
                        className="max-w-full"
                      />
                    </a>
                  </div>
                )}
              </div>
              <ArticleControls
                article={item}
                ctype="list"
                bookmark={false}
                notify={false}
                onSuccess={onRefresh}
              />
            </Card>
          ))
        )}
      </div>

      {pageState.totalPage > 1 && (
        <ListPagination pageState={pageState} autoScrollTop />
      )}
    </>
  )
}

export default ArticleListPage
