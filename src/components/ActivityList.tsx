import { Link } from 'react-router-dom'

import { timeAgo } from '@/lib/dayjs-custom'

import {
  Activity,
  ActivityActionType,
  ArticleStatus,
  ListPageState,
  SITE_STATUS,
  SiteStatus,
} from '@/types/types'

import { Empty } from './Empty'
import { ListPagination } from './ListPagination'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card } from './ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible'

export interface ActivityListProps {
  list: Activity[]
  pageState: ListPageState
  isPlatfromManager?: boolean
}

type AcTypeMap = {
  [key in ActivityActionType]: string
}
const acTypeMap: AcTypeMap = {
  user: '用户',
  manage: '管理',
  anonymous: '匿名',
  dev: '开发',
  platform_manage: '平台管理',
}

interface ActivityActionTextProps {
  activity: Activity
}

const SiteAction = ({ activity: item }: ActivityActionTextProps) => {
  if (
    !item.extraInfo ||
    item.extraInfo['status'] === undefined ||
    item.extraInfo['prevStatus'] === undefined
  ) {
    return (
      <>
        {'更新了站点'} <ActivityTargetLink activity={item} /> {'的状态'}
      </>
    )
  }
  const status = item.extraInfo['status'] as SiteStatus
  const prevStatus = item.extraInfo['prevStatus'] as SiteStatus

  let actionText = '更新了站点状态'
  switch (status) {
    case SITE_STATUS.Normal:
      if (prevStatus == SITE_STATUS.Pending) {
        actionText = '审核通过了站点'
      } else {
        actionText = '恢复了站点'
      }
      break
    case SITE_STATUS.Reject:
      actionText = '审核驳回了站点'
      break
    case SITE_STATUS.Banned:
      actionText = '封禁了站点'
      break
    case SITE_STATUS.ReadOnly:
      return (
        <>
          {'设置了站点状态'} <ActivityTargetLink activity={item} /> {'为只读'}
        </>
      )
    default:
  }

  return (
    <>
      {actionText} <ActivityTargetLink activity={item} />{' '}
    </>
  )
}

const ActivityTargetLink = ({ activity: item }: ActivityActionTextProps) => {
  switch (item.targetModel) {
    case 'article':
      return (
        <Link to={`/${item.extraInfo.siteFrontId}/articles/${item.targetId}`}>
          {item.extraInfo.title ||
            `/${item.extraInfo.siteFrontId}/articles/${item.targetId}`}
        </Link>
      )
    case 'user':
      return <Link to={`/users/${item.targetId}`}>{item.targetId}</Link>
    case 'category':
      return (
        <Link to={`/${item.extraInfo.siteFrontId}/categories/${item.targetId}`}>
          {item.extraInfo.categoryName}
        </Link>
      )
    case 'site':
      return <Link to={`/${item.targetId}`}>{`/${item.targetId}`}</Link>
    default:
      return null
  }
}

const ActivityActionText = ({ activity: item }: ActivityActionTextProps) => {
  const removedUsers =
    (item.extraInfo.removedUsers as string[] | undefined) || []
  const blockedUsers =
    (item.extraInfo.blockedUsers as string[] | undefined) || []
  const unblockedUsers =
    (item.extraInfo.unblockedUsers as string[] | undefined) || []

  const reviewArticleResult = item.extraInfo[
    'reviewArticleResult'
  ] as ArticleStatus
  const isReviewedReply = item.extraInfo['isReviewedReply'] as boolean

  switch (item.action) {
    case 'set_role':
      return (
        <>
          <Link to={`/users/${item.userName}`}>{item.userName}</Link>{' '}
          设置用户&nbsp;
          {item.extraInfo && <ActivityTargetLink activity={item} />}
          &nbsp;角色为&nbsp;
          <span className="inline-block border-[1px] border-gray-500 rounded-sm px-1">
            {item.extraInfo.roleName}
          </span>
          &nbsp;于 <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
        </>
      )
    case 'set_site_status':
      return (
        <>
          <Link to={`/users/${item.userName}`}>{item.userName}</Link>{' '}
          <SiteAction activity={item} />
          &nbsp;于 <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
        </>
      )
    case 'create_role':
      return (
        <>
          <Link to={`/users/${item.userName}`}>{item.userName}</Link>{' '}
          创建了角色&nbsp;
          <span className="inline-block border-[1px] border-gray-500 rounded-sm px-1">
            {item.extraInfo.roleName}
          </span>
          &nbsp;于 <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
        </>
      )
    case 'edit_role':
      return (
        <>
          <Link to={`/users/${item.userName}`}>{item.userName}</Link>{' '}
          更新了角色&nbsp;
          <span className="inline-block border-[1px] border-gray-500 rounded-sm px-1">
            {item.extraInfo.roleName}
          </span>
          &nbsp;于 <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
        </>
      )
    case 'delete_role':
      return (
        <>
          <Link to={`/users/${item.userName}`}>{item.userName}</Link>{' '}
          删除了角色&nbsp;
          <span className="inline-block border-[1px] border-gray-500 rounded-sm px-1">
            {item.extraInfo.roleName}
          </span>
          &nbsp;于 <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
        </>
      )
    case 'remove_member':
    case 'remove_members':
      return (
        <>
          <Link to={`/users/${item.userName}`}>{item.userName}</Link> 移除了
          {removedUsers.length == 1 && '成员'}&nbsp;
          {removedUsers
            .map((name) => (
              <Link key={name} to={`/users/${item.userName}`}>
                {name}
              </Link>
            ))
            .reduce((prev, curr, idx, _arr) => {
              if (idx == 0) {
                return [curr]
              }
              return [...prev, <span key={idx}>, </span>, curr]
            }, [] as JSX.Element[])}
          &nbsp;{removedUsers.length > 1 && `等 ${removedUsers.length} 名成员`}
          &nbsp;于 <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
        </>
      )
    case 'block_user':
    case 'block_users':
      return (
        <>
          <Link to={`/users/${item.userName}`}>{item.userName}</Link> 屏蔽了
          {blockedUsers.length == 1 && '用户'}&nbsp;
          {blockedUsers
            .map((name) => (
              <Link key={name} to={`/users/${item.userName}`}>
                {name}
              </Link>
            ))
            .reduce((prev, curr, idx, _arr) => {
              if (idx == 0) {
                return [curr]
              }
              return [...prev, <span key={idx}>, </span>, curr]
            }, [] as JSX.Element[])}
          &nbsp;{blockedUsers.length > 1 && `等 ${blockedUsers.length} 名用户`}
          &nbsp;于 <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
        </>
      )
    case 'unblock_user':
    case 'unblock_users':
      return (
        <>
          <Link to={`/users/${item.userName}`}>{item.userName}</Link> 解除了对
          {unblockedUsers.length == 1 && '用户'}&nbsp;
          {unblockedUsers
            .map((name) => (
              <Link key={name} to={`/users/${item.userName}`}>
                {name}
              </Link>
            ))
            .reduce((prev, curr, idx, _arr) => {
              if (idx == 0) {
                return [curr]
              }
              return [...prev, <span key={idx}>, </span>, curr]
            }, [] as JSX.Element[])}
          &nbsp;
          {unblockedUsers.length > 1
            ? `等 ${unblockedUsers.length} 名用户的屏蔽`
            : `的屏蔽`}
          &nbsp;于 <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
        </>
      )
    case 'review_article':
      return (
        <>
          <Link to={`/users/${item.userName}`}>{item.userName}</Link>{' '}
          {reviewArticleResult == 'published'
            ? '审核通过了'
            : reviewArticleResult == 'rejected'
              ? '驳回了'
              : '更新了'}
          {isReviewedReply ? '回复' : '文章'}&nbsp;
          <Link to={`/${item.extraInfo.siteFrontId}/articles/${item.targetId}`}>
            {item.extraInfo.displayTitle ||
              `/${item.extraInfo.siteFrontId}/articles/${item.targetId}`}
          </Link>
          &nbsp;于 <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
        </>
      )
    default:
      return (
        <>
          <Link to={`/users/${item.userName}`}>{item.userName}</Link>{' '}
          {item.actionText}{' '}
          {item.extraInfo && <ActivityTargetLink activity={item} />}
          &nbsp;于 <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
        </>
      )
  }
}

interface ActivityExtraDetailProps {
  activity: Activity
}
const ActivityExtraDetail = ({ activity: item }: ActivityExtraDetailProps) => {
  const isArticleApproved =
    item.action == 'review_article' &&
    (item.extraInfo.reviewArticleResult as ArticleStatus) == 'published'

  return (
    <div className="text-sm bg-gray-100 p-2 mt-2">
      <div className="flex">
        <div className="flex-shrink-0 w-[60px]">
          <b>{isArticleApproved ? '说明' : '原因'}：</b>
        </div>
        <div className="whitespace-break-spaces">
          {item.extraInfo.reason || '-'}
        </div>
      </div>
    </div>
  )
}

export const ActivityList: React.FC<ActivityListProps> = ({
  list,
  pageState,
  isPlatfromManager = false,
}) => {
  return list.length == 0 ? (
    <Empty />
  ) : (
    <>
      <div className="flex justify-between items-center my-4">
        <div>
          <Badge variant="secondary">{pageState.total} 条记录</Badge>
        </div>
        <div></div>
      </div>
      {list.map((item) => (
        <Card key={item.id} className="p-3 my-2 hover:bg-slate-50">
          <Collapsible>
            <div className="flex justify-between items-center text-base activity-title">
              {['delete_article', 'review_article'].includes(item.action) ? (
                <>
                  <div>
                    <ActivityActionText activity={item} />
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant={'secondary'} size="sm">
                      详细
                    </Button>
                  </CollapsibleTrigger>
                </>
              ) : (
                <div>
                  <ActivityActionText activity={item} />
                </div>
              )}
            </div>
            {isPlatfromManager ? (
              <div className="text-sm bg-gray-100 p-2 mt-2">
                <div className="flex">
                  <div className="flex-shrink-0 w-[80px]">
                    <b>类型：</b>
                  </div>
                  <div>{acTypeMap[item.type]}</div>
                </div>
                <div className="flex">
                  <div className="flex-shrink-0 w-[80px]">
                    <b>IP地址：</b>
                  </div>
                  <div>{item.ipAddr}</div>
                </div>
                <div className="flex">
                  <div className="flex-shrink-0 w-[80px]">
                    <b>设备信息：</b>
                  </div>
                  <div>{item.deviceInfo}</div>
                </div>
                <div className="flex">
                  <div className="flex-shrink-0 w-[80px]">
                    <b>其他数据：</b>
                  </div>
                  <details>
                    <summary>查看</summary>
                    <span className="font-bold">posts: </span>
                    <pre className="flex-grow align-top py-1 whitespace-break-spaces">
                      {JSON.stringify(item.details, null, '  ')}
                    </pre>
                    <span className="font-bold">extra: </span>
                    <pre className="flex-grow align-top py-1 whitespace-break-spaces">
                      {JSON.stringify(item.extraInfo, null, '  ')}
                    </pre>
                  </details>
                </div>
              </div>
            ) : (
              <CollapsibleContent>
                <ActivityExtraDetail activity={item} />
              </CollapsibleContent>
            )}
          </Collapsible>
        </Card>
      ))}
      <ListPagination pageState={pageState} />
    </>
  )
}
