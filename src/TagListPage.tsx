import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'

import { Badge } from './components/ui/badge'
import { Card } from './components/ui/card'

import BContainer from './components/base/BContainer'

import { Empty } from './components/Empty'

import { getSiteTags } from './api/site'
import { Tag } from './types/types'

export default function TagListPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const { siteFrontId } = useParams()

  const { t } = useTranslation()

  useEffect(() => {
    if (!siteFrontId) return

    const fetchTags = async () => {
      try {
        setLoading(true)
        const { code, data } = await getSiteTags(siteFrontId)
        if (!code && data) {
          setTags(data.list || [])
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchTags()
  }, [siteFrontId])

  if (loading) {
    return (
      <BContainer
        category={{
          isFront: true,
          frontId: 'tags',
          name: t('tags'),
          describe: t('tagsDescribe'),
        }}
      >
        <div className="flex justify-center items-center h-32">
          <div className="text-gray-500">{t('loading')}</div>
        </div>
      </BContainer>
    )
  }

  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'tags',
        name: t('tags'),
        describe: t('tagsDescribe'),
      }}
    >
      {tags.length === 0 ? (
        <Empty text={t('noTags')} />
      ) : (
        <Card className="p-6">
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/z/${siteFrontId}/tags/${encodeURIComponent(tag.name)}`}
              >
                <Badge
                  variant="secondary"
                  className="px-3 py-1.5 text-sm cursor-pointer hover:bg-secondary/90 transition-colors"
                >
                  <span className="font-medium">{tag.name}</span>
                  {tag.useCount > 0 && (
                    <span className="ml-1.5 text-xs font-normal text-text-secondary">
                      {tag.useCount}
                    </span>
                  )}
                </Badge>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </BContainer>
  )
}
