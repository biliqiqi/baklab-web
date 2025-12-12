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

import { toSync } from '@/lib/fire-and-forget'
import { Link, useNavigate, useSearch } from '@/lib/router'
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
import { acceptCategoryInvite } from '@/api/category'
import {
  getNotifications,
  readAllNotifications,
  readArticle,
  readMessage,
} from '@/api/message'
import { DEFAULT_PAGE_SIZE } from '@/constants/constants'
import { useLocationKey } from '@/hooks/use-location-key'
import { buildRoutePath } from '@/hooks/use-route-match'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useCategoryStore,
  useForceUpdate,
  useNotificationStore,
} from '@/state/global'
import {
  Article,
  CategoryInviteMetadata,
  ListPageState,
  Message,
  MessageTargetCategory,
  ResponseData,
  SUBSCRIBE_ACTION,
} from '@/types/types'

import { ListPagination } from './ListPagination'
import BSiteIcon from './base/BSiteIcon'
import { Badge } from './ui/badge'

interface MessageFront extends Message<Article | MessageTargetCategory> {
  targetPath: string
  targetCategory?: MessageTargetCategory | null
  inviteMetadata?: CategoryInviteMetadata | null
}

export interface MessageListRef {
  list: MessageFront[]
  pageState: ListPageState
  fetchList: () => Promise<void>
}

type MessageListType = 'default' | 'list_page'

export interface MessageListProps {
  listType?: MessageListType
  pageSize?: number
}

const parseCategoryInviteMetadata = (
  metadata?: Record<string, unknown> | null
): CategoryInviteMetadata | null => {
  if (!metadata) return null

  const parsed: CategoryInviteMetadata = {}

  if (typeof metadata.inviteCode === 'string') {
    parsed.inviteCode = metadata.inviteCode
  }

  if (typeof metadata.role === 'string') {
    parsed.role = metadata.role
  }

  if (typeof metadata.expiredAt === 'string') {
    parsed.expiredAt = metadata.expiredAt
  }

  return parsed
}

const buildCategoryTargetPath = (
  target: MessageTargetCategory | null | undefined,
  fallbackSiteFrontId: string
) => {
  if (!target || !target.frontId) {
    return '#'
  }
  return buildRoutePath(
    `/b/${target.frontId}`,
    target.siteFrontId || fallbackSiteFrontId
  )
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

    const search = useSearch()
    const cateStore = useCategoryStore()
    const { location } = useLocationKey()

    const authState = useAuthedUserStore()
    const alertDialog = useAlertDialogStore()
    const navigate = useNavigate()

    const notiStore = useNotificationStore()

    const forceUpdate = useForceUpdate((state) => state.forceUpdate)

    const [categoryAcceptingId, setCategoryAcceptingId] = useState<
      string | null
    >(null)
    const [acceptedInvites, setAcceptedInvites] = useState<
      Record<string, boolean>
    >({})

    const fetchNotifications = useCallback(async () => {
      const page = Number(search.page) || 1
      const resp = await getNotifications(
        page,
        pageSize,
        listType == 'default' ? 'unread' : undefined
      )
      if (!resp.code) {
        const { data } = resp

        if (data.list) {
          const list: MessageFront[] = data.list.map((item) => {
            const metadata = parseCategoryInviteMetadata(
              (item.metadata as Record<string, unknown> | null) ?? null
            )

            const messageItem: MessageFront = {
              ...item,
              targetPath: '#',
              targetCategory: null,
              inviteMetadata: metadata,
            }

            if (item.targetModel === 'category') {
              const categoryTarget =
                (item.targetData as unknown as MessageTargetCategory) || null
              messageItem.targetCategory = categoryTarget
              messageItem.targetPath = buildCategoryTargetPath(
                categoryTarget,
                item.siteFrontId
              )
            } else if (item.contentArticle) {
              messageItem.targetPath = buildRoutePath(
                genArticlePath(item.contentArticle),
                item.contentArticle.siteFrontId
              )
            }

            return messageItem
          })

          setNotiList([...list])
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
    }, [listType, pageSize, search])

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

    const onMarkAsReadClick = async (
      e: MouseEvent<HTMLButtonElement>,
      item: MessageFront
    ) => {
      e.preventDefault()
      if (item.type === 'category') {
        const resp = await readMessage(item.id)
        if (resp.code) return
      } else if (item.contentArticle?.id) {
        const respR = await readArticle(item.contentArticle.id)
        if (respR.code) return
      } else {
        return
      }

      await Promise.all([fetchNotifications(), notiStore.fetchUnread()])
    }

    const onMessageClick = useCallback(
      (e: MouseEvent<HTMLAnchorElement>, item: MessageFront) => {
        if (item.type === 'category') {
          if (!item.isRead) {
            setTimeout(() => {
              toSync(readMessage)(item.id)
              toSync(fetchNotifications)()
              toSync(notiStore.fetchUnread)()
            }, 0)
          }
          return
        }

        if (location.pathname == item.targetPath) {
          e.preventDefault()
          forceUpdate()

          if (item.contentArticle?.id) {
            setTimeout(() => {
              toSync(readArticle)(item.contentArticle.id)
              toSync(fetchNotifications)()
              toSync(notiStore.fetchUnread)()
            }, 0)
          }
        }
      },
      [location.pathname, forceUpdate, fetchNotifications, notiStore]
    )

    const onAcceptInviteClick = useCallback(
      async (e: MouseEvent<HTMLButtonElement>, item: MessageFront) => {
        e.preventDefault()
        if (
          categoryAcceptingId === item.id ||
          !item.targetCategory?.frontId ||
          !item.siteFrontId ||
          !item.inviteMetadata?.inviteCode
        ) {
          return
        }

        try {
          setCategoryAcceptingId(item.id)
          const resp: ResponseData<null> = await acceptCategoryInvite(
            item.siteFrontId,
            item.targetCategory.frontId,
            item.inviteMetadata.inviteCode
          )
          if (resp.code) {
            return
          }
          await readMessage(item.id)
          await Promise.all([fetchNotifications(), notiStore.fetchUnread()])
          setAcceptedInvites((prev) => ({ ...prev, [item.id]: true }))
          await cateStore.fetchCategoryList(item.siteFrontId, true)
          if (item.targetPath && item.targetPath !== '#') {
            navigate({ to: item.targetPath })
          }
        } catch (error) {
          console.error('accept category invite error', error)
        } finally {
          setCategoryAcceptingId(null)
        }
      },
      [cateStore, categoryAcceptingId, fetchNotifications, navigate, notiStore]
    )

    useEffect(() => {
      toSync(fetchNotifications)()
    }, [fetchNotifications])

    const hasJoinedCategory = useCallback(
      (siteFrontId?: string, categoryFrontId?: string | null) => {
        if (
          !siteFrontId ||
          !categoryFrontId ||
          cateStore.siteFrontId !== siteFrontId
        ) {
          return false
        }
        return cateStore.categories.some(
          (cat) => cat.frontId === categoryFrontId
        )
      },
      [cateStore.categories, cateStore.siteFrontId]
    )

    const renderMessageTitle = useCallback(
      (item: MessageFront, joinedCategory = false) => {
        const avatar = (
          <BAvatar
            size={listType == 'list_page' ? 22 : 20}
            fontSize={12}
            username={item.senderUserName}
            showUsername
          />
        )

        if (item.type === 'category' && item.targetCategory) {
          const categoryNameComponent =
            joinedCategory && item.targetPath && item.targetPath !== '#' ? (
              <Link
                to={item.targetPath}
                className="text-primary hover:underline font-normal"
              />
            ) : (
              <span className="font-normal" />
            )

          return (
            <Trans
              i18nKey={'categoryInviteMessage'}
              values={{
                categoryName: item.targetCategory.name,
              }}
              components={{
                userAvartar: avatar,
                categoryName: categoryNameComponent,
              }}
            />
          )
        }

        const targetArticle = item.targetData as unknown as Article
        if (
          targetArticle &&
          Number(targetArticle.authorId) === Number(authState.userID)
        ) {
          if (
            targetArticle.title &&
            targetArticle.contentForm?.frontId != 'chat'
          ) {
            return (
              <Trans
                i18nKey={'replyUnderPost'}
                values={{
                  title: targetArticle.title,
                }}
                components={{
                  userAvartar: avatar,
                }}
              />
            )
          }

          return (
            <Trans
              i18nKey={'replyToYou'}
              components={{
                userAvartar: avatar,
              }}
            />
          )
        }

        return (
          <Trans
            i18nKey={'replyToPost'}
            values={{
              title: targetArticle?.title,
            }}
            components={{
              userAvartar: avatar,
            }}
          />
        )
      },
      [authState.userID, listType]
    )

    const renderMessageDetail = useCallback((item: MessageFront) => {
      if (item.type === 'category') {
        return null
      }

      return <div className="text-gray-500">{item.contentArticle?.content}</div>
    }, [])

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
          notiList.map((item) => {
            const joinedCategory =
              item.type === 'category'
                ? (item.categoryJoined ?? false) ||
                  acceptedInvites[item.id] ||
                  hasJoinedCategory(
                    item.siteFrontId,
                    item.targetCategory?.frontId || null
                  )
                : false

            const content = (
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
                      {renderMessageTitle(item, joinedCategory)}
                    </div>
                    <div className="flex pl-2">
                      {!item.isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="py-0 px-0 w-[24px] h-[24px]"
                          title={t('markAsRead')}
                          onClick={(e) => onMarkAsReadClick(e, item)}
                        >
                          <CheckIcon size={18} />
                        </Button>
                      )}
                      {item.type !== 'category' && (
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
                      )}
                    </div>
                  </div>
                  {renderMessageDetail(item)}
                  {item.type === 'category' && (
                    <div className="flex justify-end mt-3">
                      {joinedCategory ? (
                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                          <CheckIcon size={16} />
                          {t('invitationAccepted')}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={(e) => onAcceptInviteClick(e, item)}
                          disabled={
                            !item.inviteMetadata?.inviteCode ||
                            !item.targetCategory?.frontId ||
                            categoryAcceptingId === item.id
                          }
                        >
                          {categoryAcceptingId === item.id
                            ? t('loading')
                            : t('acceptInvitation')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )

            if (
              item.type === 'category' &&
              joinedCategory &&
              item.targetPath &&
              item.targetPath !== '#'
            ) {
              return (
                <Link
                  to={item.targetPath}
                  className="hover:no-underline"
                  key={item.id}
                >
                  {content}
                </Link>
              )
            }

            if (item.type === 'category') {
              return (
                <div className="hover:no-underline" key={item.id}>
                  {content}
                </div>
              )
            }

            return (
              <Link
                to={item.targetPath}
                className="hover:no-underline"
                key={item.id}
                onClick={(e: MouseEvent<HTMLAnchorElement>) =>
                  onMessageClick(e, item)
                }
              >
                {content}
              </Link>
            )
          })
        )}

        {listType == 'list_page' && <ListPagination pageState={pageState} />}
      </>
    )
  }
)

export default MessageList
