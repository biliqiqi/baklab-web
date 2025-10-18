import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useParams } from 'react-router-dom'

import BContainer from './components/base/BContainer'

import ArticleList from './components/ArticleList'

import ChatPage from './ChatPage'
import { getCategoryWithFrontId } from './api/category'
import { toSync } from './lib/fire-and-forget'
import { Category } from './types/types'

export default function BankuaiPage() {
  const [serverCate, setServerCate] = useState<Category | null>(null)
  const [initialized, setInitialized] = useState(false)

  const { state, pathname } = useLocation() as {
    state: Category | undefined
    pathname: string
  }

  const currCate = useMemo(() => state || serverCate, [state, serverCate])
  const { siteFrontId, categoryFrontId } = useParams()
  const { t } = useTranslation()

  const isAllPage = useMemo(
    () => pathname === '/all' || pathname === `/z/${siteFrontId}/all`,
    [pathname, siteFrontId]
  )

  const isChat = useMemo(
    () => currCate?.contentForm?.frontId == 'chat',
    [currCate]
  )

  // Clear state immediately when route params change
  useEffect(() => {
    setServerCate(null)
    setInitialized(false)
  }, [siteFrontId, categoryFrontId])

  useEffect(() => {
    if (!currCate && siteFrontId && categoryFrontId) {
      toSync(getCategoryWithFrontId, (data) => {
        if (!data.code) {
          setServerCate(data.data)
          setInitialized(true)
        }
      })(categoryFrontId, { siteFrontId })
    } else {
      setInitialized(true)
    }
  }, [currCate, categoryFrontId, siteFrontId])

  return (
    <BContainer
      category={{
        isFront: isAllPage,
        siteFrontId,
        frontId: isAllPage ? 'all' : currCate?.frontId || 'bankuai',
        name: isAllPage ? t('allPosts') : currCate?.name || '',
        describe: isAllPage
          ? siteFrontId
            ? t('siteAllPostsDescription')
            : t('allPostsDescription')
          : currCate?.describe || '',
      }}
    >
      {initialized &&
        (currCate && isChat ? (
          <ChatPage currCate={currCate} />
        ) : (
          <ArticleList />
        ))}
    </BContainer>
  )
}
