import { CheckIcon, EllipsisVerticalIcon } from 'lucide-react'
import {
  MouseEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { toSync } from '@/lib/fire-and-forget'
import { cn, genArticlePath } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import BAvatar from '@/components/base/BAvatar'
import { BLoaderBlock } from '@/components/base/BLoader'

import { Empty } from '@/components/Empty'

import { toggleSubscribeArticle } from '@/api/article'
import {
  getNotifications,
  readAllNotifications,
  readArticle,
} from '@/api/message'
import { DEFAULT_PAGE_SIZE } from '@/constants/constants'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useForceUpdate,
  useNotificationStore,
} from '@/state/global'
import { ListPageState, Message, SUBSCRIBE_ACTION } from '@/types/types'

import { ListPagination } from './ListPagination'
import BSiteIcon from './base/BSiteIcon'
import { Badge } from './ui/badge'

interface MessageFront extends Message {
  targetPath: string
}

export interface MessageListRef {
  list: Message[]
  pageState: ListPageState
  fetchList: () => Promise<void>
}

type MessageListType = 'default' | 'list_page'

export interface MessageListProps {
  listType?: MessageListType
  pageSize?: number
}

const MessageList = forwardRef<MessageListRef, MessageListProps>(
  ({ listType = 'default', pageSize = DEFAULT_PAGE_SIZE }, ref) => {
    const [loading, setLoading] = useState(false)

    const [notiList, setNotiList] = useState<MessageFront[]>([])
    /* const [notiTotal, setNotiTotal] = useState(0) */
    const [pageState, setPageState] = useState<ListPageState>({
      currPage: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      totalPage: 0,
      total: 0,
    })

    const { t } = useTranslation()

    const [params] = useSearchParams()
    const location = useLocation()

    const authState = useAuthedUserStore()
    const alertDialog = useAlertDialogStore()

    const notiStore = useNotificationStore()

    const forceUpdate = useForceUpdate((state) => state.forceUpdate)

    const fetchNotifications = async () => {
      const page = Number(params.get('page')) || 1
      const resp = await getNotifications(
        page,
        pageSize,
        listType == 'default' ? 'unread' : undefined
      )
      if (!resp.code) {
        const { data } = resp

        /* console.log('data list: ', data.list) */

        if (data.list) {
          const list: MessageFront[] = data.list.map((item) => {
            return {
              ...item,
              targetPath: genArticlePath(item.contentArticle),
            }
          })

          setNotiList([...list])
          /* setNotiTotal(resp.data.total) */
          setPageState({
            currPage: data.page,
            pageSize: data.pageSize,
            total: data.total,
            totalPage: data.totalPage,
          })
        } else {
          setNotiList([])
          setPageState({
            currPage: 1,
            pageSize: DEFAULT_PAGE_SIZE,
            total: 0,
            totalPage: 0,
          })
        }
      }
    }

    useImperativeHandle(ref, () => {
      return {
        list: notiList,
        pageState,
        fetchList: fetchNotifications,
      }
    }, [notiList, pageState, fetchNotifications])

    const onReadAllClick = async () => {
      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t('readAllMsgConfirm')
      )
      if (!confirmed) return

      setLoading(true)
      const resp = await readAllNotifications()
      if (!resp.code) {
        await Promise.all([fetchNotifications(), notiStore.fetchUnread()])
      }
      setLoading(false)
    }

    const onUnsubscribeClick = async (
      e: MouseEvent<HTMLDivElement>,
      contentArticleId: string,
      targetArticleId: string
    ) => {
      e.preventDefault()
      const respR = await readArticle(contentArticleId)
      if (respR.code) return
      const resp = await toggleSubscribeArticle(
        targetArticleId,
        SUBSCRIBE_ACTION.Unsubscribe
      )
      if (resp.code) return
      await Promise.all([fetchNotifications(), notiStore.fetchUnread()])
    }

    const onReadMessageClick = async (
      e: MouseEvent<HTMLButtonElement>,
      contentArticleId: string
    ) => {
      e.preventDefault()
      const respR = await readArticle(contentArticleId)
      if (respR.code) return
      await Promise.all([fetchNotifications(), notiStore.fetchUnread()])
    }

    const onMessageClick = useCallback(
      (e: MouseEvent<HTMLAnchorElement>, item: MessageFront) => {
        if (location.pathname == item.targetPath) {
          e.preventDefault()
          /* console.log('force update') */
          forceUpdate()

          setTimeout(() => {
            toSync(readArticle)(item.contentArticle.id)
            toSync(fetchNotifications)()
            toSync(notiStore.fetchUnread)()
          }, 0)
        }
      },
      [location, forceUpdate, fetchNotifications, notiStore]
    )

    useEffect(() => {
      toSync(fetchNotifications)()
    }, [params])

    return (
      <>
        <div className="flex justify-between items-center mb-4 text-sm">
          <div>
            {notiList.length > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  'text-sm',
                  listType == 'default' && 'bg-transparent'
                )}
              >
                {t('unreadCount', { num: notiStore.unreadCount })}
              </Badge>
            )}
          </div>
          <div className="h-[36px]">
            {notiStore.unreadCount > 0 && (
              <Button
                size="sm"
                variant={listType == 'list_page' ? 'secondary' : 'ghost'}
                className="text-sm"
                onClick={onReadAllClick}
              >
                {t('markAllRead')}
              </Button>
            )}
          </div>
        </div>

        {loading && <BLoaderBlock />}
        {notiList.length == 0 ? (
          <Empty text={listType == 'default' ? t('noUnread') : ''} />
        ) : (
          notiList.map((item) => (
            <Link
              to={item.targetPath}
              className="hover:no-underline"
              key={item.id}
              onClick={(e) => onMessageClick(e, item)}
            >
              <div className="flex items-center p-3 mb-2 rounded-sm bg-white hover:opacity-80">
                {item.siteFrontId && (
                  <BSiteIcon
                    className="mr-4"
                    logoUrl={item.siteLogoUrl}
                    name={item.siteName}
                    size={42}
                  />
                )}
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <div
                      className={cn(
                        'flex-grow',
                        listType == 'list_page' && !item.isRead && 'font-bold'
                      )}
                    >
                      &nbsp;
                      {item.targetData.authorId == authState.userID ? (
                        item.targetData.title &&
                        item.targetData.contentForm?.frontId != 'chat' ? (
                          <Trans
                            i18nKey={'replyUnderPost'}
                            values={{
                              title: item.targetData.title,
                            }}
                            components={{
                              userAvartar: (
                                <BAvatar
                                  size={listType == 'list_page' ? 22 : 20}
                                  fontSize={12}
                                  username={item.senderUserName}
                                  showUsername
                                />
                              ),
                            }}
                          />
                        ) : (
                          <Trans
                            i18nKey={'replyToYou'}
                            components={{
                              userAvartar: (
                                <BAvatar
                                  size={listType == 'list_page' ? 22 : 20}
                                  fontSize={12}
                                  username={item.senderUserName}
                                  showUsername
                                />
                              ),
                            }}
                          />
                        )
                      ) : (
                        <Trans
                          i18nKey={'replyToPost'}
                          values={{
                            title: item.targetData.title,
                          }}
                          components={{
                            userAvartar: (
                              <BAvatar
                                size={listType == 'list_page' ? 22 : 20}
                                fontSize={12}
                                username={item.senderUserName}
                                showUsername
                              />
                            ),
                          }}
                        />
                      )}
                    </div>
                    <div className="flex pl-2">
                      {!item.isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="py-0 px-0 w-[24px] h-[24px]"
                          title={t('markAsRead')}
                          onClick={(e) =>
                            onReadMessageClick(e, item.contentArticle.id)
                          }
                        >
                          <CheckIcon size={18} />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="py-0 px-0 w-[24px] h-[24px] ml-1"
                            title={t('settings')}
                          >
                            <EllipsisVerticalIcon size={18} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          className="px-0"
                          align="end"
                          sideOffset={-2}
                        >
                          <DropdownMenuItem
                            className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
                            onClick={(e) =>
                              onUnsubscribeClick(
                                e,
                                item.contentArticle.id,
                                item.targetID
                              )
                            }
                          >
                            {t('noReminders')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="text-gray-500">
                    {item.contentArticle.content}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}

        {listType == 'list_page' && <ListPagination pageState={pageState} />}
      </>
    )
  }
)

export default MessageList
