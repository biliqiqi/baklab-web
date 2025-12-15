import { useTranslation } from 'react-i18next'

import { useNewArticlesStore } from '@/state/new-articles'

import { Button } from './ui/button'

interface NewArticlesNotificationProps {
  siteFrontId: string | null
  categoryFrontId: string | null
  onLoadNewArticles: () => void
}

export function NewArticlesNotification({
  siteFrontId,
  categoryFrontId,
  onLoadNewArticles,
}: NewArticlesNotificationProps) {
  const { t } = useTranslation()
  const count = useNewArticlesStore((state) =>
    state.getNewArticlesCount(siteFrontId, categoryFrontId)
  )

  if (count === 0) {
    return null
  }

  return (
    <div className="mb-4 flex justify-center">
      <Button variant="outline" size="sm" onClick={onLoadNewArticles}>
        {count === 1
          ? t('newArticlesNotification.single', '有 1 篇新文章')
          : t('newArticlesNotification.multiple', {
              defaultValue: '有 {{count}} 篇新文章',
              count,
            })}
      </Button>
    </div>
  )
}
