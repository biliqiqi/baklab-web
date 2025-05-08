import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'

import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './components/ui/collapsible'
import { Input } from './components/ui/input'
import { Textarea } from './components/ui/textarea'

import BContainer from './components/base/BContainer'

import { Empty } from './components/Empty'
import ModerationForm, { ReasonSchema } from './components/ModerationForm'

import { getSiteUpdates, reviewSiteUpdates } from './api/main'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { timeAgo } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { noop } from './lib/utils'
import { useLoading } from './state/global'
import { ArticleLog, ArticleStatus, ListPageState } from './types/types'

interface SearchFields {
  username?: string
}

const defaultSearchData: SearchFields = {
  username: '',
}

const isReply = (log: ArticleLog) => log.currArticle.replyToId != '0'

interface ArticleUpdateItemProps {
  data: ArticleLog
  siteFrontId: string
  onConfirm: (action: ReviewAction, content: string) => void
}

type ReviewAction = 'approved' | 'rejected'

const ArticleUpdateItem: React.FC<ArticleUpdateItemProps> = ({
  data: item,
  siteFrontId,
  onConfirm = noop,
}) => {
  const [reviewAciton, setReviewAction] = useState<ReviewAction | null>(null)
  const isApproved = useMemo(() => reviewAciton == 'approved', [reviewAciton])
  const [content, setContent] = useState('')
  const [errMessage, setErrMessage] = useState('')

  const { t } = useTranslation()

  const onConfirmClick = useCallback(
    (data?: ReasonSchema) => {
      if (!reviewAciton) {
        setErrMessage(t('actionTypeRequired'))
        return
      }
      setErrMessage('')

      let con = content

      if (reviewAciton == 'rejected') {
        if (!data) {
          console.error('lack of rejection reason')
          return
        }
        con = data.reason
        if (data.extra.trim()) {
          con += `\n\n${data.extra}`
        }
      }

      onConfirm(reviewAciton, con)
    },
    [reviewAciton, content, onConfirm, t]
  )

  const onContentChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      if (content.trim()) {
        setErrMessage('')
      }

      setContent(e.target.value)
    },
    [content]
  )

  return (
    <Card key={item.id} className="p-3 my-2 hover:bg-slate-50">
      <Collapsible>
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer">
            <Trans
              i18nKey={'articleCreateDescribe'}
              values={{
                authorName: item.operator.name,
                actionName:
                  item.prevHistoryId == '0' ? t('created') : t('updated'),
                objName: !isReply(item) ? t('post') : t('reply'),
                title: item.currArticle.displayTitle,
                time: timeAgo(item.createdAt),
              }}
              components={{
                authorLink: (
                  <Link
                    to={`/users/${item.operator.name}`}
                    className="text-primary"
                  />
                ),
                titleLink: (
                  <Link
                    to={`/${siteFrontId}/articles/${item.currArticle.id}`}
                    className="text-primary"
                  />
                ),
                timeTag: <time title={item.createdAt} />,
              }}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="text-sm bg-gray-100 p-2 mt-2">
            <div key={item.id}>
              <div className="flex justify-between items-center mt-4">
                <span className="font-bold">
                  {t('version')}：{item.version}
                </span>
                <span className="text-sm"></span>
              </div>
              {!isReply(item) && (
                <div className="flex mt-2 text-sm">
                  <div className="w-[50px] font-bold mr-1 pt-2">
                    {t('title')}：
                  </div>
                  <div
                    className="flex-shrink-0 flex-grow bg-gray-100 p-2"
                    style={{
                      maxWidth: `calc(100% - 50px)`,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: item.titleDiffHTML,
                    }}
                  ></div>
                </div>
              )}
              {!isReply(item) && (
                <div className="flex mt-2 text-sm">
                  <div className="w-[50px] font-bold mr-1 pt-2">
                    {t('category')}：
                  </div>
                  <div
                    className="flex-shrink-0 flex-grow bg-gray-100 p-2"
                    style={{
                      maxWidth: `calc(100% - 50px)`,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: item.categoryFrontIdDiffHTML,
                    }}
                  ></div>
                </div>
              )}
              {!isReply(item) && (
                <div className="flex mt-2 text-sm">
                  <div className="w-[50px] font-bold mr-1 pt-2">
                    {t('link')}：
                  </div>
                  <div
                    className="flex-shrink-0 flex-grow bg-gray-100 p-2"
                    style={{
                      maxWidth: `calc(100% - 50px)`,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: item.urlDiffHTML,
                    }}
                  ></div>
                </div>
              )}
              <div className="flex mt-2 text-sm">
                <div className="w-[50px] font-bold mr-1 pt-2">
                  {t('content')}：
                </div>
                <div
                  className="flex-shrink-0 flex-grow bg-gray-100 p-2 whitespace-break-spaces"
                  style={{
                    maxWidth: `calc(100% - 50px)`,
                  }}
                  dangerouslySetInnerHTML={{
                    __html: item.contentDiffHTML,
                  }}
                ></div>
              </div>
            </div>
          </div>
          {!reviewAciton && (
            <div className="flex justify-between mt-2">
              <div></div>
              <div>
                <Button
                  variant={'destructive'}
                  size={'sm'}
                  onClick={() => setReviewAction('rejected')}
                >
                  {t('reject')}
                </Button>
                <Button
                  variant={'default'}
                  size={'sm'}
                  className="ml-1"
                  onClick={() => setReviewAction('approved')}
                >
                  {t('pass')}
                </Button>
              </div>
            </div>
          )}
          {reviewAciton && (
            <div className="justify-between mt-4 pt-2">
              <div className="mb-1">
                {isApproved ? t('passConfirm') : t('rejectConfirm')}
              </div>
              {reviewAciton == 'approved' ? (
                <>
                  <Textarea
                    placeholder={`${t('remark')} (${t('optional')})`}
                    value={content}
                    onChange={onContentChange}
                  />
                  {errMessage && (
                    <div className="my-2 py-2 text-destructive">
                      {errMessage}
                    </div>
                  )}
                  <div className="flex justify-between mt-2">
                    <span></span>
                    <span>
                      <Button
                        variant={'secondary'}
                        size={'sm'}
                        className="ml-1"
                        onClick={() => setReviewAction(null)}
                      >
                        {t('cancel')}
                      </Button>
                      <Button
                        variant={isApproved ? 'default' : 'destructive'}
                        size={'sm'}
                        className="ml-1"
                        onClick={() => onConfirmClick()}
                      >
                        {t('confirm')}
                      </Button>
                    </span>
                  </div>
                </>
              ) : (
                <ModerationForm
                  reasonLable=""
                  destructive
                  onCancel={() => setReviewAction(null)}
                  onSubmit={onConfirmClick}
                />
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export function ArticleReviewPage() {
  const { siteFrontId } = useParams()
  /* const [loading, setLoading] = useState(false) */

  const location = useLocation()
  const [pageState, setPageState] = useState<ListPageState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const { t } = useTranslation()

  const [updates, setUpdates] = useState<ArticleLog[]>([])
  const usernameRef = useRef<HTMLInputElement | null>(null)
  const [params, setParams] = useSearchParams()

  const { setLoading } = useLoading()

  const [searchData, setSearchData] = useState<SearchFields>({
    ...defaultSearchData,
    username: params.get('username') || '',
  })

  const resetParams = useCallback(() => {
    setParams((params) => {
      params.delete('page')
      params.delete('pageSize')
      params.delete('username')
      return params
    })
  }, [setParams])

  const onResetClick = useCallback(() => {
    setSearchData({ ...defaultSearchData })
    resetParams()
  }, [resetParams])

  const onSearchClick = useCallback(() => {
    resetParams()
    setParams((params) => {
      const { username } = searchData
      if (username) {
        params.set('username', username)
      }
      return params
    })
  }, [searchData, resetParams, setParams])

  const fetchSiteUpdates = useCallback(async () => {
    if (!siteFrontId) return

    try {
      setLoading(true)

      const username = params.get('username') || ''
      const {
        code,
        data: { list, currPage, pageSize, total, totalPage },
      } = await getSiteUpdates(1, DEFAULT_PAGE_SIZE, username, { siteFrontId })

      if (!code && list) {
        /* console.log('updates: ', list) */
        setUpdates(() => [...list])
        setPageState({
          currPage,
          pageSize,
          total,
          totalPage,
        })
      } else {
        setUpdates(() => [])
        setPageState({
          currPage: 1,
          pageSize: DEFAULT_PAGE_SIZE,
          total: 0,
          totalPage: 0,
        })
      }
    } catch (err) {
      console.error('fetch updates error: ', err)
    } finally {
      setLoading(false)
    }
  }, [siteFrontId, params, setLoading])

  const onReviewConfirmClick = useCallback(
    async (history: ArticleLog, action: ReviewAction, content: string) => {
      let status: ArticleStatus | undefined
      if (action == 'approved') {
        status = 'published'
      } else if (action == 'rejected') {
        status = 'rejected'
      } else {
        return
      }

      if (!status) {
        console.error('lack of status')
        return
      }

      const { code } = await reviewSiteUpdates(
        history.id,
        content,
        status,
        history.currArticle.displayTitle,
        history.currArticle.replyToId != '0',
        {
          siteFrontId,
        }
      )
      if (!code) {
        toSync(fetchSiteUpdates)()
      }
    },
    [siteFrontId, fetchSiteUpdates]
  )

  useEffect(() => {
    toSync(fetchSiteUpdates)()
  }, [location, fetchSiteUpdates])

  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'article_review',
        name: t('reviewByHuman'),
        describe: t('reviewByHumanDescribe'),
      }}
    >
      <Card className="flex flex-wrap justify-between p-2">
        <div className="flex flex-wrap">
          <Input
            placeholder={t('author')}
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

      {updates.length == 0 ? (
        <Empty />
      ) : (
        <>
          <div className="flex justify-between items-center my-4">
            <div>
              <Badge variant="secondary">
                {t('recordCount', { num: pageState.total })}
              </Badge>
            </div>
            <div></div>
          </div>
          {updates.map((item) => (
            <ArticleUpdateItem
              key={item.id}
              data={item}
              siteFrontId={siteFrontId || ''}
              onConfirm={(action, content) =>
                onReviewConfirmClick(item, action, content)
              }
            />
          ))}
        </>
      )}
    </BContainer>
  )
}
