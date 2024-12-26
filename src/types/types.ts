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
  role: string
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

export interface CategoryExists {
  exists: boolean
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

export interface CurrUserState {
  voteType: VoteType
  saved: boolean
  reactFrontId: string
  subscribed: boolean
}

export interface Article {
  id: string
  title: string
  displayTitle: string
  asMainArticle: boolean // 是否在前端作为顶层文章
  link: string
  picURL: string
  price: number
  authorName: string
  authorId: string
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
  totalSavedCount: number
  childrenCount: number
  voteUp: number
  voteDown: number
  voteScore: number
  weight: number
  listWeight: number
  participateCount: number
  currUserState: CurrUserState
  showScore: boolean
  categoryFrontId: string
  category: Category
  locked: boolean
  pinned: boolean
  pinnedExpireAt: string
  blocked: boolean
  fadeOut: boolean
  replyRootArticleId: string
  replyRootArticleTitle: string
  delLog: Activity
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

export interface ArticleResponse {
  id: string
}

export type ArticleSubmitResponse = ArticleResponse

export interface ArticleDeleteResponse {
  id: string
  replyRootArticleId: string
}

export type ArticleCardType = 'list' | 'item'

export enum AuthType {
  SELF = 'self',
  GOOGLE = 'google',
  GITHUB = 'github',
  MICROSOFT = 'microsoft',
}

// Permission interface matching the Go struct
export interface Permission {
  id: number
  frontId: string
  name: string
  createdAt: string // ISO date string
  module: string
}

export interface UserData {
  id: string
  name: string
  email: string
  registeredAt: string // ISO date string
  registeredAtStr: string
  introduction: string
  deleted: boolean
  banned: boolean
  roleName: string
  roleFrontId: string
  permissions: Permission[]
  super: boolean
  authFrom: AuthType
  reputation: number
  bannedStartAt: string // ISO date string
  bannedEndAt: string // ISO date string
  bannedMinutes: number
  bannedCount: number
}

export interface CustomRequestOptions {
  showNotFound: boolean
}

export type FrontCategory = Pick<Category, 'frontId' | 'name' | 'describe'> & {
  isFront: boolean // 是否由前端定义
}

export interface ListPageState {
  currPage: number
  pageSize: number
  totalCount: number // 数据总量
  totalPage: number // 总页数
}

export interface ArticleListState extends ListPageState {
  category?: FrontCategory
}

export type ArticleListType =
  | 'all'
  | 'saved'
  | 'article'
  | 'reply'
  | 'subscribed'
  | 'vote_up'
  | 'deleted'

export type VoteType = 'up' | 'down'

export type ArticleAction = 'delete' | 'save' | 'subscribe' | VoteType

export type ActivityActionType = 'user' | 'manage' | 'anonymous' | 'dev'

export interface ActivityDetails {
  // eslint-disable-next-line
  [x: string]: any
}

export interface Activity {
  id: string
  userId: string
  userName: string
  type: ActivityActionType
  action: string
  targetId: string
  targetModel: string
  createdAt: string
  ipAddr: string
  deviceInfo: string
  details: ActivityDetails
  formattedText: string
}

export interface OptionItem {
  name: string
  value: string
}

export interface ActivityListResponse {
  list: Activity[] | null
  total: number
  page: number
  pageSize: number
  totalPage: number
  acActionOptions: OptionItem[]
}

export interface UserListResponse {
  list: UserData[] | null
  total: number
  page: number
  pageSize: number
  totalPage: number
}

export interface ResponseID {
  id: string
}

export type UserSubmitResponse = ResponseID
