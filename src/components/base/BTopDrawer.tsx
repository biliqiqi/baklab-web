import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { cn } from '@/lib/utils'

import {
  DEFAULT_CONTENT_WIDTH,
  DOCK_HEIGHT,
  SITE_LOGO_IMAGE,
} from '@/constants/constants'
import {
  useAuthedUserStore,
  useSiteStore,
  useTopDrawerStore,
  useUserUIStore,
} from '@/state/global'

import { Button } from '../ui/button'
import BSiteIcon from './BSiteIcon'

const ICON_WIDTH = 60

const BTopDrawer = () => {
  const { t } = useTranslation()
  const { siteFrontId } = useParams()
  const { open: showTopDrawer } = useTopDrawerStore()
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

  const contentWidth = useUserUIStore((state) => state.contentWidth)

  return (
    <div
      className="bg-gray-200 border-b-[1px] border-gray-300 dark:border-slate-600 shadow-inner transition-all opacity-0 h-0 overflow-hidden"
      style={
        showTopDrawer
          ? {
              opacity: 1,
              height: `${DOCK_HEIGHT}px`,
            }
          : {
              border: 'none',
            }
      }
    >
      <div
        className="flex mx-auto overflow-y-hidden overflow-x-auto"
        style={{
          maxWidth: `${contentWidth || DEFAULT_CONTENT_WIDTH}px`,
          height: `${DOCK_HEIGHT}px`,
          scrollbarWidth: 'thin',
        }}
      >
        {siteList &&
          siteList.map((site) => (
            <Link
              to={`/${site.frontId}`}
              key={site.frontId}
              className={cn(
                'flex justify-center h-full overflow-hidden flex-shrink-0 flex-grow-0 mr-[8px] leading-3 pt-[8px]'
              )}
              style={{ width: `${ICON_WIDTH}px` }}
            >
              <BSiteIcon
                logoUrl={site.logoUrl}
                name={site.name}
                size={40}
                fontSize={14}
                showSiteName
                active={siteFrontId == site.frontId}
                vertical
                className="w-full"
              />
            </Link>
          ))}

        <Link
          to={`/`}
          className={cn(
            'flex justify-center h-full overflow-hidden flex-shrink-0 flex-grow-0 mr-2 leading-3 pt-[8px]'
          )}
          style={{ width: `${ICON_WIDTH}px` }}
        >
          <BSiteIcon
            logoUrl={SITE_LOGO_IMAGE}
            name={t('homePage')}
            size={40}
            fontSize={14}
            showSiteName
            active={!siteFrontId}
            className="w-full"
            vertical
          />
        </Link>
        {isLogined() && checkPermit('site', 'create', true) && (
          <span
            className="inline-flex flex-col flex-shrink-0 items-center align-middle cursor-pointer pt-[8px]"
            style={{ width: `${ICON_WIDTH}px` }}
            onClick={(e) => {
              e.preventDefault()
              setShowSiteForm(true)
            }}
          >
            <Button
              variant="secondary"
              className="rounded-full w-[40px] h-[40px] text-[24px] text-center text-gray-500 mb-1"
              key="new-site"
              title={t('createSite')}
            >
              +
            </Button>
            <span className="text-[14px] leading-[1.2] inline-block whitespace-nowrap overflow-hidden text-ellipsis">
              {t('createSite')}
            </span>
          </span>
        )}
      </div>
    </div>
  )
}

export default BTopDrawer
