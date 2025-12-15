import type { Query } from '@tanstack/react-query'
import type {
  PersistedClient,
  Persister,
} from '@tanstack/react-query-persist-client'
import { DBSchema, openDB } from 'idb'

interface QueryDB extends DBSchema {
  queries: {
    key: string
    value: PersistedClient
  }
}

const QUERY_DB_NAME = 'queryDB'
const QUERY_DB_VERSION = 1
const QUERY_STORE_KEY = 'reactQuery'

let queryDBInstance: ReturnType<typeof openDB<QueryDB>> | null = null

const getQueryDB = () => {
  if (!queryDBInstance) {
    queryDBInstance = openDB<QueryDB>(QUERY_DB_NAME, QUERY_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('queries')) {
          db.createObjectStore('queries')
        }
      },
    })
  }
  return queryDBInstance
}

export const createIDBPersister = (): Persister => {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        const db = await getQueryDB()
        await db.put('queries', client, QUERY_STORE_KEY)
      } catch (err) {
        console.error('persist client error:', err)
      }
    },
    restoreClient: async () => {
      try {
        const db = await getQueryDB()
        return await db.get('queries', QUERY_STORE_KEY)
      } catch (err) {
        console.error('restore client error:', err)
        return undefined
      }
    },
    removeClient: async () => {
      try {
        const db = await getQueryDB()
        await db.delete('queries', QUERY_STORE_KEY)
      } catch (err) {
        console.error('remove client error:', err)
      }
    },
  }
}

export const PERSIST_QUERY_KEYS = ['articles'] as const

export const shouldPersistQuery = (query: Query) => {
  const queryKey = query.queryKey
  return PERSIST_QUERY_KEYS.some(
    (key) => Array.isArray(queryKey) && queryKey[0] === key
  )
}
