import { CheckIcon, EllipsisVerticalIcon } from 'lucide-react'
import {
  MouseEvent,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import { Link, useSearchParams } from 'react-router-dom'

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
  useNotificationStore,
} from '@/state/global'
import { ListPageState, Message, SUBSCRIBE_ACTION } from '@/types/types'

import { ListPagination } from './ListPagination'
import { Badge } from './ui/badge'

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

    const [notiList, setNotiList] = useState<Message[]>([])
    /* const [notiTotal, setNotiTotal] = useState(0) */
    const [pageState, setPageState] = useState<ListPageState>({
      currPage: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      totalPage: 0,
      total: 0,
    })

    const [params] = useSearchParams()

    const authState = useAuthedUserStore()
    const alertDialog = useAlertDialogStore()

    const notiStore = useNotificationStore()

    const fetchNotifications = async () => {
      const page = Number(params.get('page')) || 1
      const resp = await getNotifications(
        page,
        pageSize,
        listType == 'default' ? 'unread' : undefined
      )
      if (!resp.code) {
        const { data } = resp
        if (data.list) {
          setNotiList([...data.list])
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
        '确认',
        '确定把全部未读消息标记为已读？'
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

    /* useEffect(() => {
     *   toSync(fetchNotifications)()
     * }, []) */

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
                {notiStore.unreadCount} 条未读消息
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
                全部标称为已读
              </Button>
            )}
          </div>
        </div>

        {loading && <BLoaderBlock />}
        {notiList.length == 0 ? (
          <Empty text={listType == 'default' ? '暂无未读消息' : ''} />
        ) : (
          notiList.map((item) => (
            <Link
              to={genArticlePath(item.targetData)}
              className="hover:no-underline"
              key={item.id}
            >
              <div className="p-3 mb-2 rounded-sm bg-white hover:opacity-80">
                <div className="flex justify-between items-start mb-2">
                  <div
                    className={cn(
                      'flex-grow',
                      listType == 'list_page' && !item.isRead && 'font-bold'
                    )}
                  >
                    <BAvatar
                      size={listType == 'list_page' ? 22 : 20}
                      fontSize={12}
                      username={item.senderUserName}
                      showUsername
                    />
                    &nbsp;
                    {item.targetData.authorId == authState.userID ? (
                      item.targetData.title ? (
                        <>在帖子《{item.targetData.title}》中回复了你</>
                      ) : (
                        '回复了你'
                      )
                    ) : (
                      <>回复了帖子《{item.targetData.title}》</>
                    )}
                  </div>
                  <div className="flex pl-2">
                    {!item.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="py-0 px-0 w-[24px] h-[24px]"
                        title="标记为已读"
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
                          title="设置"
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
                          不再提醒
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="text-gray-500">
                  {item.contentArticle.content}
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
