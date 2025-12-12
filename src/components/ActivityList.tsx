import { Trans, useTranslation } from 'react-i18next'

import { timeAgo } from '@/lib/dayjs-custom'
import { Link } from '@/lib/router'

import { buildRoutePath } from '@/hooks/use-route-match'
import i18n from '@/i18n'
import {
  ARTICLE_LOCK_ACTION,
  Activity,
  ActivityActionType,
  ArticleLockAction,
  ArticleStatus,
  ListPageState,
  SITE_STATUS,
  SiteStatus,
} from '@/types/types'

import { Empty } from './Empty'
import { ListPagination } from './ListPagination'
import SiteLink from './base/SiteLink'
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

const acTypeMap = (acType: ActivityActionType) => {
  switch (acType) {
    case 'user':
      return i18n.t('user')
    case 'manage':
      return i18n.t('management')
    case 'anonymous':
      return i18n.t('anonymous')
    case 'dev':
      return i18n.t('dev')
    case 'platform_manage':
      return i18n.t('platformManagement')
  }
}

interface ActivityActionTextProps {
  activity: Activity
}

const SiteAction = ({ activity: item }: ActivityActionTextProps) => {
  const { t } = useTranslation()

  if (
    !item.extraInfo ||
    item.extraInfo['status'] === undefined ||
    item.extraInfo['prevStatus'] === undefined
  ) {
    return (
      <Trans
        i18nKey={'updateSiteStatus'}
        components={{
          siteLink: <ActivityTargetLink activity={item} />,
        }}
      />
    )
  }
  const status = item.extraInfo['status'] as SiteStatus
  const prevStatus = item.extraInfo['prevStatus'] as SiteStatus

  let actionText = t('updateSiteStatus1')
  switch (status) {
    case SITE_STATUS.Normal:
      if (prevStatus == SITE_STATUS.Pending) {
        actionText = t('reviewPassSite')
      } else {
        actionText = t('recoverSite')
      }
      break
    case SITE_STATUS.Reject:
      actionText = t('reviewRejectSite')
      break
    case SITE_STATUS.Banned:
      actionText = t('reviewRejectSite')
      break
    case SITE_STATUS.ReadOnly:
      return (
        <Trans
          i18nKey={'setSiteStatusReadonly'}
          components={{
            siteLink: <ActivityTargetLink activity={item} />,
          }}
        />
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
    case 'article': {
      const targetId = String(item.targetId)
      const targetSiteFrontId =
        typeof item.extraInfo?.siteFrontId === 'string'
          ? item.extraInfo.siteFrontId
          : undefined
      const articleRoute = buildRoutePath(
        `/articles/${targetId}`,
        targetSiteFrontId
      )
      return (
        <SiteLink to={`/articles/${targetId}`} siteFrontId={targetSiteFrontId}>
          {item.extraInfo.title || articleRoute}
        </SiteLink>
      )
    }
    case 'user':
      return <Link to={`/users/${item.targetId}`}>{item.targetId}</Link>
    case 'category': {
      const targetId = String(item.targetId)
      const targetSiteFrontId =
        typeof item.extraInfo?.siteFrontId === 'string'
          ? item.extraInfo.siteFrontId
          : undefined
      const categoryRoute = buildRoutePath(`/b/${targetId}`, targetSiteFrontId)
      return (
        <SiteLink to={`/b/${targetId}`} siteFrontId={targetSiteFrontId}>
          {item.extraInfo.categoryName || categoryRoute}
        </SiteLink>
      )
    }
    case 'site': {
      const targetFrontId =
        typeof item.targetId === 'string' ? item.targetId : undefined
      const siteRoute = buildRoutePath('/', targetFrontId)
      return (
        <SiteLink to="/" siteFrontId={targetFrontId}>
          {siteRoute}
        </SiteLink>
      )
    }
    default:
      return null
  }
}

const ActivityActionText = ({ activity: item }: ActivityActionTextProps) => {
  const { t } = useTranslation()
  const removedUsers =
    (item.extraInfo.removedUsers as string[] | undefined) || []
  const blockedUsers =
    (item.extraInfo.blockedUsers as string[] | undefined) || []
  const unblockedUsers =
    (item.extraInfo.unblockedUsers as string[] | undefined) || []

  const articleLockAction = item.extraInfo.lockAction as
    | ArticleLockAction
    | undefined

  const reviewArticleResult = item.extraInfo[
    'reviewArticleResult'
  ] as ArticleStatus
  const isReviewedReply = item.extraInfo['isReviewedReply'] as boolean

  switch (item.action) {
    case 'set_role':
      return (
        <Trans
          i18nKey={'setUserRole'}
          components={{
            authorLink: (
              <Link to={`/users/${item.userName}`}>{item.userName}</Link>
            ),
            userLink: item.extraInfo && <ActivityTargetLink activity={item} />,
            roleTag: (
              <span className="inline-block border-[1px] border-gray-500 rounded-sm px-1">
                {item.extraInfo.roleName}
              </span>
            ),
            timeTag: (
              <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
            ),
          }}
        />
      )
    case 'set_site_status':
      return (
        <Trans
          i18nKey={'siteManageAction'}
          components={{
            authorLink: (
              <Link to={`/users/${item.userName}`}>{item.userName}</Link>
            ),
            actionTag: <SiteAction activity={item} />,
            timeTag: (
              <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
            ),
          }}
        />
      )
    case 'create_role':
      return (
        <Trans
          i18nKey={'acCreateRole'}
          components={{
            authorLink: (
              <Link to={`/users/${item.userName}`}>{item.userName}</Link>
            ),
            roleTag: (
              <span className="inline-block border-[1px] border-gray-500 rounded-sm px-1">
                {item.extraInfo.roleName}
              </span>
            ),
            timeTag: (
              <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
            ),
          }}
        />
      )
    case 'edit_role':
      return (
        <Trans
          i18nKey={'acUpdateRole'}
          components={{
            authorLink: (
              <Link to={`/users/${item.userName}`}>{item.userName}</Link>
            ),
            roleTag: (
              <span className="inline-block border-[1px] border-gray-500 rounded-sm px-1">
                {item.extraInfo.roleName}
              </span>
            ),
            timeTag: (
              <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
            ),
          }}
        />
      )
    case 'delete_role':
      return (
        <Trans
          i18nKey={'acDeleteRole'}
          components={{
            authorLink: (
              <Link to={`/users/${item.userName}`}>{item.userName}</Link>
            ),
            roleTag: (
              <span className="inline-block border-[1px] border-gray-500 rounded-sm px-1">
                {item.extraInfo.roleName}
              </span>
            ),
            timeTag: (
              <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
            ),
          }}
        />
      )
    case 'remove_member':
    case 'remove_members':
      return (
        <>
          {removedUsers.length == 1 ? (
            <Trans
              i18nKey={'acRemoveMember'}
              components={{
                authorLink: (
                  <Link to={`/users/${item.userName}`}>{item.userName}</Link>
                ),
                memberTag: (
                  <Link key={removedUsers[0]} to={`/users/${item.userName}`}>
                    {removedUsers[0]}
                  </Link>
                ),
                timeTag: (
                  <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
                ),
              }}
            />
          ) : (
            <Trans
              i18nKey={'acRemoveMembers'}
              values={{
                num: removedUsers.length,
              }}
              components={{
                authorLink: (
                  <Link to={`/users/${item.userName}`}>{item.userName}</Link>
                ),
                memberTagList: (
                  <>
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
                  </>
                ),
                timeTag: (
                  <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
                ),
              }}
            />
          )}
        </>
      )
    case 'block_user':
    case 'block_users':
      return (
        <>
          {blockedUsers.length == 1 ? (
            <Trans
              i18nKey={'acBlockUser'}
              components={{
                authorLink: (
                  <Link to={`/users/${item.userName}`}>{item.userName}</Link>
                ),
                memberTag: (
                  <Link key={blockedUsers[0]} to={`/users/${item.userName}`}>
                    {blockedUsers[0]}
                  </Link>
                ),
                timeTag: (
                  <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
                ),
              }}
            />
          ) : (
            <Trans
              i18nKey={'acBlockUsers'}
              values={{
                num: blockedUsers.length,
              }}
              components={{
                authorLink: (
                  <Link to={`/users/${item.userName}`}>{item.userName}</Link>
                ),
                memberTagList: (
                  <>
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
                  </>
                ),
                timeTag: (
                  <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
                ),
              }}
            />
          )}
        </>
      )
    case 'unblock_user':
    case 'unblock_users':
      return (
        <>
          {unblockedUsers.length == 1 ? (
            <Trans
              i18nKey={'acUnblockUser'}
              components={{
                authorLink: (
                  <Link to={`/users/${item.userName}`}>{item.userName}</Link>
                ),
                memberTag: (
                  <Link key={unblockedUsers[0]} to={`/users/${item.userName}`}>
                    {unblockedUsers[0]}
                  </Link>
                ),
                timeTag: (
                  <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
                ),
              }}
            />
          ) : (
            <Trans
              i18nKey={'acUnblockUsers'}
              values={{
                num: unblockedUsers.length,
              }}
              components={{
                authorLink: (
                  <Link to={`/users/${item.userName}`}>{item.userName}</Link>
                ),
                memberTagList: (
                  <>
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
                  </>
                ),
                timeTag: (
                  <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
                ),
              }}
            />
          )}
        </>
      )
    case 'review_article': {
      const targetSiteFrontId =
        typeof item.extraInfo?.siteFrontId === 'string'
          ? item.extraInfo.siteFrontId
          : undefined
      const targetId = String(item.targetId)
      return (
        <Trans
          i18nKey={'acReviewPost'}
          values={{
            action:
              reviewArticleResult == 'published'
                ? t('reviewPassed')
                : reviewArticleResult == 'rejected'
                  ? t('rejectedVerb')
                  : t('updatedVerb'),
            postType: isReviewedReply
              ? t('reply').toLowerCase()
              : t('post').toLowerCase(),
          }}
          components={{
            authorLink: (
              <Link to={`/users/${item.userName}`}>{item.userName}</Link>
            ),
            postLink: (
              <SiteLink
                to={`/articles/${targetId}`}
                siteFrontId={targetSiteFrontId}
              >
                {item.extraInfo.displayTitle ||
                  buildRoutePath(`/articles/${targetId}`, targetSiteFrontId)}
              </SiteLink>
            ),
            timeTag: (
              <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
            ),
          }}
        />
      )
    }
    case 'lock_article':
      return (
        <Trans
          i18nKey={'acLockPost'}
          values={{
            action:
              articleLockAction == ARTICLE_LOCK_ACTION.Unlock
                ? t('unlockedVerb')
                : t('lockedVerb'),
            postType: t('post'),
          }}
          components={{
            authorLink: (
              <Link to={`/users/${item.userName}`}>{item.userName}</Link>
            ),
            postLink: item.extraInfo && <ActivityTargetLink activity={item} />,
            timeTag: (
              <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
            ),
          }}
        />
      )
    default:
      return (
        <Trans
          i18nKey={'acCommonAction'}
          values={{
            action: item.actionText,
          }}
          components={{
            authorLink: (
              <Link to={`/users/${item.userName}`}>{item.userName}</Link>
            ),
            targetLink: item.extraInfo && (
              <ActivityTargetLink activity={item} />
            ),
            timeTag: (
              <time title={item.createdAt}>{timeAgo(item.createdAt)}</time>
            ),
          }}
        />
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

  const { t } = useTranslation()

  return (
    <div className="text-sm bg-gray-100 p-2 mt-2">
      <div className="flex">
        <div className="flex-shrink-0 w-[60px]">
          <b>{isArticleApproved ? t('remark') : t('reason')}：</b>
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
  const { t } = useTranslation()
  return list.length == 0 ? (
    <Empty />
  ) : (
    <>
      <div className="flex justify-between items-center my-4">
        <div>
          <Badge variant="secondary">
            {t('activityCount', { num: pageState.total })}
          </Badge>
        </div>
        <div></div>
      </div>
      <Card>
        {list.map((item, index) => (
          <div
            key={item.id}
            className={`p-3 hover:bg-hover-bg ${index < list.length - 1 ? 'border-b-[1px]' : ''}`}
          >
            <Collapsible>
              <div className="flex justify-between items-center text-base activity-title whitespace-pre-wrap">
                {['delete_article', 'review_article'].includes(item.action) ? (
                  <>
                    <div>
                      <ActivityActionText activity={item} />
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant={'secondary'} size="sm">
                        {t('detail')}
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
                      <b>{t('acType')}：</b>
                    </div>
                    <div>{acTypeMap(item.type)}</div>
                  </div>
                  <div className="flex">
                    <div className="flex-shrink-0 w-[80px]">
                      <b>{t('ipAddress')}：</b>
                    </div>
                    <div>{item.ipAddr}</div>
                  </div>
                  <div className="flex">
                    <div className="flex-shrink-0 w-[80px]">
                      <b>{t('countryCode')}：</b>
                    </div>
                    <div>{item.countryCode || '-'}</div>
                  </div>
                  <div className="flex">
                    <div className="flex-shrink-0 w-[80px]">
                      <b>{t('deviceInfo')}：</b>
                    </div>
                    <div>{item.deviceInfo}</div>
                  </div>
                  <div className="flex">
                    <div className="flex-shrink-0 w-[80px]">
                      <b>{t('otherInfo')}：</b>
                    </div>
                    <details>
                      <summary>{t('view')}</summary>
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
          </div>
        ))}
      </Card>
      <ListPagination pageState={pageState} />
    </>
  )
}
