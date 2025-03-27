import { EllipsisVerticalIcon } from 'lucide-react'
import { MouseEvent, useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { inviteToSite, quitSite } from '@/api/site'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useCategoryStore,
  useInviteCodeStore,
  useRightSidebarStore,
  useSiteStore,
} from '@/state/global'

import { Button } from './ui/button'

const SiteMenuButton = () => {
  const [openSiteMenu, setOpenSiteMenu] = useState(false)

  const { siteFrontId } = useParams()

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
    setShowSiteAbout,
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
        setShowSiteAbout,
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

  const { openRightSidebar, setOpenRightSidebar } = useRightSidebarStore(
    useShallow(({ open, setOpen }) => ({
      openRightSidebar: open,
      setOpenRightSidebar: setOpen,
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

      setOpenRightSidebar(!openRightSidebar)
    },
    [openRightSidebar, setOpenRightSidebar]
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
        '确认',
        `${!visible || !allowNonMemberInteract ? '退出后将无法参与本站点互动，确定退出' : '确定退出站点'}？`,
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
    ]
  )

  if (!currSite) {
    return null
  }

  return (
    <DropdownMenu open={openSiteMenu} onOpenChange={setOpenSiteMenu}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-[36px] w-[36px] p-0 text-gray-500"
          title="站点菜单"
        >
          <EllipsisVerticalIcon size={20} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="px-0" align="end" sideOffset={6}>
        {authPermit('site', 'manage') && (
          <DropdownMenuItem
            className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
            onClick={onEditSiteClick}
          >
            站点设置
          </DropdownMenuItem>
        )}
        {authPermit('site', 'manage') && (
          <DropdownMenuItem
            className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
            onClick={onEditSiteUIClick}
          >
            站点界面
          </DropdownMenuItem>
        )}
        {!currSite.visible && authPermit('site', 'invite') && (
          <DropdownMenuItem
            className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
            onClick={onInviteClick}
          >
            邀请加入
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0"
          onClick={() => setShowSiteAbout(true)}
        >
          关于
        </DropdownMenuItem>
        {!isMySite && currSite.currUserState.isMember && (
          <DropdownMenuItem
            className="cursor-pointer py-2 px-2 hover:bg-gray-200 hover:outline-0 text-destructive"
            onClick={onQuitSiteClick}
          >
            退出站点
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default SiteMenuButton
