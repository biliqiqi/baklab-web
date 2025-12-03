import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import { cn } from '@/lib/utils'

import SITE_LOGO_IMAGE from '@/assets/logo.png'
import { SITE_LIST_DOCK_WIDTH } from '@/constants/constants'
import { useSiteParams } from '@/hooks/use-site-params'
import { useAuthedUserStore, useSiteStore } from '@/state/global'

import { Button } from '../ui/button'
import BSiteIcon from './BSiteIcon'
import SiteLink from './SiteLink'

type BSiteListDockProps = React.HTMLAttributes<HTMLDivElement>

const ICON_SIZE = 44

const BSiteListDock: React.FC<BSiteListDockProps> = ({
  className,
  style,
  ...props
}) => {
  const { t } = useTranslation()
  const { siteFrontId } = useSiteParams()
  const { siteList, setShowSiteForm } = useSiteStore(
    useShallow(({ siteList, setShowSiteForm }) => ({
      siteList,
      setShowSiteForm,
    }))
  )

  const { checkPermit, isLogined } = useAuthedUserStore(
    useShallow(({ permit, isLogined }) => ({
      checkPermit: permit,
      isLogined,
    }))
  )

  const canCreateSite = isLogined() && checkPermit('site', 'create', true)

  return (
    <div
      className={cn(
        'flex h-full flex-shrink-0 flex-col items-center border-gray-200 p-2 dark:border-slate-700',
        'bg-white dark:bg-slate-900 z-[999] relative',
        className
      )}
      style={{ width: `${SITE_LIST_DOCK_WIDTH}px`, ...style }}
      {...props}
    >
      <div className="absolute top-0 right-0 h-full border-r z-0"></div>
      <SiteLink
        to="/"
        siteFrontId={undefined}
        useFallbackSiteFrontId={false}
        key="home"
        className={cn(
          'flex w-full items-center justify-center border-r-4 border-transparent transition-colors duration-150 hover:bg-muted',
          !siteFrontId && 'bg-primary/10 border-primary'
        )}
        title={t('homePage')}
        style={{
          width: `${SITE_LIST_DOCK_WIDTH}px`,
          height: `${SITE_LIST_DOCK_WIDTH}px`,
          zIndex: 100,
        }}
      >
        <div className="relative flex h-full w-full items-center justify-center">
          <span
            className="inline-block overflow-hidden rounded-full"
            style={{ width: `${ICON_SIZE}px`, height: `${ICON_SIZE}px` }}
          >
            <img alt={t('homePage')} src={SITE_LOGO_IMAGE} />
          </span>
        </div>
      </SiteLink>
      <div
        className="flex flex-1 flex-col items-center overflow-y-auto pb-4"
        style={{ zIndex: 100 }}
      >
        {siteList?.map((site) => {
          const isActive = siteFrontId == site.frontId
          return (
            <SiteLink
              to="/"
              siteFrontId={site.frontId}
              key={site.frontId}
              className={cn(
                'flex w-full items-center justify-center border-r-4 border-transparent transition-colors duration-150 hover:bg-muted',
                isActive && 'bg-primary/10 border-primary'
              )}
              title={site.name}
              style={{
                width: `${SITE_LIST_DOCK_WIDTH}px`,
                height: `${SITE_LIST_DOCK_WIDTH}px`,
              }}
            >
              <div className="relative flex h-full w-full items-center justify-center">
                <span
                  className="inline-block overflow-hidden rounded-full"
                  style={{ width: `${ICON_SIZE}px`, height: `${ICON_SIZE}px` }}
                >
                  <img alt={site.name} src={site.logoUrl} />
                </span>
              </div>
            </SiteLink>
          )
        })}
      </div>
      {canCreateSite && (
        <button
          className="mt-auto flex w-full flex-col items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300"
          title={t('createSite')}
          onClick={(e) => {
            e.preventDefault()
            setShowSiteForm(true)
          }}
        >
          <Button
            variant="secondary"
            className="mb-1 h-10 w-10 rounded-full p-0 text-2xl text-gray-500"
          >
            +
          </Button>
          <span className="sr-only">{t('createSite')}</span>
        </button>
      )}
    </div>
  )
}

export default BSiteListDock
