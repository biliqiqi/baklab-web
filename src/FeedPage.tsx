import { useTranslation } from 'react-i18next'

import BContainer from './components/base/BContainer'

import FeedArticleList from './components/FeedArticleList'

import { useSiteParams } from '@/hooks/use-site-params'

export default function FeedPage() {
  const { siteFrontId } = useSiteParams()
  const { t } = useTranslation()

  const feedTitle = siteFrontId ? t('siteFeed') : t('feed')
  const feedDescription = siteFrontId
    ? t('siteFeedDescription')
    : t('feedDescription')

  return (
    <BContainer
      category={{
        isFront: true,
        siteFrontId,
        frontId: 'feed',
        name: feedTitle,
        describe: feedDescription,
      }}
    >
      <FeedArticleList />
    </BContainer>
  )
}
