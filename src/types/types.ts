export interface ResponseData<T> {
  code: number
  message: string
  data: T
}

export interface TokenResponse {
  token: string
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
  replyToId: number
  deleted: boolean
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

export type ArticleListSort =
  | 'best'
  | 'oldest'
  | 'latest'
  | 'list_best'
  | 'list_hot'

export type ArticleSortTabMap = {
  [key in ArticleListSort]: string
}

export type ArticleListResponse = {
  articles: Article[]
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
