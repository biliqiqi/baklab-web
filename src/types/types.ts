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
  user: UserData
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
  siteId: number
  siteFrontId: string
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
  replyToArticle: Article | null
  deleted: boolean
  replies: ArticleList | null
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
  siteFrontId: string
  site: Site
  locked: boolean
  pinned: boolean
  pinnedExpireAt: string
  blocked: boolean
  fadeOut: boolean
  replyRootAuthorId: string
  replyRootArticleId: string
  replyRootArticleTitle: string
  replyRootArticleSiteFrontId: string
  delLog: Activity | null
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
  category: Category
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

export const AUTH_TYPE = Object.freeze({
  SELF: 'self',
  GOOGLE: 'google',
  GITHUB: 'github',
  MICROSOFT: 'microsoft',
} as const)

export type AuthType = ValuesToUnion<typeof AUTH_TYPE>

// Permission interface matching the Go struct
export interface Permission {
  id: string
  frontId: string
  name: string
  createdAt: string // ISO date string
  module: string
}

export interface PermissionListItem {
  module: string
  list: Permission[]
}

export interface PermissionListResponse {
  list: Permission[]
  total: number
  currPage: number
  totalPage: number
  pageSize: number
  module: string
  formattedList: PermissionListItem[]
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
  role: Role
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
  showNotFound?: boolean
  showAuthToast?: boolean
  siteFrontId?: string // 接口所在站点
}

export type FrontCategory = Pick<Category, 'frontId' | 'name' | 'describe'> & {
  isFront: boolean // 是否由前端定义
  siteFrontId?: string
}

export interface ListPageState {
  currPage: number
  pageSize: number
  total: number // 数据总量
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

export type ActivityTargetModel =
  | 'user'
  | 'article'
  | 'category'
  | 'role'
  | 'site'
  | 'empty'

export interface JSONMap {
  // eslint-disable-next-line
  [x: string]: any
}

export type ActivityDetails = JSONMap

export interface Activity {
  id: string
  userId: string
  userName: string
  type: ActivityActionType
  action: string
  actionText: string
  targetId: string
  targetModel: ActivityTargetModel
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

export type MessageStatus = 'read' | 'unread'
export interface Message<T = Article> {
  id: string
  senderUserId: string
  senderUserName: string
  receiverUserId: string
  receiverUserName: string
  targetModel: string
  targetID: string
  targetData: T
  contentArticle: Article
  isRead: boolean
  createdAt: string
  type: string
}

export interface NotificationUnreadCount {
  total: number
}

export interface NotificationListResponse<T = Article> {
  list: Message<T>[] | null
  page: number
  pageSize: number
  total: number
  totalPage: number
  status: string
  unreadTotal: number
}

export const SUBSCRIBE_ACTION = Object.freeze({
  Toggle: 0,
  Subscribe: 1,
  Unsubscribe: 2,
} as const)

export type SubscribeAction = ValuesToUnion<typeof SUBSCRIBE_ACTION>

export interface Role {
  id: string
  frontId: string
  name: string
  createdAt: string
  deleted: boolean
  isSystem: boolean
  permissions: Permission[] | null
  formattedPermissions: PermissionListItem[]
  level: number
  relateUserCount: number
}

export interface RoleListResponse extends ListPageState {
  list: Role[] | null
}

export type ValuesToUnion<T> = T[keyof T]

export const SITE_STATUS = Object.freeze({
  ReadOnly: 0,
  Normal: 1,
  Pending: 2,
  Reject: 3,
  Banned: 4,
} as const)

export type SiteStatus = ValuesToUnion<typeof SITE_STATUS>

export interface Site {
  id: number
  name: string
  frontId: string
  visible: boolean
  creatorId: number
  creatorName: string
  logoUrl: string
  description: string
  keywords: string
  rulesArticleId: number
  boardCategoryId: number
  createdAt: string
  updatedAt: string
  status: SiteStatus
  categoryFrontIds: string[]
  currUserRole: Role | null
}

export interface SiteListResponse extends ListPageState {
  list: Site[] | null
}
