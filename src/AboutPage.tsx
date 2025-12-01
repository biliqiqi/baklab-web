import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { timeFmt } from '@/lib/dayjs-custom'

import { Card } from './components/ui/card'

import BAvatar from './components/base/BAvatar'
import BContainer from './components/base/BContainer'

import { useSiteParams } from '@/hooks/use-site-params'

import { useSiteStore } from './state/global'

export default function AboutPage() {
  const { siteFrontId } = useSiteParams()
  const { t } = useTranslation()

  const { currSite } = useSiteStore(
    useShallow(({ site }) => ({
      currSite: site,
    }))
  )

  return (
    <BContainer
      category={{
        isFront: false,
        siteFrontId,
        frontId: 'about',
        name: t('about'),
        describe: '',
      }}
    >
      {!currSite ? (
        <div>{t('loading')}</div>
      ) : (
        <div className="space-y-4">
          <Card className="p-6">
            <h1 className="text-2xl font-bold mb-4">
              {t('about1', { name: currSite.name })}
            </h1>
            <div className="prose prose-slate dark:prose-invert max-w-none mb-6">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {currSite.description}
              </p>
            </div>
            <div className="border-t pt-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <Trans
                  i18nKey={'siteCreatedBy'}
                  components={{
                    userLink: (
                      <Link
                        to={`/users/${currSite.creatorName}`}
                        className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        <BAvatar username={currSite.creatorName} showUsername />
                      </Link>
                    ),
                    timeTag: (
                      <time>{timeFmt(currSite.createdAt, 'YYYY-M-D')}</time>
                    ),
                  }}
                />
              </div>
            </div>
          </Card>
        </div>
      )}
    </BContainer>
  )
}
