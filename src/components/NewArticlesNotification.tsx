import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useNewArticlesStore } from '@/state/new-articles'

import { Button } from './ui/button'

interface NewArticlesNotificationProps {
  siteFrontId: string | null
  categoryFrontId: string | null
  currentArticleIds?: Set<string>
  onLoadNewArticles: () => void
}

export function NewArticlesNotification({
  siteFrontId,
  categoryFrontId,
  currentArticleIds,
  onLoadNewArticles,
}: NewArticlesNotificationProps) {
  const { t } = useTranslation()
  const newArticles = useNewArticlesStore((state) =>
    state.getNewArticles(siteFrontId, categoryFrontId)
  )

  const count = useMemo(() => {
    if (!currentArticleIds || currentArticleIds.size === 0) {
      return newArticles.length
    }
    return newArticles.filter((a) => !currentArticleIds.has(a.id)).length
  }, [newArticles, currentArticleIds])

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
