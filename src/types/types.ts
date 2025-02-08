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
  user: UserData | null
}

export interface ItemExists {
  exists: boolean
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

export type CategoryExists = ItemExists

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
  categoryId: string
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
  permissions: Permission[] | null
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

export type ActivityAction =
  | 'register' // Register
  | 'register_verify' // Registration verification
  | 'login' // Login
  | 'logout' // Logout
  | 'update_intro' // Update introduction
  | 'create_article' // Create article
  | 'reply_article' // Reply to article
  | 'edit_article' // Edit article
  | 'delete_article' // Delete article
  | 'save_article' // Save article
  | 'vote_article' // Vote article
  | 'react_article' // React to article
  | 'set_role' // Set role
  | 'add_role' // Add role
  | 'edit_role' // Edit role
  | 'subscribe_article' // Subscribe article
  | 'retrieve_password' // Retrieve password
  | 'reset_password' // Reset password
  | 'toggle_hide_history' // Toggle hide history
  | 'recover' // Recover article
  | 'block_regions' // Block regions
  | 'lock_article' // Lock article
  | 'fade_out_article' // Fade out article
  | 'ban_user' // Ban user
  | 'unban_user' // Unban user
  | 'create_category' // Create category
  | 'edit_category' // Edit category
  | 'delete_category' // Delete category
  | 'create_site' // Create site
  | 'edit_site' // Edit site
  | 'delete_site' // Delete site
  | 'set_site_status' // Set site status

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
  action: ActivityAction
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
  siteNumLimit: number
}

export interface RoleListResponse extends ListPageState {
  list: Role[] | null
}

export interface DefaultRoles {
  platform: Role
  site: Role
}

export type ValuesToUnion<T> = T[keyof T]

export const SITE_STATUS = Object.freeze({
  ReadOnly: 0,
  Normal: 1,
  Pending: 2,
  Reject: 3,
  Banned: 4,
  All: 5,
} as const)

export type SiteStatus = ValuesToUnion<typeof SITE_STATUS>

export type SiteStatusNameMap = {
  [x in SiteStatus]: string
}

export type SiteStatusColorMap = SiteStatusNameMap

export const SITE_VISIBLE = Object.freeze({
  False: 0,
  True: 1,
  All: 2,
} as const)

export type SiteVisible = ValuesToUnion<typeof SITE_STATUS>

export interface SiteUserState {
  isMember: boolean
}

export interface Site {
  id: number
  name: string
  frontId: string
  visible: boolean
  creatorId: string
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
  currUserState: SiteUserState
  allowNonMemberInteract: boolean
  homePage: string
  deleted: boolean
}

export interface SiteListResponse extends ListPageState {
  list: Site[] | null
}

export interface UploadResponse {
  data: string
  success: boolean
}

export interface SiteInviteResponse {
  code: string
}
