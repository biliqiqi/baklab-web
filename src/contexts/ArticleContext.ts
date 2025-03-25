import { createContext } from 'react'

import { Article } from '@/types/types'

export interface ArticleContextData {
  root: Article | null
  top: Article | null
}

export const ArticleContext = createContext<ArticleContextData>({
  root: null,
  top: null,
})
