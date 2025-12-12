import { useLocation } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useSearch } from '@/lib/router'

import BContainer from './components/base/BContainer'

import BaseArticleList, {
  FetchArticlesParams,
  FetchArticlesResponse,
} from './components/BaseArticleList'
import ChatList from './components/ChatList'

import { buildRoutePath } from '@/hooks/use-route-match'
import { useSiteParams } from '@/hooks/use-site-params'

import { getArticleList, getFeedList } from './api/article'
import { getCategoryWithFrontId } from './api/category'
import { toSync } from './lib/fire-and-forget'
import { useSiteUIStore, useUserUIStore } from './state/global'
import { Category } from './types/types'

const isCategoryState = (value: unknown): value is Category => {
  if (!value || typeof value !== 'object') {
    return false
  }

  return 'frontId' in value
}

export default function CategoryPage() {
  const [serverCate, setServerCate] = useState<Category | null>(null)
  const [listLength, setListLength] = useState(0)

  const location = useLocation()
  const { pathname } = location
  const locationState = location.state

  const locationCategory = useMemo(
    () => (isCategoryState(locationState) ? locationState : undefined),
    [locationState]
  )

  const currCate = useMemo(
    () => locationCategory || serverCate,
    [locationCategory, serverCate]
  )
  const { siteFrontId, categoryFrontId } = useSiteParams()
  const { t } = useTranslation()
  const search = useSearch()

  const userArticleListMode = useUserUIStore((state) => state.articleListMode)
  const siteArticleListMode = useSiteUIStore((state) => state.articleListMode)
  const isSiteUIPreview = useSiteUIStore((state) => state.isSiteUIPreview)

  const articleListMode = isSiteUIPreview
    ? siteArticleListMode
    : userArticleListMode !== undefined
      ? userArticleListMode
      : siteArticleListMode

  const isFeedPage = useMemo(() => {
    if (pathname === '/') return true
    if (!siteFrontId) return false
    const siteFeedPath = buildRoutePath('/', siteFrontId)
    return pathname === siteFeedPath
  }, [pathname, siteFrontId])

  const isAllPage = useMemo(() => {
    const siteAllPath = buildRoutePath('/all', siteFrontId)
    return pathname === '/all' || pathname === siteAllPath
  }, [pathname, siteFrontId])

  const isChat = useMemo(
    () => currCate?.contentForm?.frontId == 'chat',
    [currCate]
  )

  useEffect(() => {
    setServerCate(null)
  }, [siteFrontId, categoryFrontId])

  useEffect(() => {
    if (!currCate && siteFrontId && categoryFrontId) {
      toSync(getCategoryWithFrontId, (data) => {
        if (!data.code) {
          setServerCate(data.data)
        }
      })(categoryFrontId, { siteFrontId })
    }
  }, [currCate, categoryFrontId, siteFrontId])

  const fetchArticles = useCallback(
    async (
      fetchParams: FetchArticlesParams
    ): Promise<FetchArticlesResponse> => {
      if (isFeedPage) {
        const keywords = search.keywords || ''
        const resp = await getFeedList(
          fetchParams.page,
          fetchParams.pageSize,
          fetchParams.sort,
          keywords,
          { siteFrontId }
        )
        const { category, ...rest } = resp.data
        return {
          ...resp,
          data: {
            ...rest,
            category: category
              ? {
                  frontId: category.frontId,
                  name: category.name,
                  describe: category.describe,
                  siteFrontId: category.siteFrontId,
                  isFront: true,
                }
              : undefined,
          },
        }
      } else {
        const resp = await getArticleList(
          fetchParams.page,
          fetchParams.pageSize,
          fetchParams.sort,
          categoryFrontId,
          '',
          undefined,
          '',
          '',
          undefined,
          { siteFrontId }
        )
        const { category, ...rest } = resp.data
        return {
          ...resp,
          data: {
            ...rest,
            category: category
              ? {
                  id: category.id,
                  frontId: category.frontId,
                  name: category.name,
                  describe: category.describe,
                  siteFrontId: category.siteFrontId,
                  isFront: true,
                }
              : undefined,
          },
        }
      }
    },
    [isFeedPage, siteFrontId, categoryFrontId, search]
  )

  const submitPath = useMemo(
    () =>
      categoryFrontId && currCate
        ? `/submit?category_id=${currCate.id}`
        : `/submit`,
    [currCate, categoryFrontId]
  )

  const feedTitle = siteFrontId ? t('siteFeed') : t('feed')
  const feedDescription = siteFrontId
    ? t('siteFeedDescription')
    : t('feedDescription')

  return (
    <BContainer
      category={{
        isFront: isFeedPage || isAllPage,
        siteFrontId,
        frontId: isFeedPage
          ? 'feed'
          : isAllPage
            ? 'all'
            : currCate?.frontId || 'bankuai',
        name: isFeedPage
          ? feedTitle
          : isAllPage
            ? t('allPosts')
            : currCate?.name || '',
        describe: isFeedPage
          ? feedDescription
          : isAllPage
            ? siteFrontId
              ? t('siteAllPostsDescription')
              : t('allPostsDescription')
            : currCate?.describe || '',
      }}
    >
      {currCate && isChat ? (
        <ChatList currCate={currCate} />
      ) : (
        <BaseArticleList
          fetchArticles={fetchArticles}
          siteFrontId={siteFrontId}
          categoryFrontId={categoryFrontId}
          isFeedList={isFeedPage}
          submitPath={submitPath}
          showTabsCondition={isFeedPage ? listLength > 0 : true}
          onPageStateChange={(pageState) => {
            setListLength(pageState.total)
          }}
          mode={articleListMode}
        />
      )}
    </BContainer>
  )
}
