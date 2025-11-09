import { AfterResponseHook } from 'ky'

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
  needsUsername: boolean
  email: string
  provider: OAuthProvider
  suggestedName: string
}

export interface ItemExists {
  exists: boolean
}

export interface CategoryUserState {
  subscribed: boolean
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
  iconBgColor: string
  iconContent: string
  contentFormId: string
  contentForm: ContentForm | null
  userState: CategoryUserState | null
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

export type ArticleLogStatus = ArticleStatus

export interface ArticleLog {
  id: string
  primaryArticleId: string
  createdAt: string
  operatorId: string
  operator: UserData
  currEditTime: string
  prevEditTime: string
  prevArticle: Article
  currArticle: Article
  prevHistoryId: string
  titleDelta: string
  urlDelta: string
  contentDelta: string
  categoryFrontIdDelta: string
  titleDiffHTML: string
  urlDiffHTML: string
  contentDiffHTML: string
  categoryFrontIdDiffHTML: string
  isHidden: boolean
  status: ArticleStatus
  version: number
  extraDelta: JSONMap<string> | null
  extraDiffHTML: JSONMap<string> | null
}

export interface ArticleHistoryResponse extends ListPageState {
  list: ArticleLog[] | null
}

export interface CurrUserState {
  voteType: VoteType
  saved: boolean
  reactFrontId: string
  subscribed: boolean
  isRead: boolean
}

export type ArticleStatus = 'draft' | 'pending' | 'rejected' | 'published'

export type ArticleStatusNameMap = {
  [key in ArticleStatus]: string
}

export type ArticleStatusColorMap = {
  [key in ArticleStatus]: string
}

export interface Article {
  id: string
  title: string
  displayTitle: string
  asMainArticle: boolean // on the top of page as main content
  link: string
  picURL: string
  price: number
  authorName: string
  authorId: string
  authorRoleName: string
  showAuthorRoleName: boolean
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
  currUserState: CurrUserState | null
  reactCounts: { [key: string]: number }
  showScore: boolean
  categoryId: string
  categoryFrontId: string
  category: Category
  siteFrontId: string
  site: Site
  locked: boolean
  pinned: boolean
  pinnedExpireAt: string
  pinnedScope: string
  blocked: boolean
  fadeOut: boolean
  replyRootAuthorId: string
  replyRootArticleId: string
  replyRootArticleTitle: string
  replyRootArticleSiteFrontId: string
  delLog: Activity | null
  status: ArticleStatus
  version: number
  hasReviewing: boolean
  contentFormId: string
  contentForm: ContentForm | null
  contentStatusId: string
  contentStatus: ContentStatus | null
  acceptAnswerId: string
  viewCount: number
  articleLinkClick: number
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
  prevCursor: string
  nextCursor: string
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

export const OAUTH_PROVIDER = Object.freeze({
  GOOGLE: 'google',
  GITHUB: 'github',
} as const)

export type AuthType = ValuesToUnion<typeof AUTH_TYPE>
export type OAuthProvider = ValuesToUnion<typeof OAUTH_PROVIDER>

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
  siteRole: Role | null
  permissions: Permission[] | null
  super: boolean
  authFrom: AuthType
  authFromName: string
  reputation: number
  bannedStartAt: string // ISO date string
  bannedEndAt: string // ISO date string
  bannedMinutes: number
  bannedCount: number
  uiSettings: JSONMap | null
  showRoleName: boolean
}

export interface CustomRequestOptions {
  showNotFound?: boolean
  showAuthToast?: boolean
  siteFrontId?: string
  afterResponseHooks?: AfterResponseHook[]
  authRequired?: boolean
}

export type FrontCategory = Pick<Category, 'frontId' | 'name' | 'describe'> & {
  id?: string
  isFront: boolean // defined at frontend
  siteFrontId?: string
}

export interface ListPageState {
  currPage: number
  pageSize: number
  total: number
  totalPage: number
}

export interface ArticleListState extends ListPageState {
  category?: FrontCategory
  prevCursor?: string
  nextCursor?: string
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

export type ArticleAction =
  | 'delete'
  | 'save'
  | 'subscribe'
  | 'show_history'
  | 'lock'
  | 'accept_answer'
  | 'react'
  | VoteType

export type ActivityActionType =
  | 'user'
  | 'manage'
  | 'anonymous'
  | 'dev'
  | 'platform_manage'

export type ActivityAction =
  | 'register' // Register
  | 'register_verify' // Registration verification
  | 'login' // Login
  | 'logout' // Logout
  | 'update_intro' // Update introduction
  | 'retrieve_password' // Retrieve password
  | 'reset_password' // Reset password
  | 'create_article' // Create article
  | 'reply_article' // Reply to article
  | 'edit_article' // Edit article
  | 'delete_article' // Delete article
  | 'save_article' // Save article
  | 'vote_article' // Vote article
  | 'react_article' // React to article
  | 'subscribe_article' // Subscribe article
  | 'recover' // Recover article
  | 'block_regions' // Block regions
  | 'lock_article' // Lock article
  | 'fade_out_article' // Fade out article
  | 'review_article' // Review article
  | 'set_role' // Set role
  | 'add_role' // Add role
  | 'edit_role' // Edit role
  | 'create_role' // Create role
  | 'delete_role' // Delete role
  | 'set_default_role' // Set as default role
  | 'toggle_hide_history' // Toggle hide history
  | 'ban_user' // Ban user
  | 'unban_user' // Unban user
  | 'create_category' // Create category
  | 'edit_category' // Edit category
  | 'delete_category' // Delete category
  | 'create_site' // Create site
  | 'edit_site' // Edit site
  | 'delete_site' // Delete site
  | 'set_site_status' // Set site status
  | 'accept_site_invite' // Accept site invite
  | 'join_site' // Join site
  | 'quit_site' // Quit site
  | 'create_invite' // Create invite
  | 'remove_member' // Remove member
  | 'remove_members' // Remove members
  | 'block_user' // Block user
  | 'unblock_user' // Unblock user
  | 'block_users' // Block users
  | 'unblock_users' // Unblock users

export type ActivityTargetModel =
  | 'user'
  | 'article'
  | 'category'
  | 'role'
  | 'site'
  | 'empty'

// eslint-disable-next-line
export interface JSONMap<T = any> {
  [x: string]: T
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
  countryCode: string
  details: ActivityDetails
  // formattedText: string
  extraInfo: JSONMap
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
export type MessageTargetModel = 'article' | 'category'

export interface Message<T = Article> {
  id: string
  senderUserId: string
  senderUserName: string
  receiverUserId: string
  receiverUserName: string
  targetModel: MessageTargetModel
  targetID: string
  targetData: T
  contentArticle: Article
  isRead: boolean
  createdAt: string
  type: string
  siteId: string
  siteFrontId: string
  siteName: string
  siteLogoUrl: string
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

export const ARTICLE_LOCK_ACTION = Object.freeze({
  Lock: 1,
  Unlock: 2,
} as const)

export type ArticleLockAction = ValuesToUnion<typeof ARTICLE_LOCK_ACTION>

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
  showRoleName: boolean
  rateLimitTokens: number
  rateLimitInterval: number
  rateLimitEnabled: boolean
}

export interface RoleListResponse extends ListPageState {
  list: Role[] | null
}

export interface DefaultRoles {
  platform?: Role
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
  logoHtmlStr: string
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
  memberCount: number
  onlineCount: number
  reviewBeforePublish: boolean
  uiSettings: JSONMap | null
  rateLimitTokens?: number
  rateLimitInterval?: number
  rateLimitEnabled: boolean
}

export interface SiteListResponse extends ListPageState {
  list: Site[] | null
}

export interface UploadResponse {
  data: {
    customUrl: string
  }
  success: boolean
}

export interface InviteCode {
  id: string
  code: string
  createdAt: string
  updatedAt: string
  expiredAt: string
  siteId: string
  creatorId: string
  creatorName: string
}

export interface SiteInviteResponse {
  code: InviteCode
}

export interface InviteCodeItemResponse {
  invite: InviteCode
  site: Site
}

export interface BlockedUser extends UserData {
  blockedAt: string
}

export interface BlockedUserList extends ListPageState {
  list: BlockedUser[] | null
}

export interface BlockedWord {
  id: number
  content: string
  creatorId: string
  creatorName: string
  createdAt: string
}

export interface SiteBlockedWord {
  id: number
  siteId: string
  wordId: string
  word: BlockedWord
  createdAt: string
  creatorId: string
  creatorName: string
}

export interface SiteBlockedWordList extends ListPageState {
  list: SiteBlockedWord[]
}

export interface ContentStatus {
  id: string
  name: string
  contentHtmlStr: string
  contentFormId: number
  asDefault: boolean
  creatorId: string
  creatorName: string
  createdAt: string
}

export interface ContentForm {
  id: string
  name: string
  frontId: string
  description: string
  creatorId: string
  creatorName: string
  createdAt: string
  statusList: ContentStatus[] | null
}

export interface ContentFormListResponse {
  list: ContentForm[]
}

export const SYSTEM_ARTICLE_CONTENT_FORM = Object.freeze({
  QnA: 'qna',
  Ticket: 'ticket',
  Chat: 'chat',
} as const)

export const SITE_UI_MODE = Object.freeze({
  Sidebar: 'sidebar',
  TopNav: 'top_nav',
} as const)

export type SiteUIMode = ValuesToUnion<typeof SITE_UI_MODE>

export type SettingsType = 'site_ui' | 'user_ui'

export const SITE_LIST_MODE = Object.freeze({
  TopDrawer: 'top_drawer',
  DropdownMenu: 'dropdown_menu',
} as const)

export type SiteListMode = ValuesToUnion<typeof SITE_LIST_MODE>

export type Theme = 'dark' | 'light' | 'system'

export type StringFn = () => string

export type ReplyBoxType = 'create' | 'edit' | 'reply'
export type ReplyBoxMode = 'reply' | 'chat'

export interface ReplyBoxProps {
  mode?: ReplyBoxMode
  category?: Category | null
  replyToArticle: Article | null
  editType: ReplyBoxType
  edittingArticle?: Article | null
  disabled?: boolean
  className?: string
  bodyHeight?: number
  mainArticleId?: string
  onSuccess?:
    | ((
        data: ResponseData<ArticleSubmitResponse>,
        type?: ReplyBoxType,
        boxHeight?: number
      ) => void)
    | (() => Promise<void>)
  onRemoveReply?: (() => void) | (() => Promise<void>)
}

export const SSE_EVENT = Object.freeze({
  Ping: 'ping',
  UpdateRole: 'updaterole',
  UpdateNoties: 'updatenoties',
  Close: 'close',
  NewMessage: 'newmessage',
  DeleteMessage: 'deletemessage',
} as const)

export type SseEvent = ValuesToUnion<typeof SSE_EVENT>

export interface ChatListState {
  path: string
  list: Article[]
  prevCursor: string
  nextCursor: string
  initialized: boolean
  lastReadCursor: string
  lastScrollTop: number
}

export interface ChatData {
  [path: string]: ChatListState
}

export type ChatRoom = Pick<
  ChatListState,
  'path' | 'prevCursor' | 'nextCursor' | 'lastReadCursor' | 'lastScrollTop'
>

export interface ChatMessage extends Article {
  roomPath: string
  idNum: number
  createdAtTimestamp: number
}

export const CHAT_DB_EVENT = Object.freeze({
  SaveChatList: 'savechatlist',
  SaveMessage: 'savemessage',
  DeleteMessage: 'deletemessage',
} as const)

export type ChatDBEvent = ValuesToUnion<typeof CHAT_DB_EVENT>

export const ARTICLE_LIST_MODE = Object.freeze({
  Compact: 'compact',
  Preview: 'preview',
  Grid: 'grid',
} as const)

export type ArticleListMode = ValuesToUnion<typeof ARTICLE_LIST_MODE>
