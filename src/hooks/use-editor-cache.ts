import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FieldValues, UseFormReturn } from 'react-hook-form'

const CACHE_PREFIX = 'editor-cache-'
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

interface CacheData<T = Record<string, unknown>> {
  data: T
  timestamp: number
}

export interface TargetArticleInfo {
  id: string
  authorName: string
  summary: string
  deleted: boolean
}

interface ReplyBoxCacheData {
  editType: 'reply' | 'edit' | 'create'
  content: string
  targetArticle?: TargetArticleInfo
  categoryId?: string
  mainArticleId?: string
  replyBoxHeight?: number
}

function isCacheData(obj: unknown): obj is CacheData {
  if (typeof obj !== 'object' || obj === null) return false
  const candidate = obj as Record<string, unknown>
  return (
    typeof candidate.data === 'object' &&
    candidate.data !== null &&
    typeof candidate.timestamp === 'number'
  )
}

function loadCacheData(
  cacheKey: string,
  expiryMs: number = CACHE_EXPIRY_MS
): Record<string, unknown> | null {
  if (!cacheKey) return null

  const fullKey = `${CACHE_PREFIX}${cacheKey}`

  try {
    const cached = localStorage.getItem(fullKey)
    if (!cached) {
      return null
    }

    const parsed: unknown = JSON.parse(cached)

    if (!isCacheData(parsed)) {
      localStorage.removeItem(fullKey)
      return null
    }

    const age = Date.now() - parsed.timestamp

    if (age > expiryMs) {
      localStorage.removeItem(fullKey)
      return null
    }

    return parsed.data
  } catch (error) {
    console.error('Failed to load from cache:', error)
    return null
  }
}

export function useInitialCache(cacheKey: string, enabled: boolean = true) {
  return useMemo(() => {
    if (!enabled || !cacheKey) return null
    return loadCacheData(cacheKey)
  }, [cacheKey, enabled])
}

export function useRawReplyBoxCache(siteFrontId: string) {
  const cacheKey = `replybox-${siteFrontId}`

  const loadRawCache = useCallback(() => {
    const fullKey = `${CACHE_PREFIX}${cacheKey}`
    try {
      const cached = localStorage.getItem(fullKey)
      if (!cached) return null

      const parsed: unknown = JSON.parse(cached)
      if (!isCacheData(parsed)) return null

      const age = Date.now() - parsed.timestamp
      if (age > CACHE_EXPIRY_MS) {
        localStorage.removeItem(fullKey)
        return null
      }

      return parsed.data
    } catch (error) {
      console.error('Failed to load raw cache:', error)
      return null
    }
  }, [cacheKey])

  return loadRawCache
}

export function useReplyBoxCache(
  siteFrontId: string,
  editType: 'reply' | 'edit' | 'create',
  targetArticle?: {
    id: string
    authorName: string
    summary: string
    deleted: boolean
  } | null,
  categoryId?: string,
  mainArticleId?: string
) {
  const cacheKey = useMemo(() => {
    if (editType === 'edit' && targetArticle?.id) {
      return `replybox-${siteFrontId}-edit-${targetArticle.id}`
    }
    return `replybox-${siteFrontId}`
  }, [siteFrontId, editType, targetArticle?.id])

  const [cacheCleared, setCacheCleared] = useState(false)

  const loadCache = useCallback((): ReplyBoxCacheData | null => {
    if (cacheCleared) return null

    const cached = loadCacheData(cacheKey)
    if (!cached) return null

    if (
      !('editType' in cached) ||
      !('content' in cached) ||
      typeof cached.content !== 'string'
    ) {
      return null
    }

    const data = cached as unknown as ReplyBoxCacheData

    if (
      data.mainArticleId &&
      mainArticleId &&
      data.mainArticleId !== mainArticleId
    ) {
      return null
    }

    if (data.editType !== editType) {
      return null
    }

    if (editType === 'create') {
      if (data.categoryId === categoryId) {
        return data
      }
    } else {
      if (data.targetArticle?.id === targetArticle?.id) {
        return data
      }
    }

    return null
  }, [
    cacheKey,
    editType,
    targetArticle?.id,
    categoryId,
    mainArticleId,
    cacheCleared,
  ])

  const saveCache = useCallback(
    (content: string, replyBoxHeight?: number) => {
      const fullKey = `${CACHE_PREFIX}${cacheKey}`
      const cacheData: CacheData<ReplyBoxCacheData> = {
        data: {
          editType,
          content,
          targetArticle: targetArticle
            ? {
                id: targetArticle.id,
                authorName: targetArticle.authorName,
                summary: targetArticle.summary,
                deleted: targetArticle.deleted,
              }
            : undefined,
          categoryId,
          mainArticleId,
          replyBoxHeight,
        },
        timestamp: Date.now(),
      }
      try {
        localStorage.setItem(fullKey, JSON.stringify(cacheData))
        if (cacheCleared) {
          setCacheCleared(false)
        }
      } catch (error) {
        console.error('Failed to save ReplyBox cache:', error)
      }
    },
    [cacheKey, editType, targetArticle, categoryId, mainArticleId, cacheCleared]
  )

  const clearCache = useCallback(() => {
    const fullKey = `${CACHE_PREFIX}${cacheKey}`
    try {
      localStorage.removeItem(fullKey)
      setCacheCleared(true)
    } catch (error) {
      console.error('Failed to clear ReplyBox cache:', error)
    }
  }, [cacheKey])

  const initialCache = useMemo(() => {
    return loadCache()
  }, [loadCache])

  return {
    initialCache,
    saveCache,
    clearCache,
  }
}

export function useEditorCache<T extends FieldValues>(
  cacheKey: string,
  form: UseFormReturn<T>,
  options: {
    debounceMs?: number
    expiryMs?: number
    enabled?: boolean
  } = {}
) {
  const { debounceMs = 1000, enabled = true } = options

  const fullKey = `${CACHE_PREFIX}${cacheKey}`
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const saveToCache = useCallback(
    (data: Record<string, unknown>) => {
      if (!enabled) {
        return
      }

      try {
        const cacheData: CacheData = {
          data,
          timestamp: Date.now(),
        }
        localStorage.setItem(fullKey, JSON.stringify(cacheData))
      } catch (error) {
        console.error('Failed to save to cache:', error)
      }
    },
    [fullKey, enabled]
  )

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(fullKey)
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }, [fullKey])

  useEffect(() => {
    if (!enabled) return

    const subscription = form.watch((data) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        saveToCache(data as Record<string, unknown>)
      }, debounceMs)
    })

    return () => {
      subscription.unsubscribe()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [form, saveToCache, debounceMs, enabled])

  return {
    clearCache,
  }
}
