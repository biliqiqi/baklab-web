export interface ResponseData<T> {
  code: number
  message: string
  data: T
}

export interface TokenResponse {
  token: string
}

export interface AuthedDataResponse {
  token: string
  username: string
  userID: string
}

export interface CategoryOption {
  id: string
  name: string
}

export interface Category {
  id: string
  frontId: string
  name: string
  describe: string
  authorId: string
  createdAt: string
  approved: boolean
  approvalComment: string
  totalArticleCount: number
}

export type ArticleListSort =
  | 'best'
  | 'oldest'
  | 'latest'
  | 'list_best'
  | 'list_hot'

export type ArticleSortTabMap = {
  [key in ArticleListSort]: string
}

export interface ArticleList {
  list: Article[]
  sortType: ArticleListSort
  currPage: number
  pageSize: number
  total: number
  totalPage: number
}

export interface Article {
  id: string
  title: string
  link: string
  picURL: string
  price: number
  authorName: string
  authorId: number
  content: string
  summary: string
  createdAt: string
  updatedAt: string
  createdAtStr: string
  updatedAtStr: string
  replyToId: string
  replyToArticle: Article
  deleted: boolean
  replies: ArticleList
  totalReplyCount: number
  childrenCount: number
  voteUp: number
  voteDown: number
  voteScore: number
  weight: number
  listWeight: number
  participateCount: number
  showScore: boolean
  categoryFrontId: string
  category: Category
  locked: boolean
  pinned: boolean
  pinnedExpireAt: string
  blocked: boolean
  fadeOut: boolean
}

export interface ArticleListResponse {
  articles: Article[] | null
  articleTotal: number
  currPage: number
  pageSize: number
  totalPage: number
  sortType: ArticleListSort
  defaultSortType: ArticleListSort
  category: Category
  sortTabList: ArticleListSort[]
  sortTabNames: ArticleSortTabMap
}

export interface ArticleReact {
  id: string
  emoji: string
  frontId: string
  describe: string
  createdAt: string
}

export type ArticleReactMap = {
  [x: string]: ArticleReact
}

export interface ArticleItemResponse {
  article: Article
  maxDepth: number
  reactOptions: ArticleReact[]
  reactMap: ArticleReactMap
  defaultSortType: ArticleListSort
  sortTabList: ArticleListSort[]
  sortTabNames: ArticleSortTabMap
}

export interface ArticleSubmitResponse {
  id: string
}

export type ArticleCardType = 'list' | 'item'
