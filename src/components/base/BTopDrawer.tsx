import { Link, useParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { cn } from '@/lib/utils'

import { DOCK_HEIGHT, SITE_LOGO_IMAGE } from '@/constants/constants'
import {
  useAuthedUserStore,
  useSiteStore,
  useTopDrawerStore,
} from '@/state/global'

import { Button } from '../ui/button'
import BSiteIcon from './BSiteIcon'

const BTopDrawer = () => {
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

  return (
    <div
      className="bg-gray-300 border-b-[1px] border-gray-300 shadow-inner transition-all opacity-0 h-0 overflow-hidden"
      style={
        showTopDrawer
          ? {
              opacity: 1,
              height: `${DOCK_HEIGHT}px`,
            }
          : {}
      }
    >
      <div
        className="flex justify-center items-center max-w-[1000px] mx-auto"
        style={{ height: `${DOCK_HEIGHT}px` }}
      >
        <div className="inline-flex items-center">
          {siteList &&
            siteList.map((site) => (
              <Link
                to={`/${site.frontId}`}
                key={site.frontId}
                className={cn(
                  'flex justify-center h-full w-[60px] overflow-hidden flex-shrink-0 flex-grow-0 mr-2 leading-3'
                )}
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
        </div>
        <div className="inline-flex items-center">
          <Link
            to={`/`}
            className={cn(
              'flex justify-center h-full w-[60px] overflow-hidden flex-shrink-0 flex-grow-0 mr-2 leading-3'
            )}
          >
            <BSiteIcon
              logoUrl={SITE_LOGO_IMAGE}
              name={`首页`}
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
              className="inline-flex flex-col items-center align-middle cursor-pointer"
              onClick={(e) => {
                e.preventDefault()
                setShowSiteForm(true)
              }}
            >
              <Button
                variant="secondary"
                className="rounded-full w-[40px] h-[40px] text-[24px] text-center text-gray-500 mb-1"
                key="new-site"
                title="创建站点"
              >
                +
              </Button>
              <span className="text-[14px] leading-[1.2]">创建站点</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default BTopDrawer
