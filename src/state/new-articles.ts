import { create } from 'zustand'

import type { Article } from '@/types/types'

const MAX_ARTICLES_PER_CATEGORY = 50
const EMPTY_ARRAY: Article[] = []

interface NewArticlesState {
  newArticlesMap: Map<string, Article[]>
  addNewArticle: (article: Article) => void
  getNewArticles: (
    siteFrontId: string | null,
    categoryFrontId: string | null
  ) => Article[]
  getNewArticlesCount: (
    siteFrontId: string | null,
    categoryFrontId: string | null
  ) => number
  clearNewArticles: (
    siteFrontId: string | null,
    categoryFrontId: string | null
  ) => void
}

const getKey = (siteFrontId: string | null, categoryFrontId: string | null) => {
  return `${siteFrontId || 'null'}-${categoryFrontId || 'null'}`
}

export const useNewArticlesStore = create<NewArticlesState>((set, get) => ({
  newArticlesMap: new Map(),

  addNewArticle: (article) => {
    set((state) => {
      const newMap = new Map(state.newArticlesMap)

      const siteFrontId = article.siteFrontId || null
      const categoryFrontId = article.categoryFrontId || null

      const keys = [
        getKey(siteFrontId, categoryFrontId),
        getKey(siteFrontId, null),
        getKey(null, null),
      ]

      keys.forEach((key) => {
        const existing = newMap.get(key) || []
        const isDuplicate = existing.some((a) => a.id === article.id)

        if (!isDuplicate) {
          const updated = [article, ...existing]
          newMap.set(key, updated.slice(0, MAX_ARTICLES_PER_CATEGORY))
        }
      })

      return { newArticlesMap: newMap }
    })
  },

  getNewArticles: (siteFrontId, categoryFrontId) => {
    const key = getKey(siteFrontId, categoryFrontId)
    return get().newArticlesMap.get(key) || EMPTY_ARRAY
  },

  getNewArticlesCount: (siteFrontId, categoryFrontId) => {
    const key = getKey(siteFrontId, categoryFrontId)
    return get().newArticlesMap.get(key)?.length || 0
  },

  clearNewArticles: (siteFrontId, categoryFrontId) => {
    set((state) => {
      const newMap = new Map(state.newArticlesMap)
      const key = getKey(siteFrontId, categoryFrontId)
      newMap.delete(key)
      return { newArticlesMap: newMap }
    })
  },
}))
