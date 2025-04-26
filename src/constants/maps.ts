import i18n from '@/i18n'
import {
  ArticleStatusColorMap,
  ArticleStatusNameMap,
  SITE_STATUS,
  SiteStatusColorMap,
  SiteStatusNameMap,
} from '@/types/types'

export const SITE_STATUS_NAME_MAP: SiteStatusNameMap = {
  [SITE_STATUS.ReadOnly]: i18n.t('readonly'),
  [SITE_STATUS.Normal]: i18n.t('normal'),
  [SITE_STATUS.Pending]: i18n.t('pending'),
  [SITE_STATUS.Reject]: i18n.t('rejected'),
  [SITE_STATUS.Banned]: i18n.t('banned'),
  [SITE_STATUS.All]: i18n.t('all'),
}

export const SITE_STATUS_COLOR_MAP: SiteStatusColorMap = {
  [SITE_STATUS.ReadOnly]: 'text-gray-500',
  [SITE_STATUS.Normal]: '',
  [SITE_STATUS.Pending]: 'text-yellow-500',
  [SITE_STATUS.Reject]: 'text-red-500',
  [SITE_STATUS.Banned]: 'text-red-500',
  [SITE_STATUS.All]: '',
}

export const ARTICLE_STATUS_NAME_MAP: ArticleStatusNameMap = {
  pending: i18n.t('pending'),
  published: i18n.t('published'),
  rejected: i18n.t('rejected'),
  draft: i18n.t('draft'),
}

export const ARTICLE_STATUS_COLOR_MAP: ArticleStatusColorMap = {
  pending: 'text-yellow-500',
  published: '',
  rejected: 'text-red-500',
  draft: '',
}
