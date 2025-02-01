import { Link } from 'react-router-dom'

import { timeAgo } from '@/lib/dayjs-custom'

import {
  Activity,
  ActivityActionType,
  ListPageState,
  SITE_STATUS,
  SiteStatus,
} from '@/types/types'

import { Empty } from './Empty'
import { ListPagination } from './ListPagination'
import { Badge } from './ui/badge'
import { Card } from './ui/card'

export interface ActivityListProps {
  list: Activity[]
  pageState: ListPageState
}

type AcTypeMap = {
  [key in ActivityActionType]: string
}
const acTypeMap: AcTypeMap = {
  user: '用户',
  manage: '管理',
  anonymous: '匿名',
  dev: '开发',
}

interface ActivityActionTextProps {
  activity: Activity
}

const SiteAction = ({ activity: item }: ActivityActionTextProps) => {
  if (
    !item.details ||
    item.details['status'] === undefined ||
    item.details['prevStatus'] === undefined
  ) {
    return (
      <>
        {'更新了站点'} <ActivityTargetLink activity={item} /> {'的状态'}
      </>
    )
  }
  const status = item.details['status'] as SiteStatus
  const prevStatus = item.details['prevStatus'] as SiteStatus

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
        <Link
          to={`/${item.details.siteFrontId}/articles/${item.targetId}`}
        >{`/${item.details.siteFrontId}/articles/${item.targetId}`}</Link>
      )
    case 'user':
      return (
        <Link to={`/users/${item.targetId}`}>{`/users/${item.targetId}`}</Link>
      )
    case 'category':
      return (
        <Link
          to={`/${item.details.siteFrontId}/categories/${item.targetId}`}
        >{`/${item.details.siteFrontId}/categories/${item.targetId}`}</Link>
      )
    case 'site':
      return <Link to={`/${item.targetId}`}>{`/${item.targetId}`}</Link>
    default:
      return null
  }
}

const ActivityActionText = ({ activity: item }: ActivityActionTextProps) => {
  switch (item.action) {
    case 'set_role':
      return (
        <>
          <Link to={`/users/${item.userName}`}>{item.userName}</Link>{' '}
          设置用户&nbsp;
          {item.details && <ActivityTargetLink activity={item} />}
          &nbsp;角色为&nbsp;
          <span className="inline-block border-[1px] border-gray-500 rounded-sm px-1">
            {item.details.roleName}
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
    default:
      return (
        <>
          <Link to={`/users/${item.userName}`}>{item.userName}</Link>{' '}
          {item.actionText}{' '}
          {item.details && <ActivityTargetLink activity={item} />}
          &nbsp;于 <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
        </>
      )
  }
}

export const ActivityList: React.FC<ActivityListProps> = ({
  list,
  pageState,
}) =>
  list.length == 0 ? (
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
          <div className="mb-2 text-base activity-title">
            <ActivityActionText activity={item} />
          </div>
          <div className="text-sm bg-gray-100 p-2">
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
                <pre className="flex-grow align-top py-1 whitespace-break-spaces">
                  {JSON.stringify(item.details, null, '  ')}
                </pre>
              </details>
            </div>
          </div>
        </Card>
      ))}
      <ListPagination pageState={pageState} />
    </>
  )
