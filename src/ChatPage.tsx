import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useDebouncedCallback } from 'use-debounce'
import { useShallow } from 'zustand/react/shallow'

import ChatCard from './components/ChatCard'

import { getChatList, readManyArticle } from './api/article'
import { readArticle } from './api/message'
import {
  CHAT_DATA_CACHE_KEY,
  EV_ON_EDIT_CLICK,
  EV_ON_REPLY_CLICK,
  REPLY_BOX_PLACEHOLDER_HEIGHT,
} from './constants/constants'
import { defaultPageState } from './constants/defaults'
import { toSync } from './lib/fire-and-forget'
import { bus, noop, scrollToBottom } from './lib/utils'
import {
  useAuthedUserStore,
  useEventSourceStore,
  useLoading,
  useReplyBoxStore,
} from './state/global'
import { Article, Category, SSE_EVENT } from './types/types'

interface ChatListState {
  list: Article[]
  prevCursor: string
  nextCursor: string
  initialized: boolean
}

interface ChatListCache {
  [x: string]: ChatListState
}

interface ChatListMap {
  [x: string]: Article
}

interface ChatPageProps {
  currCate: Category
  onLoad?: () => void
}

type SaveChatList = (
  _isNext: boolean,
  list: Article[],
  prevCursor: string,
  nextCursor: string
) => void

const getLocalChatData = () => {
  const dataStr = localStorage.getItem(CHAT_DATA_CACHE_KEY)
  if (!dataStr) return null

  try {
    return JSON.parse(dataStr) as ChatListCache
  } catch (err) {
    console.error('parse chat data cache error: ', err)
  }

  return null
}

const getLocalChatListData = (key: string) => {
  const data = getLocalChatData()
  if (data && data[key]) {
    return data[key]
  }

  return null
}

const setLocalChatListData = (key: string, val: ChatListState) => {
  const data = getLocalChatData()

  let newData = {
    [key]: val,
  } as ChatListCache

  if (data) {
    newData = Object.assign(data, newData)
  }

  localStorage.setItem(CHAT_DATA_CACHE_KEY, JSON.stringify(newData))
}

// const deleteLocalChatListData = (key: string) => {
//   const data = getLocalChatData()
//
//   if (data && data[key]) {
//     delete data[key]
//     localStorage.setItem(CHAT_DATA_CACHE_KEY, JSON.stringify(data))
//   }
// }

const ChatPage: React.FC<ChatPageProps> = ({ currCate, onLoad = noop }) => {
  const [chatList, setChatList] = useState<ChatListState>({
    list: [],
    prevCursor: '',
    nextCursor: '',
    initialized: false,
  })
  const [currCursor, setCurrCursor] = useState('')
  const [replySuccess, setReplySuccess] = useState(false)
  const [atBottom, setAtBottom] = useState(false)

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
        saveChatList: SaveChatList,
        prevCursor: string
      ) => (ev: MessageEvent<string>) => void)
    | null
  >(null)

  const { siteFrontId, categoryFrontId } = useParams()

  const { setShowReplyBox, setReplyBoxState } = useReplyBoxStore(
    useShallow(({ setShow, setState }) => ({
      setShowReplyBox: setShow,
      setReplyBoxState: setState,
    }))
  )

  const eventSource = useEventSourceStore((state) => state.eventSource)

  const location = useLocation()

  const { permit, currUserId } = useAuthedUserStore(
    useShallow(({ permit, userID }) => ({ permit, currUserId: userID }))
  )

  const saveChatList = useCallback(
    (
      _isNext: boolean,
      list: Article[],
      prevCursor: string,
      nextCursor: string
    ) => {
      let data: ChatListState = {
        list,
        prevCursor,
        nextCursor,
        initialized: true,
      }

      const existingData = getLocalChatListData(location.pathname)
      if (existingData) {
        const tempMap = existingData.list.reduce((prev, curr) => {
          prev[curr.id] = curr
          return prev
        }, {} as ChatListMap)

        const mergedList = [...existingData.list]

        for (const item of list) {
          if (item.id in tempMap) {
            // 更新现有项目
            const index = mergedList.findIndex(
              (existing) => existing.id === item.id
            )
            if (index !== -1) {
              mergedList[index] = { ...mergedList[index], ...item }
            }
          } else {
            // 添加新项目
            mergedList.push(item)
          }
        }

        // 排序
        mergedList.sort((a, b) => {
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
            Number(a.id) - Number(b.id)
          )
        })

        data = {
          list: mergedList,
          prevCursor,
          nextCursor,
          initialized: true,
        }
      }

      setChatList((state) => ({ ...state, ...data }))
      setLocalChatListData(location.pathname, data)
    },
    [location.pathname]
  )

  const fetchChatList = useCallback(
    async (isNext: boolean, force = false, withCursor = true, init = false) => {
      if (isLoading) return

      setLoading(true)

      try {
        let cursor: string | undefined
        if (withCursor) {
          if (isNext) {
            cursor = chatList.nextCursor
          } else {
            cursor = chatList.prevCursor
          }

          if (!cursor) {
            cursor = currCursor
          }
        }

        /* console.log('cursor: ', cursor) */

        if (!force && (!cursor || !currCate?.frontId || !siteFrontId)) return

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

        if (!code && data) {
          const existingData = getLocalChatListData(location.pathname)
          saveChatList(
            isNext,
            data.articles || [],
            init &&
              existingData &&
              data.articles &&
              existingData.list.length > data.articles.length
              ? ''
              : data.prevCursor,
            data.nextCursor
          )
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
    [
      currCate,
      siteFrontId,
      saveChatList,
      isLoading,
      chatList,
      setLoading,
      currCursor,
    ]
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

  useEffect(() => {
    const CreateOnNewMessage =
      (atBottom: boolean, saveChatList: SaveChatList, prevCursor: string) =>
      (ev: MessageEvent<string>) => {
        try {
          /* console.log('new message data str: ', ev.data) */
          const item = JSON.parse(ev.data) as Article

          /* console.log('new message data: ', item) */

          if (item) {
            saveChatList(true, [item], prevCursor, '')
            /* console.log('at bottom: ', atBottom) */

            if (atBottom) {
              setTimeout(() => {
                scrollToBottom('smooth')
              }, 0)
            }
          }
        } catch (err) {
          console.error('parse event data error in newmessage event: ', err)
        }
      }

    replyHandlerRef.current = onReplyClick
    editHandlerRef.current = onEditClick
    newMessageHandlerRef.current = CreateOnNewMessage
  }, [onReplyClick, onEditClick])

  useEffect(() => {
    const replyHandler = replyHandlerRef.current
    const editHandler = editHandlerRef.current

    if (replyHandler) {
      bus.on(EV_ON_REPLY_CLICK, replyHandler)
    }

    if (editHandler) {
      bus.on(EV_ON_EDIT_CLICK, editHandler)
    }

    return () => {
      if (replyHandler) {
        bus.off(EV_ON_REPLY_CLICK, replyHandler)
      }
      if (editHandler) {
        bus.off(EV_ON_EDIT_CLICK, editHandler)
      }
    }
  }, [])

  useEffect(() => {
    setReplyBoxState({
      mode: 'chat',
      editType: 'create',
      edittingArticle: null,
      replyToArticle: null,
      category: currCate,
      disabled: !permit('article', 'reply'),
      onSuccess: (_, actionType) => {
        setReplyBoxState({
          editType: 'create',
          edittingArticle: null,
          replyToArticle: null,
        })

        if (actionType != 'edit') {
          /* await fetchChatList(false, true, false) */
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
  }, [currCate, fetchChatList, permit, setReplyBoxState, setReplySuccess])

  const topObserverHandler = useDebouncedCallback(
    (entries: IntersectionObserverEntry[]) => {
      entries.forEach((ent) => {
        if (ent.target == chatTopRef.current && ent.isIntersecting) {
          /* console.log('at top') */
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

  const debouncedReadManyMessage = useDebouncedCallback((ids: string[]) => {
    const unreadIds: string[] = []

    ids.forEach((id) => {
      if (!readingIdList.current.has(id)) {
        unreadIds.push(id)
        readingIdList.current.add(id)
      }
    })

    /* console.log('debunced read ids: ', unreadIds) */

    toSync(readManyArticle, () => {
      unreadIds.forEach((id) => {
        readIdList.current.delete(id)
        readingIdList.current.delete(id)

        setChatList((currChatList) => {
          const list = currChatList.list
          const readItemIdx = list.findIndex((item) => item.id == id)

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
  }, 200)

  useEffect(() => {
    setShowReplyBox(true)
    return () => {
      setShowReplyBox(false)
    }
  }, [setShowReplyBox])

  useEffect(() => {
    const container = document.querySelector('#outer-container')

    if (!container) return

    let topObserver: IntersectionObserver | null = null
    let bottomObserver: IntersectionObserver | null = null
    let atBottomObserver: IntersectionObserver | null = null

    if (chatTopRef.current) {
      topObserver = new IntersectionObserver(topObserverHandler, {
        root: container,
        rootMargin: `${container.getBoundingClientRect().height / 2}px`,
      })

      topObserver.observe(chatTopRef.current)
    }

    if (chatBottomRef.current) {
      bottomObserver = new IntersectionObserver(bottomObserverHandler, {
        root: container,
        rootMargin: `${container.getBoundingClientRect().height / 2}px`,
      })

      bottomObserver.observe(chatBottomRef.current)

      atBottomObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((ent) => {
            if (ent.target == chatBottomRef.current && ent.isIntersecting) {
              /* console.log('touch bottom: ', true) */
              setAtBottom(true)
            } else {
              /* console.log('touch bottom: ', false) */
              setAtBottom(false)
            }
          })
        },
        {
          root: container,
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
  }, [fetchChatList])

  useEffect(() => {
    const container = document.querySelector('#outer-container')

    if (!container) return

    const inViewObserver: IntersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((ent) => {
          const target = ent.target as HTMLDivElement
          if (listItemReverseRef.current.has(target)) {
            if (ent.isIntersecting) {
              /* console.log(
               *   'message enter view: ',
               *   listItemReverseRef.current.get(target)
               * ) */
              const message = listItemReverseRef.current.get(target)
              if (
                message &&
                message.authorId != currUserId &&
                message.currUserState &&
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
        root: container,
      }
    )

    for (const [_id, el] of listItemRef.current.entries()) {
      inViewObserver.observe(el)
    }

    return () => {
      inViewObserver.disconnect()
    }
  }, [chatList.initialized, currUserId, chatList])

  // 初始化数据
  useEffect(() => {
    toSync(fetchChatList, () => {
      const chatListState: Partial<ChatListState> = {
        initialized: true,
      }

      scrollToBottom('instant', () => {
        setChatList((state) => {
          return {
            ...state,
            ...chatListState,
          }
        })
        onLoad()
      })
    })(false, true, false, true)

    return () => {
      setCurrCursor('')
      setChatList({
        list: [],
        prevCursor: '',
        nextCursor: '',
        initialized: false,
      })
    }
  }, [siteFrontId, categoryFrontId])

  useEffect(() => {
    /* console.log('reply success: ', replySuccess) */
    if (replySuccess) {
      setReplySuccess(false)
      scrollToBottom('smooth')
    }
  }, [replySuccess])

  useEffect(() => {
    const newMessageHandler = newMessageHandlerRef.current
      ? newMessageHandlerRef.current(
          atBottom,
          saveChatList,
          chatList.prevCursor
        )
      : null

    if (eventSource && newMessageHandler) {
      eventSource.addEventListener(SSE_EVENT.NewMessage, newMessageHandler)
    }

    return () => {
      if (eventSource && newMessageHandler) {
        eventSource.removeEventListener(SSE_EVENT.NewMessage, newMessageHandler)
      }
    }
  }, [eventSource, atBottom, saveChatList, chatList.prevCursor])

  return (
    <div style={{ paddingBottom: `${REPLY_BOX_PLACEHOLDER_HEIGHT}px` }}>
      <div ref={chatTopRef}></div>
      <div>
        {chatList.list.map((item) => {
          return (
            <ChatCard
              article={item}
              key={item.id}
              onSuccess={() => fetchChatList(false)}
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
  )
}

export default ChatPage
