import { useCallback, useEffect, useRef, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { useShallow } from 'zustand/react/shallow'

import { toSync } from '@/lib/fire-and-forget'
import {
  bus,
  highlightElement,
  noop,
  scrollToBottom,
  scrollToElement,
} from '@/lib/utils'

import { getChatList, readManyArticle } from '@/api/article'
import {
  EV_ON_EDIT_CLICK,
  EV_ON_REPLY_CLICK,
  NAV_HEIGHT,
  REPLY_BOX_PLACEHOLDER_HEIGHT,
} from '@/constants/constants'
import { defaultPageState } from '@/constants/defaults'
import { usePermit } from '@/hooks/use-auth'
import { useLocationKey } from '@/hooks/use-location-key'
import { useSiteParams } from '@/hooks/use-site-params'
import { getIDBChatList, saveIDBChatList } from '@/state/chat-db'
import {
  useAuthedUserStore,
  useLoading,
  useReplyBoxStore,
} from '@/state/global'
import {
  Article,
  ArticleAction,
  CHAT_DB_EVENT,
  Category,
  ChatListState,
  ChatMessage,
  ChatRoom,
} from '@/types/types'

import ChatCard, { ChatCardSkeleton } from './ChatCard'

interface ChatListProps {
  currCate: Category
  onLoad?: () => void
  onReady?: () => void
}

const defaultChatListData: ChatListState = {
  list: [],
  prevCursor: '',
  nextCursor: '',
  initialized: false,
  lastReadCursor: '',
  lastScrollTop: 0,
  path: '',
}

const ChatList: React.FC<ChatListProps> = ({
  currCate,
  onLoad = noop,
  onReady = noop,
}) => {
  const [chatList, setChatList] = useState<ChatListState>({
    ...defaultChatListData,
  })
  const [currCursor, setCurrCursor] = useState('')
  const [replySuccess, setReplySuccess] = useState(false)
  const [atBottom, setAtBottom] = useState(false)
  const [isScrollReady, setIsScrollReady] = useState(false)

  const listItemRef = useRef<Map<string, HTMLDivElement>>(new Map())
  const listItemReverseRef = useRef<Map<HTMLDivElement, Article>>(new Map())
  const readIdList = useRef<Set<string>>(new Set())
  const readingIdList = useRef<Set<string>>(new Set())

  const isLoading = useLoading((state) => state.loading)
  const setLoading = useLoading((state) => state.setLoading)

  const chatTopRef = useRef<HTMLDivElement | null>(null)
  const chatBottomRef = useRef<HTMLDivElement | null>(null)
  const replyHandlerRef = useRef<((x: Article) => void) | null>(null)
  const editHandlerRef = useRef<((x: Article) => void) | null>(null)
  const newMessageHandlerRef = useRef<
    | ((
        atBottom: boolean,
        siteFrontId: string,
        categoryFrontId: string
      ) => (data: ChatMessage) => void)
    | null
  >(null)

  const refreshChatListHandlerRef = useRef<
    | ((
        siteFrontId: string,
        categoryFrontId: string
      ) => (roomData: ChatRoom, _messageList?: ChatMessage[]) => void)
    | null
  >(null)

  const deleteMessageHandlerRef = useRef<
    | ((
        siteFrontId: string,
        categoryFrontId: string
      ) => (messageId: string, roomPath: string) => void)
    | null
  >(null)

  const { siteFrontId, categoryFrontId } = useSiteParams()

  const { setShowReplyBox, setReplyBoxState } = useReplyBoxStore(
    useShallow(({ setShow, setState }) => ({
      setShowReplyBox: setShow,
      setReplyBoxState: setState,
    }))
  )

  const isLogined = useAuthedUserStore((state) => state.isLogined)

  const { location, locationKey } = useLocationKey()
  const locationHash = location.hash

  const currUserId = useAuthedUserStore((state) => state.userID)
  const hasReplyPermit = usePermit('article', 'reply')

  const fetchChatList = useCallback(
    async (isNext: boolean, force = false, withCursor = true, init = false) => {
      if (isLoading) return

      setLoading(true)

      try {
        let cursor: string | undefined
        if (withCursor) {
          setChatList((currentChatList) => {
            if (isNext) {
              cursor = currentChatList.nextCursor
            } else {
              cursor = currentChatList.prevCursor
            }

            if (!cursor) {
              cursor = currCursor
            }
            return currentChatList
          })
        }

        /* console.log('cursor: ', cursor) */
        if (!siteFrontId || !categoryFrontId) return

        if (!force && (!cursor || !currCate?.frontId)) return

        const { code, data } = await getChatList(
          cursor,
          isNext,
          defaultPageState.pageSize,
          currCate.frontId,
          {
            siteFrontId,
          }
        )

        if (isNext) {
          if (data.nextCursor == cursor) {
            data.nextCursor = ''
          }
        } else {
          if (data.prevCursor == cursor) {
            data.prevCursor = ''
          }
        }

        if (!code && data.articles) {
          const existingData = await getIDBChatList(
            siteFrontId,
            categoryFrontId
          )

          const finalPrevCursor =
            init && existingData && existingData.prevCursor
              ? existingData.prevCursor
              : data.prevCursor

          const finalNextCursor =
            init && existingData && existingData.nextCursor
              ? existingData.nextCursor
              : data.nextCursor

          await saveIDBChatList(
            siteFrontId,
            categoryFrontId,
            [...data.articles],
            finalPrevCursor,
            finalNextCursor
          )

          if (init) {
            setChatList({
              list: data.articles,
              prevCursor: finalPrevCursor,
              nextCursor: finalNextCursor,
              initialized: false,
              lastReadCursor: '',
              lastScrollTop: 0,
              path: `/z/${siteFrontId}/b/${categoryFrontId}`,
            })
          }

          setCurrCursor(cursor || '')
          return data
        }
      } catch (err) {
        console.error('fetch chat list error: ', err)
      } finally {
        setLoading(false)
      }

      return null
    },
    [currCate, siteFrontId, categoryFrontId, isLoading, setLoading, currCursor]
  )

  const handleChatCardSuccess = useCallback(
    async (action: ArticleAction, id?: string, updates?: Partial<Article>) => {
      if (action === 'react' && id) {
        if (!updates) {
          await fetchChatList(false)
          return
        }

        setChatList((current) => {
          const targetIdx = current.list.findIndex((item) => item.id === id)
          if (targetIdx === -1) {
            return current
          }

          const targetArticle = current.list[targetIdx]
          const nextArticle: Article = {
            ...targetArticle,
            ...(updates.reactCounts
              ? { reactCounts: { ...updates.reactCounts } }
              : {}),
            ...(updates.currUserState
              ? { currUserState: { ...updates.currUserState } }
              : {}),
          }

          const nextList = [...current.list]
          nextList[targetIdx] = nextArticle

          return {
            ...current,
            list: nextList,
          }
        })

        return
      }

      await fetchChatList(false)
    },
    [fetchChatList]
  )

  const onReplyClick = useCallback(
    (article: Article) => {
      setReplyBoxState({
        editType: 'reply',
        replyToArticle: article,
        edittingArticle: null,
      })
    },
    [setReplyBoxState]
  )

  const onEditClick = useCallback(
    (article: Article) => {
      setReplyBoxState({
        editType: 'edit',
        edittingArticle: article,
        replyToArticle: article.replyToArticle,
      })
    },
    [setReplyBoxState]
  )

  const getLocalChatList = toSync(getIDBChatList, (data) => {
    const currentPath = `/z/${siteFrontId}/b/${categoryFrontId}`

    if (data && data.path === currentPath) {
      setChatList((state) => ({ ...state, ...data }))
    } else {
      setChatList(() => ({ ...defaultChatListData, path: currentPath }))
    }
  })

  useEffect(() => {
    const CreateOnNewMessage =
      (atBottom: boolean, siteFrontId: string, categoryFrontId: string) =>
      (data: ChatMessage) => {
        if (data.roomPath != `/z/${siteFrontId}/b/${categoryFrontId}`) return
        getLocalChatList(siteFrontId, categoryFrontId)
        if (atBottom) {
          setTimeout(() => {
            scrollToBottom('smooth')
          }, 0)
        }
      }

    const CreateRefreshChatList =
      (siteFrontId: string, categoryFrontId: string) =>
      (roomData: ChatRoom, _messageList?: ChatMessage[]) => {
        if (roomData.path != `/z/${siteFrontId}/b/${categoryFrontId}`) return
        getLocalChatList(siteFrontId, categoryFrontId)
      }

    const CreateDeleteMessageHandler =
      (siteFrontId: string, categoryFrontId: string) =>
      (_messageId: string, roomPath: string) => {
        if (roomPath != `/z/${siteFrontId}/b/${categoryFrontId}`) return
        getLocalChatList(siteFrontId, categoryFrontId)
      }

    replyHandlerRef.current = onReplyClick
    editHandlerRef.current = onEditClick
    newMessageHandlerRef.current = CreateOnNewMessage
    refreshChatListHandlerRef.current = CreateRefreshChatList
    deleteMessageHandlerRef.current = CreateDeleteMessageHandler
  }, [onReplyClick, onEditClick, getLocalChatList])

  useEffect(() => {
    const replyHandler = replyHandlerRef.current
    const editHandler = editHandlerRef.current
    const newMessageFn = newMessageHandlerRef.current
    const newMessageHandler =
      newMessageFn && siteFrontId && categoryFrontId
        ? newMessageFn(atBottom, siteFrontId, categoryFrontId)
        : null
    const refreshChatListFn = refreshChatListHandlerRef.current
    const refreshChatListHandler =
      refreshChatListFn && siteFrontId && categoryFrontId
        ? refreshChatListFn(siteFrontId, categoryFrontId)
        : null
    const deleteMessageFn = deleteMessageHandlerRef.current
    const deleteMessageHandler =
      deleteMessageFn && siteFrontId && categoryFrontId
        ? deleteMessageFn(siteFrontId, categoryFrontId)
        : null

    if (replyHandler) {
      bus.on(EV_ON_REPLY_CLICK, replyHandler)
    }

    if (editHandler) {
      bus.on(EV_ON_EDIT_CLICK, editHandler)
    }

    if (newMessageHandler) {
      bus.on(CHAT_DB_EVENT.SaveMessage, newMessageHandler)
    }

    if (refreshChatListHandler) {
      bus.on(CHAT_DB_EVENT.SaveChatList, refreshChatListHandler)
    }

    if (deleteMessageHandler) {
      bus.on(CHAT_DB_EVENT.DeleteMessage, deleteMessageHandler)
    }

    return () => {
      if (replyHandler) {
        bus.off(EV_ON_REPLY_CLICK, replyHandler)
      }

      if (editHandler) {
        bus.off(EV_ON_EDIT_CLICK, editHandler)
      }

      if (newMessageHandler) {
        bus.off(CHAT_DB_EVENT.SaveMessage, newMessageHandler)
      }

      if (refreshChatListHandler) {
        bus.off(CHAT_DB_EVENT.SaveChatList, refreshChatListHandler)
      }

      if (deleteMessageHandler) {
        bus.off(CHAT_DB_EVENT.DeleteMessage, deleteMessageHandler)
      }
    }
  }, [atBottom, siteFrontId, categoryFrontId])

  useEffect(() => {
    setReplyBoxState({
      mode: 'chat',
      editType: 'create',
      edittingArticle: null,
      replyToArticle: null,
      category: currCate,
      disabled: !hasReplyPermit,
      onSuccess: (_, actionType) => {
        setReplyBoxState({
          editType: 'create',
          edittingArticle: null,
          replyToArticle: null,
        })

        if (actionType != 'edit') {
          setReplySuccess(true)
        }
      },
      onRemoveReply() {
        setReplyBoxState({
          editType: 'create',
          edittingArticle: null,
          replyToArticle: null,
        })
      },
    })
  }, [currCate, hasReplyPermit, setReplyBoxState, setReplySuccess])

  const topObserverHandler = useDebouncedCallback(
    (entries: IntersectionObserverEntry[]) => {
      entries.forEach((ent) => {
        if (ent.target == chatTopRef.current && ent.isIntersecting) {
          if (isLoading) return
          setChatList((currentChatList) => {
            if (!currentChatList.initialized) return currentChatList

            if (currentChatList.prevCursor) {
              toSync(fetchChatList)(false)
            }
            return currentChatList
          })
        }
      })
    },
    200
  )

  const bottomObserverHandler = useDebouncedCallback(
    (entries: IntersectionObserverEntry[]) => {
      entries.forEach((ent) => {
        if (ent.target == chatBottomRef.current && ent.isIntersecting) {
          /* console.log('at bottom') */
          setChatList((currentChatList) => {
            if (!currentChatList.initialized) return currentChatList
            if (currentChatList.nextCursor) {
              toSync(fetchChatList)(true)
            }
            return currentChatList
          })
        }
      })
    },
    200
  )

  const debouncedReadManyMessage = useDebouncedCallback(
    useCallback(
      (ids: string[]) => {
        const unreadIds: string[] = []

        ids.forEach((id) => {
          if (!readingIdList.current.has(id)) {
            unreadIds.push(id)
            readingIdList.current.add(id)
          }
        })

        /* console.log('debunced read ids: ', unreadIds) */

        if (unreadIds.length == 0 || !isLogined()) return

        toSync(readManyArticle, () => {
          unreadIds.forEach((id) => {
            readIdList.current.delete(id)
            readingIdList.current.delete(id)

            setChatList((currChatList) => {
              const list = currChatList.list
              const readItemIdx = list.findIndex((item) => item.id == id)

              if (readItemIdx === -1) {
                return currChatList
              }

              const item = list[readItemIdx]
              const newItem: Article = {
                ...item,
                currUserState: item.currUserState
                  ? {
                      ...item.currUserState,
                      isRead: true,
                    }
                  : null,
              }

              return {
                ...currChatList,
                list: [
                  ...list.slice(0, readItemIdx),
                  newItem,
                  ...list.slice(readItemIdx + 1),
                ],
              }
            })
          })
        })(unreadIds)
      },
      [isLogined]
    ),
    200
  )

  useEffect(() => {
    if (isScrollReady) {
      setShowReplyBox(true)
    }
    return () => {
      setShowReplyBox(false)
    }
  }, [setShowReplyBox, isScrollReady])

  useEffect(() => {
    let topObserver: IntersectionObserver | null = null
    let bottomObserver: IntersectionObserver | null = null
    let atBottomObserver: IntersectionObserver | null = null

    if (chatTopRef.current) {
      topObserver = new IntersectionObserver(topObserverHandler, {
        root: null,
        rootMargin: `${window.innerHeight / 2}px`,
      })

      topObserver.observe(chatTopRef.current)
    }

    if (chatBottomRef.current) {
      bottomObserver = new IntersectionObserver(bottomObserverHandler, {
        root: null,
        rootMargin: `${window.innerHeight / 2}px`,
      })

      bottomObserver.observe(chatBottomRef.current)

      atBottomObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((ent) => {
            if (ent.target == chatBottomRef.current && ent.isIntersecting) {
              setAtBottom(true)
            } else {
              setAtBottom(false)
            }
          })
        },
        {
          root: null,
        }
      )

      atBottomObserver.observe(chatBottomRef.current)
    }

    return () => {
      if (topObserver) {
        topObserver.disconnect()
        topObserver = null
      }

      if (bottomObserver) {
        bottomObserver.disconnect()
        bottomObserver = null
      }

      if (atBottomObserver) {
        atBottomObserver.disconnect()
        atBottomObserver = null
      }
    }
  }, [bottomObserverHandler, topObserverHandler])

  useEffect(() => {
    const inViewObserver: IntersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((ent) => {
          const target = ent.target as HTMLDivElement
          if (listItemReverseRef.current.has(target)) {
            if (ent.isIntersecting) {
              const message = listItemReverseRef.current.get(target)
              if (
                message &&
                message.authorId != currUserId &&
                message?.currUserState &&
                !message.currUserState.isRead
              ) {
                readIdList.current.add(message.id)

                debouncedReadManyMessage([...readIdList.current])
              }
            }
          }
        })
      },
      {
        root: null,
      }
    )

    for (const [_id, el] of listItemRef.current.entries()) {
      inViewObserver.observe(el)
    }

    return () => {
      inViewObserver.disconnect()
    }
  }, [chatList.initialized, currUserId, chatList, debouncedReadManyMessage])

  // Clear state immediately when route params change
  useEffect(() => {
    setCurrCursor('')
    setIsScrollReady(false)
    setChatList({
      list: [],
      prevCursor: '',
      nextCursor: '',
      initialized: false,
      lastReadCursor: '',
      lastScrollTop: 0,
      path: '',
    })
    readIdList.current.clear()
    readingIdList.current.clear()
  }, [siteFrontId, categoryFrontId])

  // init data
  useEffect(() => {
    // Only initialize when currCate is available
    if (!currCate || !currCate.frontId) {
      return
    }

    onReady()
    toSync(fetchChatList, () => {
      const chatListState: Partial<ChatListState> = {
        initialized: true,
      }

      const messageId = /^#message\d+$/.test(locationHash) ? locationHash : null

      const cb = () => {
        setChatList((state) => {
          return {
            ...state,
            ...chatListState,
          }
        })
        setIsScrollReady(true)
        onLoad()
      }

      const tryScrollToMessage = (retries = 5) => {
        if (messageId) {
          const targetMessageEl = document.querySelector(
            `${messageId}`
          ) as HTMLElement
          if (targetMessageEl) {
            scrollToElement(
              targetMessageEl,
              () => {
                cb()
                setTimeout(() => {
                  highlightElement(targetMessageEl, 'b-chat-highlight')
                }, 100)
              },
              'instant'
            )
          } else if (retries > 0) {
            setTimeout(() => tryScrollToMessage(retries - 1), 100)
          } else {
            scrollToBottom('instant', cb)
          }
        } else {
          scrollToBottom('instant', cb)
        }
      }

      setTimeout(tryScrollToMessage, 0)
    })(false, true, false, true)
  }, [siteFrontId, categoryFrontId, locationKey, locationHash, currCate])

  useEffect(() => {
    if (replySuccess) {
      setReplySuccess(false)
      scrollToBottom('smooth')
    }
  }, [replySuccess])

  // Handle hash changes after initial load
  useEffect(() => {
    if (!chatList.initialized) return

    const messageId = /^#message\d+$/.test(locationHash) ? locationHash : null

    if (messageId) {
      const tryScrollToMessage = (retries = 3) => {
        const targetMessageEl = document.querySelector(
          `${messageId}`
        ) as HTMLElement
        if (targetMessageEl) {
          scrollToElement(
            targetMessageEl,
            () => {
              setTimeout(() => {
                highlightElement(targetMessageEl, 'b-chat-highlight')
              }, 100)
            },
            'smooth'
          )
        } else if (retries > 0) {
          setTimeout(() => tryScrollToMessage(retries - 1), 100)
        }
      }

      setTimeout(tryScrollToMessage, 0)
    }
  }, [locationHash, chatList.initialized])

  useEffect(() => {
    if (!siteFrontId || !categoryFrontId || !currCate) return
    const currentPath = `/z/${siteFrontId}/b/${categoryFrontId}`

    // Only load local data if the path matches current route
    setChatList((prevState) => {
      if (prevState.path && prevState.path !== currentPath) {
        return { ...defaultChatListData, path: currentPath }
      }
      return prevState
    })

    // Delay loading local data to ensure state is cleared first
    setTimeout(() => {
      getLocalChatList(siteFrontId, categoryFrontId)
    }, 0)
  }, [siteFrontId, categoryFrontId, currCate])

  return (
    <div
      style={{
        position: 'relative',
        minHeight: `calc(100vh - ${NAV_HEIGHT}px - 2rem - 76px)`,
      }}
    >
      {!isScrollReady && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            backgroundColor: 'var(--background)',
            minHeight: `calc(100vh - ${NAV_HEIGHT}px  - 2rem - 76px)`,
          }}
        >
          {Array(5)
            .fill('')
            .map((_, idx) => (
              <ChatCardSkeleton key={idx} />
            ))}
        </div>
      )}
      <div
        style={{
          paddingBottom: `${REPLY_BOX_PLACEHOLDER_HEIGHT}px`,
          opacity: isScrollReady ? 1 : 0,
        }}
      >
        <div ref={chatTopRef}></div>
        <div>
          {chatList.list.map((item) => {
            return (
              <ChatCard
                article={item}
                key={item.id}
                onSuccess={handleChatCardSuccess}
                ref={(el) => {
                  if (el) {
                    listItemRef.current.set(item.id, el)
                    listItemReverseRef.current.set(el, item)
                  }
                }}
              />
            )
          })}
        </div>
        <div ref={chatBottomRef}></div>
      </div>
    </div>
  )
}

export default ChatList
