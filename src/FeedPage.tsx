import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

import BContainer from './components/base/BContainer'

import FeedArticleList from './components/FeedArticleList'

export default function FeedPage() {
  const { siteFrontId } = useParams()
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
      <FeedArticleList key={`feed-${siteFrontId || 'global'}`} />
    </BContainer>
  )
}
