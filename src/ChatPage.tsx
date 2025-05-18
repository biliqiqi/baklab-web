import { useCallback, useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'

import ArticleCard from './components/ArticleCard'
import ChatCard from './components/ChatCard'

import { EV_ON_EDIT_CLICK, EV_ON_REPLY_CLICK } from './constants/constants'
import { bus } from './lib/utils'
import { useAuthedUserStore, useReplyBoxStore } from './state/global'
import { Article, ArticleListState, Category } from './types/types'

interface ChatPageProps {
  list: Article[]
  pageState: ArticleListState
  currCate: Category | null
  onRefresh: (() => void) | (() => Promise<void>)
}

const ChatPage: React.FC<ChatPageProps> = ({ list, currCate, onRefresh }) => {
  const replyHandlerRef = useRef<((x: Article) => void) | null>(null)
  const editHandlerRef = useRef<((x: Article) => void) | null>(null)

  const { setShowReplyBox, setReplyBoxState } = useReplyBoxStore(
    useShallow(({ setShow, setState }) => ({
      setShowReplyBox: setShow,
      setReplyBoxState: setState,
    }))
  )

  const { permit } = useAuthedUserStore(
    useShallow(({ permit }) => ({ permit }))
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

  if (!replyHandlerRef.current) {
    replyHandlerRef.current = onReplyClick
  }

  const onEditClick = useCallback(
    (article: Article) => {
      /* setReplyToArticle(parent)
       * setEdittingArticle(article)
       * setIsEditting(true) */
      setReplyBoxState({
        editType: 'edit',
        edittingArticle: article,
        replyToArticle: article.replyToArticle,
      })
    },
    [setReplyBoxState]
  )

  if (!editHandlerRef.current) {
    editHandlerRef.current = onEditClick
  }

  useEffect(() => {
    if (replyHandlerRef.current) {
      bus.off(EV_ON_REPLY_CLICK, replyHandlerRef.current)
      bus.on(EV_ON_REPLY_CLICK, replyHandlerRef.current)
    }

    if (editHandlerRef.current) {
      bus.off(EV_ON_EDIT_CLICK, editHandlerRef.current)
      bus.on(EV_ON_EDIT_CLICK, editHandlerRef.current)
    }

    return () => {
      if (replyHandlerRef.current) {
        bus.off(EV_ON_REPLY_CLICK, replyHandlerRef.current)
      }

      if (editHandlerRef.current) {
        bus.off(EV_ON_EDIT_CLICK, editHandlerRef.current)
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
      onSuccess: async (_, actionType) => {
        const res = onRefresh()
        if (res instanceof Promise) {
          await res
          if (actionType != 'edit') {
            setTimeout(() => {
              window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth',
              })
            }, 0)
          }
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
  }, [currCate, onRefresh, permit, setReplyBoxState])

  useEffect(() => {
    setShowReplyBox(true)
    return () => {
      setShowReplyBox(false)
    }
  }, [setShowReplyBox])

  return (
    <div className="pb-[170px]">
      {list.map((item) => {
        return <ChatCard article={item} key={item.id} onSuccess={onRefresh} />
      })}
    </div>
  )
}

export default ChatPage
