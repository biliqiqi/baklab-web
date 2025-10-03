import { EllipsisVerticalIcon } from 'lucide-react'
import React, {
  HTMLAttributes,
  MouseEvent,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { cn } from '@/lib/utils'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { inviteToSite, quitSite } from '@/api/site'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useCategoryStore,
  useInviteCodeStore,
  useRightSidebarStore,
  useSiteStore,
} from '@/state/global'

import BIconCircle from './icon/Circle'
import { Button } from './ui/button'

type SiteMenuMode = 'radius' | 'block'

interface SiteMenuButtonProps extends HTMLAttributes<HTMLButtonElement> {
  mode?: SiteMenuMode
}

const SiteMenuButton: React.FC<SiteMenuButtonProps> = ({
  mode = 'radius',
  className,
  ...props
}) => {
  const [openSiteMenu, setOpenSiteMenu] = useState(false)

  const { siteFrontId } = useParams()

  const { t } = useTranslation()

  const { authPermit, currUserId } = useAuthedUserStore(
    useShallow(({ permit, userID }) => ({
      authPermit: permit,
      currUserId: userID,
    }))
  )

  const {
    currSite,
    updateCurrSite,
    setShowSiteForm,
    setSiteEditting,
    setSiteEdittingData,
    // setShowSiteAbout,
    fetchSiteData,
    fetchSiteList,
  } = useSiteStore(
    useShallow(
      ({
        site,
        setShowSiteForm,
        setEdittingData,
        setEditting,
        setShowSiteAbout,
        update,
        fetchSiteData,
        fetchSiteList,
      }) => ({
        currSite: site,
        updateCurrSite: update,
        setShowSiteForm,
        setSiteEdittingData: setEdittingData,
        setSiteEditting: setEditting,
        // setShowSiteAbout,
        fetchSiteData,
        fetchSiteList,
      })
    )
  )

  const fetchCategoryList = useCategoryStore((state) => state.fetchCategoryList)

  const isMySite = useMemo(
    () => (currSite ? currSite.creatorId == currUserId : false),
    [currSite, currUserId]
  )

  const isMobile = useIsMobile()

  const { setOpenRightSidebar, setSettingsType, setOpenRightSidebarMobile } =
    useRightSidebarStore(
      useShallow(({ open, setOpen, setSettingsType, setOpenMobile }) => ({
        openRightSidebar: open,
        setOpenRightSidebar: setOpen,
        setOpenRightSidebarMobile: setOpenMobile,
        setSettingsType,
      }))
    )

  const { alertConfirm } = useAlertDialogStore(
    useShallow(({ confirm }) => ({ alertConfirm: confirm }))
  )

  const navigate = useNavigate()

  const onEditSiteClick = useCallback(
    (ev: MouseEvent<HTMLDivElement>) => {
      ev.preventDefault()
      if (!currSite) return
      setSiteEdittingData(currSite)
      setSiteEditting(true)
      setOpenSiteMenu(false)
      setShowSiteForm(true)
    },
    [currSite, setShowSiteForm, setSiteEditting, setSiteEdittingData]
  )

  const onEditSiteUIClick = useCallback(
    (ev: MouseEvent<HTMLDivElement>) => {
      ev.preventDefault()

      setSettingsType('site_ui')
      if (isMobile) {
        setOpenRightSidebarMobile(true)
      } else {
        setOpenRightSidebar(true)
      }

      setOpenSiteMenu(false)
    },
    [setOpenRightSidebar, setSettingsType, isMobile, setOpenRightSidebarMobile]
  )

  const { setInviteCodeGeneratting, setShowInviteDialog, setInviteCode } =
    useInviteCodeStore(
      useShallow(({ setGeneratting, setShowDialog, setInviteCode }) => ({
        setInviteCodeGeneratting: setGeneratting,
        setShowInviteDialog: setShowDialog,
        setInviteCode,
      }))
    )

  const onInviteClick = useCallback(
    async (ev: MouseEvent<HTMLDivElement>) => {
      ev.preventDefault()
      if (!siteFrontId) return

      try {
        setInviteCodeGeneratting(true)
        setShowInviteDialog(true)
        setOpenSiteMenu(false)
        const { code, data } = await inviteToSite(siteFrontId)
        if (!code) {
          setInviteCode(data.code)
        }
      } catch (err) {
        console.error('generate invite code error: ', err)
      } finally {
        setInviteCodeGeneratting(false)
      }
    },
    [siteFrontId, setInviteCodeGeneratting, setShowInviteDialog, setInviteCode]
  )

  const onQuitSiteClick = useCallback(
    async (ev: MouseEvent<HTMLDivElement>) => {
      ev.preventDefault()
      setOpenSiteMenu(false)

      if (!siteFrontId || !currSite) return
      const { visible, allowNonMemberInteract } = currSite
      const confirmed = await alertConfirm(
        t('confirm'),
        !visible || !allowNonMemberInteract
          ? t('quitSiteTipPrivate')
          : t('quitSiteTipPublick'),
        'danger'
      )
      if (!confirmed) return

      const { code } = await quitSite(siteFrontId)
      if (!code) {
        if (currSite && !currSite.visible) {
          updateCurrSite(null)
          navigate('/', { replace: true })
        }
        await Promise.all([
          fetchSiteData(siteFrontId),
          fetchSiteList(),
          fetchCategoryList(siteFrontId),
        ])
      }
    },
    [
      siteFrontId,
      navigate,
      alertConfirm,
      currSite,
      fetchCategoryList,
      fetchSiteData,
      fetchSiteList,
      t,
      updateCurrSite,
    ]
  )

  if (!currSite) {
    return null
  }

  return (
    <DropdownMenu open={openSiteMenu} onOpenChange={setOpenSiteMenu}>
      <DropdownMenuTrigger asChild>
        {mode == 'radius' ? (
          <Button
            {...props}
            variant="ghost"
            size="sm"
            className={cn('h-[36px] w-[36px] p-0 text-gray-500', className)}
            title={t('siteMenu')}
          >
            <EllipsisVerticalIcon size={20} />
          </Button>
        ) : (
          <span className="flex items-center gap-2 flex-grow p-2 cursor-pointer">
            <BIconCircle id="siteMenu" size={32}>
              <EllipsisVerticalIcon size={18} />
            </BIconCircle>
            {t('siteMenu')}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="px-0"
        align="end"
        alignOffset={mode == 'radius' ? 0 : -160}
        sideOffset={mode == 'radius' ? 6 : -40}
      >
        {authPermit('site', 'manage') && (
          <DropdownMenuItem
            className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
            onClick={onEditSiteClick}
          >
            {t('siteSettings')}
          </DropdownMenuItem>
        )}
        {authPermit('site', 'manage') && (
          <DropdownMenuItem
            className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
            onClick={onEditSiteUIClick}
          >
            {t('siteUI')}
          </DropdownMenuItem>
        )}
        {authPermit('site', 'invite') && (
          <DropdownMenuItem
            className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
            onClick={onInviteClick}
          >
            {t('invite')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to={`/${siteFrontId}/about`} className="py-2 px-2">
            {t('about')}
          </Link>
        </DropdownMenuItem>
        {!isMySite && currSite.currUserState.isMember && (
          <DropdownMenuItem
            className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0 text-destructive"
            onClick={onQuitSiteClick}
          >
            {t('quitSite')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default SiteMenuButton
