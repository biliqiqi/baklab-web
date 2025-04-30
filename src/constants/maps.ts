import {
  ArticleStatusColorMap,
  SITE_STATUS,
  SiteStatusColorMap,
} from '@/types/types'

export const SITE_STATUS_COLOR_MAP: SiteStatusColorMap = {
  [SITE_STATUS.ReadOnly]: 'text-gray-500',
  [SITE_STATUS.Normal]: '',
  [SITE_STATUS.Pending]: 'text-yellow-500',
  [SITE_STATUS.Reject]: 'text-red-500',
  [SITE_STATUS.Banned]: 'text-red-500',
  [SITE_STATUS.All]: '',
}

export const ARTICLE_STATUS_COLOR_MAP: ArticleStatusColorMap = {
  pending: 'text-yellow-500',
  published: '',
  rejected: 'text-red-500',
  draft: '',
}
