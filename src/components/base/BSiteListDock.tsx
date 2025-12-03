import type { FC, HTMLAttributes } from 'react'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import { cn } from '@/lib/utils'

import SITE_LOGO_IMAGE from '@/assets/logo.png'
import { SITE_LIST_DOCK_WIDTH } from '@/constants/constants'
import { useSiteParams } from '@/hooks/use-site-params'
import { useAuthedUserStore, useSiteStore } from '@/state/global'

import { Button } from '../ui/button'
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'
import SiteLink from './SiteLink'

type BSiteListDockProps = HTMLAttributes<HTMLDivElement>

const ICON_SIZE = 44

const BSiteListDock: FC<BSiteListDockProps> = ({
  className,
  style,
  ...props
}) => {
  const { t } = useTranslation()
  const { siteFrontId } = useSiteParams()
  const { siteList, cachedSiteList, setShowSiteForm, loadCachedSiteList } =
    useSiteStore(
      useShallow(
        ({
          siteList,
          cachedSiteList,
          setShowSiteForm,
          loadCachedSiteList,
        }) => ({
          siteList,
          cachedSiteList,
          setShowSiteForm,
          loadCachedSiteList,
        })
      )
    )

  useEffect(() => {
    loadCachedSiteList()
  }, [loadCachedSiteList])

  const combinedSiteList = useMemo(() => {
    const subscribedSites = siteList ?? []
    if (!cachedSiteList.length) {
      return subscribedSites
    }
    const subscribedFrontIds = new Set(
      subscribedSites.map((site) => site.frontId)
    )
    const dedupedCachedSites = cachedSiteList.filter(
      (cached) => !subscribedFrontIds.has(cached.frontId)
    )
    return [...subscribedSites, ...dedupedCachedSites]
  }, [siteList, cachedSiteList])

  const { checkPermit, isLogined } = useAuthedUserStore(
    useShallow(({ permit, isLogined }) => ({
      checkPermit: permit,
      isLogined,
    }))
  )

  const canCreateSite = isLogined() && checkPermit('site', 'create', true)

  return (
    <TooltipProvider delayDuration={150}>
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
        <Tooltip>
          <TooltipTrigger asChild>
            <SiteLink
              to="/"
              siteFrontId={undefined}
              useFallbackSiteFrontId={false}
              key="home"
              className={cn(
                'flex w-full items-center justify-center border-r-4 border-transparent transition-colors duration-150 hover:bg-muted',
                !siteFrontId && 'bg-primary/10 border-primary'
              )}
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
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={6}
            className="text-xs font-medium"
          >
            {t('homePage')}
          </TooltipContent>
        </Tooltip>
        <div
          className="flex flex-1 flex-col items-center overflow-y-auto pb-4"
          style={{ zIndex: 100 }}
        >
          {combinedSiteList.map((site) => {
            const isActive = siteFrontId == site.frontId
            return (
              <Tooltip key={site.frontId}>
                <TooltipTrigger asChild>
                  <SiteLink
                    to="/"
                    siteFrontId={site.frontId}
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
                        style={{
                          width: `${ICON_SIZE}px`,
                          height: `${ICON_SIZE}px`,
                        }}
                      >
                        <img alt={site.name} src={site.logoUrl} />
                      </span>
                    </div>
                  </SiteLink>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={6}
                  className="text-xs font-medium"
                >
                  {site.name || t('site')}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
        {canCreateSite && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="mt-auto flex w-full flex-col items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300"
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
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={12}
              className="text-xs font-medium"
            >
              {t('createSite')}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}

export default BSiteListDock
