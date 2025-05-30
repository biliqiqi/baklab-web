import { DBSchema, openDB } from 'idb'

import { Article, ChatListState } from '@/types/types'

type ChatRoom = Pick<
  ChatListState,
  'path' | 'prevCursor' | 'nextCursor' | 'lastReadCursor' | 'lastScrollTop'
>

interface ChatMessage extends Article {
  roomPath: string
}

interface ChatDB extends DBSchema {
  chatRooms: {
    key: string
    value: ChatRoom
    indexes: {
      path: string
    }
  }
  chatMessages: {
    key: string
    value: ChatMessage
    indexes: {
      'by-room': string
    }
  }
}

const CHAT_DB_NAME = 'chatDB'
const CHAT_DB_VERSION = 1

export const chatDB = await openDB<ChatDB>(CHAT_DB_NAME, CHAT_DB_VERSION, {
  upgrade(db, oldVersion, newVersion) {
    console.log(
      `Upgrading database from version ${oldVersion} to ${newVersion}`
    )
    if (!db.objectStoreNames.contains('chatRooms')) {
      db.createObjectStore('chatRooms', { keyPath: 'path' })
    }

    if (!db.objectStoreNames.contains('chatMessages')) {
      const chatMessages = db.createObjectStore('chatMessages', {
        keyPath: 'id',
      })
      chatMessages.createIndex('by-room', 'roomId')
    }
  },
})

export const saveChatList = async (
  siteFrontId: string,
  categoryFrontId: string,
  list: Article[],
  prevCursor: string,
  nextCursor: string
) => {
  try {
    const roomPath = `/${siteFrontId}/bankuai/${categoryFrontId}`
    const tx = chatDB.transaction(['chatRooms', 'chatMessages'], 'readwrite')
    const chatRooms = tx.objectStore('chatRooms')
    const chatMessages = tx.objectStore('chatMessages')

    await chatRooms.put({
      path: roomPath,
      prevCursor: prevCursor,
      nextCursor: nextCursor,
      lastReadCursor: '',
      lastScrollTop: 0,
    })

    for (const item of list) {
      await chatMessages.put({ ...item, roomPath })
    }

    await tx.done
  } catch (err) {
    console.error('save chat list error: ', err)
  }
}

export const getChatList = async (
  siteFrontId: string,
  categoryFrontId: string
) => {
  let roomData: ChatRoom | undefined
  let list: ChatMessage[] = []

  try {
    const roomPath = `/${siteFrontId}/bankuai/${categoryFrontId}`
    const tx = chatDB.transaction(['chatRooms', 'chatMessages'], 'readonly')
    const chatRooms = tx.objectStore('chatRooms')
    const chatMessages = tx.objectStore('chatMessages')

    roomData = await chatRooms.get(roomPath)
    if (!roomData) {
      return null
    }

    list = await chatMessages.index('by-room').getAll(roomPath)
    await tx.done
    return {
      ...roomData,
      list,
      initialized: true,
    } as ChatListState
  } catch (err) {
    console.error('get chat list error: ', err)
  }

  return null
}

export const saveMessage = async (
  siteFrontId: string,
  categoryFrontId: string,
  article: Article
) => {
  try {
    const roomPath = `/${siteFrontId}/bankuai/${categoryFrontId}`
    const message = {
      ...article,
      roomPath,
    } as ChatMessage

    const tx = chatDB.transaction(['chatRooms', 'chatMessages'], 'readwrite')
    const chatMessages = tx.objectStore('chatMessages')
    const chatRooms = tx.objectStore('chatRooms')

    const roomData = await chatRooms.get(roomPath)
    if (!roomData) {
      await chatRooms.put({
        path: roomPath,
        prevCursor: '',
        nextCursor: '',
        lastReadCursor: '',
        lastScrollTop: 0,
      })
    }

    await chatMessages.put(message)
  } catch (err) {
    console.error('save message error: ', err)
  }
}

export const deleteMessage = async (messageId: string) => {
  try {
    const tx = chatDB.transaction(['chatMessages'], 'readwrite')
    const chatMessages = tx.objectStore('chatMessages')

    await chatMessages.delete(messageId)
    await tx.done
  } catch (err) {
    console.error('delete message error: ', err)
  }
}
