import { DBSchema, openDB } from 'idb'

import { bus } from '@/lib/utils'

import {
  Article,
  CHAT_DB_EVENT,
  ChatListState,
  ChatMessage,
  ChatRoom,
} from '@/types/types'

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
const CHAT_DB_VERSION = 2

let chatDBInstance: ReturnType<typeof openDB<ChatDB>> | null = null

const getChatDB = () => {
  if (!chatDBInstance) {
    chatDBInstance = openDB<ChatDB>(CHAT_DB_NAME, CHAT_DB_VERSION, {
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
          chatMessages.createIndex('by-room', 'roomPath')
        }
      },
    })
  }
  return chatDBInstance
}

export const saveIDBChatList = async (
  siteFrontId: string,
  categoryFrontId: string,
  list: Article[],
  prevCursor: string,
  nextCursor: string
) => {
  try {
    const roomPath = `/z/${siteFrontId}/b/${categoryFrontId}`
    const chatDB = await getChatDB()
    const tx = chatDB.transaction(['chatRooms', 'chatMessages'], 'readwrite')
    const chatRooms = tx.objectStore('chatRooms')
    const chatMessages = tx.objectStore('chatMessages')

    const roomData: ChatRoom = {
      path: roomPath,
      prevCursor: prevCursor,
      nextCursor: nextCursor,
      lastReadCursor: '',
      lastScrollTop: 0,
    }

    await chatRooms.put(roomData)

    const messageList: ChatMessage[] = list.map((item) => ({
      ...item,
      roomPath,
      idNum: Number(item.id) || 0,
      createdAtTimestamp: new Date(item.createdAt).getTime(),
    }))

    await Promise.all(messageList.map((item) => chatMessages.put(item)))

    await tx.done

    bus.emit(CHAT_DB_EVENT.SaveChatList, roomData, messageList)
  } catch (err) {
    console.error('save chat list error: ', err)
  }
}

export const getIDBChatList = async (
  siteFrontId: string,
  categoryFrontId: string
) => {
  let roomData: ChatRoom | undefined
  let list: ChatMessage[] = []

  try {
    const roomPath = `/z/${siteFrontId}/b/${categoryFrontId}`
    const chatDB = await getChatDB()
    const tx = chatDB.transaction(['chatRooms', 'chatMessages'], 'readonly')
    const chatRooms = tx.objectStore('chatRooms')
    const chatMessages = tx.objectStore('chatMessages')

    roomData = await chatRooms.get(roomPath)
    if (!roomData) {
      return null
    }

    // console.log('roomPath:', roomPath)

    list = await chatMessages.index('by-room').getAll(roomPath)
    list.sort((a, b) => {
      return a.createdAtTimestamp - b.createdAtTimestamp || a.idNum - b.idNum
    })

    // console.log('list:', list)

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

export const saveIDBMessage = async (
  siteFrontId: string,
  categoryFrontId: string,
  article: Article
) => {
  try {
    const roomPath = `/z/${siteFrontId}/b/${categoryFrontId}`
    const message: ChatMessage = {
      ...article,
      roomPath,
      idNum: Number(article.id) || 0,
      createdAtTimestamp: new Date(article.createdAt).getTime(),
    }

    const chatDB = await getChatDB()
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

    bus.emit(CHAT_DB_EVENT.SaveMessage, message)
  } catch (err) {
    console.error('save message error: ', err)
  }
}

export const deleteIDBMessage = async (messageId: string) => {
  try {
    const chatDB = await getChatDB()
    const tx = chatDB.transaction(['chatMessages'], 'readwrite')
    const chatMessages = tx.objectStore('chatMessages')

    const message = await chatMessages.get(messageId)

    if (!message) return

    const { roomPath } = message

    await chatMessages.delete(messageId)
    await tx.done

    bus.emit(CHAT_DB_EVENT.DeleteMessage, messageId, roomPath)
  } catch (err) {
    console.error('delete message error: ', err)
  }
}
