import { XIcon } from 'lucide-react'
import React, {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { timeFmt } from '@/lib/dayjs-custom'
import { toSync } from '@/lib/fire-and-forget'
import { cn, isInnerURL } from '@/lib/utils'

import { getSiteList, joinSite } from '@/api/site'
import {
  DEFAULT_CONTENT_WIDTH,
  DEFAULT_PAGE_SIZE,
  LEFT_SIDEBAR_STATE_KEY,
  NAV_HEIGHT,
  RIGHT_SIDEBAR_STATE_KEY,
  TOP_DRAWER_STATE_KEY,
} from '@/constants/constants'
import { useIsMobile } from '@/hooks/use-mobile'
import useDocumentTitle from '@/hooks/use-page-title'
import {
  useAlertDialogStore,
  useArticleHistoryStore,
  useAuthedUserStore,
  useCategoryStore,
  useDialogStore,
  useForceUpdate,
  useInviteCodeStore,
  useNotFoundStore,
  useRightSidebarStore,
  useSidebarStore,
  useSiteStore,
  useSiteUIStore,
  useTopDrawerStore,
  useUserUIStore,
} from '@/state/global'
import { FrontCategory, SITE_VISIBLE } from '@/types/types'

import ArticleHistory from '../ArticleHistory'
import Invite from '../Invite'
import NotFound from '../NotFound'
import SigninForm from '../SigninForm'
import SignupForm from '../SignupForm'
import SiteForm from '../SiteForm'
import SiteUIForm, { SiteUIFormRef } from '../SiteUIForm'
import UserUIForm, { UserUIFormRef } from '../UserUIForm'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Sidebar, SidebarContent, SidebarProvider } from '../ui/sidebar'
import BAvatar from './BAvatar'
import BNav from './BNav'
import BSidebar from './BSidebar'
import BTopDrawer from './BTopDrawer'

export interface BContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  category?: FrontCategory
  goBack?: boolean
  loading?: boolean
}

const BContainer = React.forwardRef<HTMLDivElement, BContainerProps>(
  ({ children, category, goBack = false, loading = false, ...props }, ref) => {
    const [regEmail, setRegEmail] = useState('')
    const [siteFormDirty, setSiteFormDirty] = useState(false)
    const [userUIFormDirty, setUserUIFormDirty] = useState(false)
    const [siteUIFormDirty, setSiteUIFormDirty] = useState(false)

    const { open: showTopDrawer, update: setShowTopDrawer } =
      useTopDrawerStore()
    const { signin, signup, updateSignin, updateSignup } = useDialogStore()
    const { showNotFound, updateNotFound } = useNotFoundStore()
    const { t } = useTranslation()

    const userUIFormRef = useRef<UserUIFormRef | null>(null)
    const siteUIFormRef = useRef<SiteUIFormRef | null>(null)

    const {
      sidebarOpen,
      setSidebarOpen,
      sidebarOpenMobile,
      setSidebarOpenMobile,
    } = useSidebarStore(
      useShallow(({ open, setOpen, openMobile, setOpenMobile }) => ({
        sidebarOpen: open,
        setSidebarOpen: setOpen,
        sidebarOpenMobile: openMobile,
        setSidebarOpenMobile: setOpenMobile,
      }))
    )

    const { siteMode } = useSiteUIStore(
      useShallow(({ mode }) => ({ siteMode: mode }))
    )

    const { siteListMode, contentWidth } = useUserUIStore(
      useShallow(({ siteListMode, contentWidth }) => ({
        siteListMode,
        contentWidth: contentWidth || DEFAULT_CONTENT_WIDTH,
      }))
    )

    const {
      openRightSidebar,
      setOpenRightSidebar,
      settingsType,
      openRightSidebarMobile,
      setOpenRightSidebarMobile,
    } = useRightSidebarStore(
      useShallow(
        ({ open, setOpen, openMobile, setOpenMobile, settingsType }) => ({
          openRightSidebar: open,
          setOpenRightSidebar: setOpen,
          openRightSidebarMobile: openMobile,
          setOpenRightSidebarMobile: setOpenMobile,
          settingsType,
        })
      )
    )
    /* const [openRightSidebar, setOpenRightSidebar] = useState(false) */
    /* const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false) */

    const { siteFrontId } = useParams()

    const alertDialog = useAlertDialogStore()

    const forceUpdate = useForceUpdate((state) => state.forceUpdate)

    const {
      currSite,
      updateCurrSite,
      fetchSiteList,
      fetchSiteData,
      showSiteAbout,
      setShowSiteAbout,
      showSiteForm,
      setShowSiteForm,
      editting,
      setEditting,
      edittingData,
      setEdittingData,
      updateSiteList,
    } = useSiteStore(
      useShallow(
        ({
          site,
          update,
          fetchSiteList,
          fetchSiteData,
          showSiteAbout,
          setShowSiteAbout,
          showSiteForm,
          setShowSiteForm,
          editting,
          setEditting,
          edittingData,
          setEdittingData,
          updateSiteList,
        }) => ({
          currSite: site,
          updateCurrSite: update,
          fetchSiteList,
          fetchSiteData,
          showSiteAbout,
          setShowSiteAbout,
          showSiteForm,
          setShowSiteForm,
          editting,
          setEditting,
          edittingData,
          setEdittingData,
          updateSiteList,
        })
      )
    )

    const { fetchCategoryList, updateCategories } = useCategoryStore(
      useShallow(({ fetchCategoryList, updateCategories, categories }) => ({
        cateList: categories,
        fetchCategoryList,
        updateCategories,
      }))
    )

    const { isLogined, authToken, currUserId } = useAuthedUserStore(
      useShallow(({ permit, userID, authToken, isLogined }) => ({
        currUserId: userID,
        authPermit: permit,
        isLogined,
        authToken,
      }))
    )

    const inviteCodeDialogRef = useRef<HTMLDivElement | null>(null)

    const {
      inviteCodeGeneratting,
      showInviteDialog,
      setShowInviteDialog,
      inviteCode,
    } = useInviteCodeStore(
      useShallow(
        ({
          generatting,
          setGeneratting,
          showDialog,
          setShowDialog,
          setInviteCode,
          inviteCode,
        }) => ({
          inviteCodeGeneratting: generatting,
          setInviteCodeGeneratting: setGeneratting,
          showInviteDialog: showDialog,
          setShowInviteDialog: setShowDialog,
          inviteCode,
          setInviteCode,
        })
      )
    )

    const navigate = useNavigate()

    const articleHistory = useArticleHistoryStore()

    const isReplyHistory = useMemo(
      () => articleHistory.article?.replyToId != '0',
      [articleHistory]
    )

    const {
      type: alertType,
      open: alertOpen,
      title: alertTitle,
      description: alertDescription,
      setOpen: setAlertOpen,
      confirmBtnText: alertConfirmBtnText,
      cancelBtnText: alertCancelBtnText,
    } = alertDialog

    const isMobile = useIsMobile()

    /* const [sidebarOpen, setSidebarOpen] = useState(!isMobile) */

    const location = useLocation()
    const isFeedPage = useMemo(
      () => ['/', `/${siteFrontId}/feed`].includes(location.pathname),
      [location, siteFrontId]
    )

    if (isFeedPage) {
      category = {
        frontId: 'feed',
        name: '信息流',
        describe: '你订阅的信息合集',
        isFront: true,
      }
    }

    const onAlertDialogCancel = useCallback(() => {
      if (alertType == 'confirm') {
        alertDialog.setState((state) => ({
          ...state,
          open: false,
          confirmed: false,
        }))
      }
    }, [alertDialog, alertType])

    const onAlertDialogConfirm = useCallback(() => {
      if (alertType == 'confirm') {
        alertDialog.setState((state) => ({
          ...state,
          open: false,
          confirmed: true,
        }))
      }
    }, [alertDialog, alertType])

    const onToggleTopDrawer = useCallback(() => {
      if (!showTopDrawer) {
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        })
      }
      setShowTopDrawer(!showTopDrawer)
      localStorage.setItem(TOP_DRAWER_STATE_KEY, String(!showTopDrawer))
    }, [showTopDrawer, setShowTopDrawer])

    const onJoinSiteClick = useCallback(
      async (ev: MouseEvent<HTMLButtonElement>) => {
        ev.preventDefault()
        if (!siteFrontId) return
        const { code } = await joinSite(siteFrontId)
        if (!code) {
          await Promise.all([
            fetchSiteData(siteFrontId),
            fetchSiteList(),
            fetchCategoryList(siteFrontId),
          ])
        }
      },
      [siteFrontId, fetchSiteData, fetchSiteList, fetchCategoryList]
    )

    const onSiteFormClose = useCallback(async () => {
      const close = () => {
        setShowSiteForm(false)
        setTimeout(() => {
          setEditting(false)
          setEdittingData(null)
        }, 500)
      }

      if (siteFormDirty) {
        const confirmed = await alertDialog.confirm(
          '确认',
          editting
            ? '站点设置未完成，确认舍弃？'
            : '站点创建未完成，确认舍弃？',
          'normal',
          {
            confirmBtnText: '确定舍弃',
            cancelBtnText: editting ? '继续设置' : '继续创建',
          }
        )
        if (confirmed) {
          close()
        }
      } else {
        close()
      }
    }, [
      siteFormDirty,
      editting,
      setEditting,
      setEdittingData,
      alertDialog,
      setShowSiteForm,
    ])

    const onSiteCreated = useCallback(
      async (newSiteFrontId: string) => {
        setShowSiteForm(false)
        const { code, data } = await getSiteList(
          1,
          DEFAULT_PAGE_SIZE,
          '',
          currUserId,
          '',
          SITE_VISIBLE.All
        )
        if (!code && data.list) {
          updateSiteList([...data.list])
          if (newSiteFrontId) {
            navigate(`/${newSiteFrontId}`)
          }
        }

        setTimeout(() => {
          setEditting(false)
          setEdittingData(null)
        }, 500)

        await Promise.all([
          fetchSiteList(),
          (async () => {
            if (!newSiteFrontId) return
            await fetchSiteData(newSiteFrontId)
          })(),
        ])
        forceUpdate()
      },
      [
        currUserId,
        setShowSiteForm,
        forceUpdate,
        updateSiteList,
        fetchSiteList,
        fetchSiteData,
        navigate,
      ]
    )

    const onRightSidebarClose = useCallback(async () => {
      if (userUIFormDirty) {
        const confirm = await alertDialog.confirm(
          '确认',
          '改动未保存，确定舍弃？',
          'normal',
          { confirmBtnText: '确定舍弃', cancelBtnText: '继续设置' }
        )
        if (!confirm) {
          return
        }
      }

      if (userUIFormRef.current) {
        userUIFormRef.current.form.reset()
      }

      if (siteUIFormDirty) {
        const confirm = await alertDialog.confirm(
          '确认',
          '改动未保存，确定舍弃？',
          'normal',
          { confirmBtnText: '确定舍弃', cancelBtnText: '继续设置' }
        )
        if (!confirm) {
          return
        }
      }

      if (siteUIFormRef.current) {
        siteUIFormRef.current.form.reset()
      }

      if (isMobile) {
        setOpenRightSidebarMobile(false)
      } else {
        setOpenRightSidebar(false)
      }
    }, [
      alertDialog,
      setOpenRightSidebar,
      userUIFormDirty,
      siteUIFormDirty,
      isMobile,
      setOpenRightSidebarMobile,
    ])

    const handleLinkClick: EventListener = (e) => {
      const targetElList = document.querySelectorAll('.b-article-content a')
      const targetEl = e.target as HTMLElement

      if (
        targetElList.length == 0 ||
        !Array.from(targetElList).includes(targetEl)
      ) {
        return
      }

      if (targetEl.tagName.toLowerCase() == 'a') {
        const linkEl = targetEl as HTMLAnchorElement
        if (isInnerURL(linkEl.href)) {
          e.preventDefault()
          const url = new URL(linkEl.href)
          navigate(linkEl.href.replace(url.origin, ''))
        } else {
          linkEl.target = '_blank'
        }
      }
    }

    useEffect(() => {
      if (siteFrontId) {
        toSync(async () =>
          Promise.all([
            fetchSiteData(siteFrontId),
            fetchCategoryList(siteFrontId),
          ])
        )()
      } else {
        updateCurrSite(null)
        updateCategories([])
      }
    }, [
      siteFrontId,
      fetchSiteData,
      updateCurrSite,
      fetchCategoryList,
      updateCategories,
      authToken,
    ])

    useDocumentTitle('')

    useEffect(() => {
      updateNotFound(false)
      return () => {
        if (isMobile) {
          setSidebarOpenMobile(false)
        }
        setShowSiteAbout(false)
      }
    }, [
      location,
      isMobile,
      updateNotFound,
      setShowSiteAbout,
      setSidebarOpenMobile,
    ])

    useEffect(() => {
      document.addEventListener('click', handleLinkClick)
      return () => {
        document.removeEventListener('click', handleLinkClick)
      }
    })

    return (
      <div>
        {siteListMode == 'top_drawer' && <BTopDrawer />}
        {siteMode == 'top_nav' && (
          <div className="bg-white dark:bg-slate-900 sticky top-0 z-50 border-b-2 shadow-sm">
            <BNav
              category={category}
              goBack={goBack}
              onGripClick={onToggleTopDrawer}
              className={cn('mx-auto')}
              style={{
                maxWidth: contentWidth == -1 ? '' : `${contentWidth}px`,
                paddingLeft: contentWidth == -1 ? `0.6rem` : ``,
                paddingRight: contentWidth == -1 ? `0.6rem` : ``,
              }}
            />
          </div>
        )}
        <SidebarProvider
          ref={ref}
          defaultOpen={false}
          className={cn('mx-auto justify-between')}
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          openMobile={sidebarOpenMobile}
          onOpenMobileChange={setSidebarOpenMobile}
          statePersistKey={LEFT_SIDEBAR_STATE_KEY}
          style={{
            minHeight: `calc(100vh - ${NAV_HEIGHT}px)`,
            maxWidth: contentWidth == -1 ? '' : `${contentWidth}px`,
          }}
        >
          <div
            className={cn(
              'w-0 sticky top-0 left-0 max-h-screen overflow-hidden',
              !isMobile && 'duration-200 transition-[width] ease-linear',
              !isMobile && sidebarOpen && 'w-[var(--sidebar-width)]'
            )}
            style={{
              top: siteMode == 'top_nav' ? `${NAV_HEIGHT}px` : '',
              maxHeight:
                siteMode == 'top_nav' ? `calc(100vh - ${NAV_HEIGHT}px)` : '',
            }}
          >
            <BSidebar category={category} />
          </div>
          <main
            className={cn(
              'flex-grow w-full',
              !isMobile && 'duration-200 transition-[width] ease-linear',
              !isMobile &&
                sidebarOpen &&
                'w-[calc(100%-var(--sidebar-width)*2)]'
            )}
          >
            {siteMode == 'sidebar' && (
              <BNav
                category={category}
                goBack={goBack}
                onGripClick={onToggleTopDrawer}
              />
            )}
            <div className="container mx-auto max-w-3xl px-4 py-4" {...props}>
              {showNotFound ? (
                <NotFound />
              ) : (
                <>
                  {children}
                  {isLogined() ? (
                    currSite &&
                    currSite.visible &&
                    !currSite.currUserState.isMember && (
                      <Card className="sticky bottom-0 p-2 px-4 -mx-2 text-sm mt-4 text-center">
                        你还不是当前站点成员，加入后可订阅新内容或参与互动。
                        <Button
                          size={'sm'}
                          className="ml-2"
                          onClick={onJoinSiteClick}
                        >
                          加入
                        </Button>
                      </Card>
                    )
                  ) : (
                    <Card className="sticky bottom-0 p-2 -mx-2 text-sm mt-4 text-center">
                      登录可后参与互动。
                      <Button
                        variant="default"
                        size="sm"
                        asChild
                        onClick={(e) => {
                          e.preventDefault()
                          updateSignin(true)
                        }}
                      >
                        <Link to="/signin">{t('signin')}</Link>
                      </Button>
                    </Card>
                  )}
                </>
              )}
            </div>
          </main>
          <SidebarProvider
            defaultOpen={false}
            open={openRightSidebar}
            onOpenChange={(open) => {
              if (open) {
                setOpenRightSidebar(true)
              } else {
                toSync(onRightSidebarClose)()
              }
            }}
            openMobile={openRightSidebarMobile}
            onOpenMobileChange={(open) => {
              if (open) {
                setOpenRightSidebar(true)
              } else {
                toSync(onRightSidebarClose)()
              }
            }}
            className="w-auto"
            statePersistKey={RIGHT_SIDEBAR_STATE_KEY}
            style={{
              minHeight: 'auto',
            }}
          >
            <div
              className={cn(
                'w-0 sticky top-0 right-0 max-h-screen overflow-hidden',
                !isMobile && 'duration-200 transition-[width] ease-linear',
                !isMobile && openRightSidebar && 'w-[var(--sidebar-width)]'
              )}
              style={{
                top: siteMode == 'top_nav' ? `${NAV_HEIGHT}px` : '',
                maxHeight:
                  siteMode == 'top_nav' ? `calc(100vh - ${NAV_HEIGHT}px)` : '',
              }}
            >
              <Sidebar side="right" className="relative max-h-full" gap={false}>
                <SidebarContent className="gap-0 px-2">
                  <div
                    className="flex items-center justify-between mb-2"
                    style={{ height: `${NAV_HEIGHT}px` }}
                  >
                    {settingsType == 'site_ui' && (
                      <span className="font-bold">站点界面设置</span>
                    )}
                    {settingsType == 'user_ui' && (
                      <span className="font-bold">个性化界面设置</span>
                    )}
                    <Button
                      variant={'ghost'}
                      size={'sm'}
                      title="关闭"
                      className="text-gray-500"
                      onClick={onRightSidebarClose}
                    >
                      <XIcon size={20} />
                    </Button>
                  </div>
                  {settingsType == 'site_ui' && (
                    <SiteUIForm
                      onChange={setSiteUIFormDirty}
                      ref={siteUIFormRef}
                    />
                  )}
                  {settingsType == 'user_ui' && (
                    <UserUIForm
                      onChange={setUserUIFormDirty}
                      ref={userUIFormRef}
                    />
                  )}
                </SidebarContent>
              </Sidebar>
            </div>
          </SidebarProvider>
        </SidebarProvider>

        <Dialog open={signin} onOpenChange={updateSignin}>
          <DialogContent className="w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('signin')}</DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>
            <SigninForm
              dialog
              email={regEmail}
              setEmail={setRegEmail}
              onSuccess={() => {
                updateSignin(false)
              }}
            />
          </DialogContent>
        </Dialog>
        <Dialog open={signup} onOpenChange={updateSignup}>
          <DialogContent className="w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('signup')}</DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>

            <SignupForm
              dialog
              email={regEmail}
              setEmail={setRegEmail}
              onSuccess={() => {
                updateSignup(false)
              }}
            />
          </DialogContent>
        </Dialog>

        <AlertDialog
          defaultOpen={false}
          open={alertOpen}
          onOpenChange={setAlertOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{alertTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {alertDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {alertType != 'alert' && (
                <AlertDialogCancel onClick={onAlertDialogCancel}>
                  {typeof alertCancelBtnText == 'function'
                    ? alertCancelBtnText()
                    : alertCancelBtnText}
                </AlertDialogCancel>
              )}
              <AlertDialogAction
                onClick={onAlertDialogConfirm}
                className={
                  alertDialog.confirmType == 'danger'
                    ? 'bg-red-600 hover:bg-red-500'
                    : ''
                }
              >
                {typeof alertConfirmBtnText == 'function'
                  ? alertConfirmBtnText()
                  : alertConfirmBtnText}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={articleHistory.showDialog}
          onOpenChange={(open) =>
            articleHistory.updateState({ showDialog: open })
          }
        >
          <DialogContent>
            {articleHistory.article && (
              <>
                <DialogHeader>
                  <DialogTitle>{`"${articleHistory.article.displayTitle}" 的编辑历史`}</DialogTitle>
                  <DialogDescription></DialogDescription>
                </DialogHeader>
                <div
                  className="overflow-y-auto break-words"
                  style={{ maxHeight: `calc(100vh - 300px)` }}
                >
                  {articleHistory.history.map((item) => (
                    <ArticleHistory
                      key={item.id}
                      data={item}
                      isReply={isReplyHistory}
                    />
                  ))}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showSiteAbout} onOpenChange={setShowSiteAbout}>
          <DialogContent>
            {currSite && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-bold">
                    关于{currSite.name}{' '}
                  </DialogTitle>
                  <DialogDescription></DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>{currSite.description}</div>
                  <div className="text-sm text-gray-500">
                    由&nbsp;
                    <Link to={`/users/${currSite.creatorName}`}>
                      <BAvatar username={currSite.creatorName} showUsername />
                    </Link>
                    &nbsp;创建于{timeFmt(currSite.createdAt, 'YYYY-M-D')}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showSiteForm} onOpenChange={onSiteFormClose}>
          <DialogContent className="max-md:max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editting ? '设置站点' : '创建站点'}</DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <SiteForm
                isEdit={editting}
                site={edittingData || undefined}
                onChange={setSiteFormDirty}
                onSuccess={onSiteCreated}
              />
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent ref={inviteCodeDialogRef}>
            {currSite && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-bold">邀请加入站点</DialogTitle>
                  <DialogDescription>
                    请复制以下链接并分享给好友
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Invite
                    data={inviteCode}
                    loading={inviteCodeGeneratting}
                    container={inviteCodeDialogRef.current}
                  />
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }
)

BContainer.displayName = 'BContainer'

export default BContainer
