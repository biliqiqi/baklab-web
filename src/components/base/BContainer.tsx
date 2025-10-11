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

import { toSync } from '@/lib/fire-and-forget'
import { cn, isInnerURL, summryText } from '@/lib/utils'

import { getSiteList, joinSite } from '@/api/site'
import {
  DEFAULT_CONTENT_WIDTH,
  DEFAULT_INNER_CONTENT_WIDTH,
  DEFAULT_PAGE_SIZE,
  DOCK_HEIGHT,
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
  useCategorySelectionModalStore,
  useCategoryStore,
  useDialogStore,
  useForceUpdate,
  useInviteCodeStore,
  useNotFoundStore,
  useReplyBoxStore,
  useRightSidebarStore,
  useSidebarStore,
  useSiteStore,
  useSiteUIStore,
  useTopDrawerStore,
  useUserUIStore,
} from '@/state/global'
import { FrontCategory, SITE_VISIBLE } from '@/types/types'

import ArticleHistory from '../ArticleHistory'
import CategorySelectionModal from '../CategorySelectionModal'
import Invite from '../Invite'
import NotFound from '../NotFound'
import ReplyBox from '../ReplyBox'
import SettingsSidebar from '../SettingsSidebar.tsx'
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
import BNav from './BNav'
import BSidebar from './BSidebar'
import BTopDrawer from './BTopDrawer'

export interface BContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  category?: FrontCategory
  goBack?: boolean
  loading?: boolean
  sidebarType?: 'default' | 'settings'
}

const BContainer = React.forwardRef<HTMLDivElement, BContainerProps>(
  (
    {
      children,
      category,
      goBack = false,
      loading: _loading = false,
      sidebarType = 'default',
      ...props
    },
    ref
  ) => {
    const [regEmail, setRegEmail] = useState('')
    const [siteFormDirty, setSiteFormDirty] = useState(false)
    const [userUIFormDirty, setUserUIFormDirty] = useState(false)
    const [siteUIFormDirty, setSiteUIFormDirty] = useState(false)

    const { showTopDrawer, setShowTopDrawer } = useTopDrawerStore(
      useShallow(({ open, update }) => ({
        showTopDrawer: open,
        setShowTopDrawer: update,
      }))
    )

    const { signin, signup, updateSignin, updateSignup } = useDialogStore()
    const { showNotFound, updateNotFound } = useNotFoundStore()
    const { t } = useTranslation()

    const userUIFormRef = useRef<UserUIFormRef | null>(null)
    const siteUIFormRef = useRef<SiteUIFormRef | null>(null)

    const { siteMode } = useSiteUIStore(
      useShallow(({ mode }) => ({ siteMode: mode }))
    )

    const bodyHeight = useMemo(() => {
      const currNavHeight = siteMode == 'top_nav' ? NAV_HEIGHT : 0

      return showTopDrawer
        ? `calc(100vh - ${currNavHeight + DOCK_HEIGHT}px)`
        : `calc(100vh - ${currNavHeight}px)`
    }, [showTopDrawer, siteMode])

    const outerContainerHeight = useMemo(() => {
      return showTopDrawer
        ? `calc(100vh - ${NAV_HEIGHT + DOCK_HEIGHT}px)`
        : `calc(100vh - ${NAV_HEIGHT}px)`
    }, [showTopDrawer])

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

    const { showReplyBox, ...replyBoxProps } = useReplyBoxStore(
      useShallow(
        ({
          show,
          setShow: _setShow,
          setState: _setState,
          ...replyBoxProps
        }) => ({
          showReplyBox: show,
          ...replyBoxProps,
        })
      )
    )

    const { siteListMode, contentWidth } = useUserUIStore(
      useShallow(({ siteListMode, contentWidth, innerContentWidth }) => ({
        siteListMode,
        contentWidth: contentWidth || DEFAULT_CONTENT_WIDTH,
        innerContentWidth: innerContentWidth || DEFAULT_INNER_CONTENT_WIDTH,
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

    const {
      categorySelectionModalOpen,
      categorySelectionModalSiteFrontId,
      setCategorySelectionModalOpen,
      showCategorySelectionModal,
    } = useCategorySelectionModalStore(
      useShallow(({ open, siteFrontId, setOpen, show }) => ({
        categorySelectionModalOpen: open,
        categorySelectionModalSiteFrontId: siteFrontId,
        setCategorySelectionModalOpen: setOpen,
        showCategorySelectionModal: show,
      }))
    )

    const forceUpdate = useForceUpdate((state) => state.forceUpdate)

    const {
      currSite,
      updateCurrSite,
      fetchSiteList,
      fetchSiteData,
      // showSiteAbout,
      // setShowSiteAbout,
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
          showSiteAbout: _showSiteAbout,
          setShowSiteAbout: _setShowSiteAbout,
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
          // showSiteAbout,
          // setShowSiteAbout,
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
          showCategorySelectionModal(siteFrontId)
        }
      },
      [
        siteFrontId,
        fetchSiteData,
        fetchSiteList,
        fetchCategoryList,
        showCategorySelectionModal,
      ]
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
          t('confirm'),
          editting ? t('siteEditDropConfirm') : t('siteCreateDropConfirm'),
          'normal',
          {
            confirmBtnText: t('dropConfirm'),
            cancelBtnText: editting
              ? t('continueSetting')
              : t('continueAdding'),
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
      t,
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
        setEditting,
        setEdittingData,
        editting,
        showCategorySelectionModal,
      ]
    )

    const onRightSidebarClose = useCallback(async () => {
      if (userUIFormDirty) {
        const confirm = await alertDialog.confirm(
          t('confirm'),
          t('unsavedDropConfirm'),
          'normal',
          {
            confirmBtnText: t('dropConfirm'),
            cancelBtnText: t('continueSetting'),
          }
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
          t('confirm'),
          t('unsavedDropConfirm'),
          'normal',
          {
            confirmBtnText: t('dropConfirm'),
            cancelBtnText: t('continueSetting'),
          }
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
      t,
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

    useDocumentTitle(category?.name || '')

    useEffect(() => {
      updateNotFound(false)
      return () => {
        if (isMobile) {
          setSidebarOpenMobile(false)
        }
        // setShowSiteAbout(false)
      }
    }, [
      location,
      isMobile,
      updateNotFound,
      // setShowSiteAbout,
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
          <div
            className="bg-white dark:bg-slate-900 sticky top-0 z-50 border-b-2 shadow-sm"
            style={{
              height: `${NAV_HEIGHT}px`,
              boxSizing: 'border-box',
            }}
          >
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
            minHeight: 'auto',
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
            }}
          >
            {sidebarType === 'settings' ? (
              <SettingsSidebar />
            ) : (
              <BSidebar category={category} bodyHeight={bodyHeight} />
            )}
          </div>
          <main
            id="main"
            className={cn(
              'relative flex-grow w-full',
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
            <div
              id="outer-container"
              style={{
                scrollbarColor: 'rgba(0, 0, 0, 0.5)',
                scrollbarWidth: 'thin',
              }}
            >
              <div
                className="container mx-auto p-4 max-md:px-2"
                {...props}
                style={{
                  // maxWidth: `${innerContentWidth}px`,
                  ...props.style,
                }}
              >
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
                          {t('joinTip')}
                          <Button
                            size={'sm'}
                            className="ml-2"
                            onClick={onJoinSiteClick}
                          >
                            {t('join')}
                          </Button>
                        </Card>
                      )
                    ) : (
                      <Card className="sticky bottom-0 p-2 -mx-2 text-sm mt-4 text-center">
                        <span>{t('signinTip')}</span>&nbsp;&nbsp;
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
            </div>
            {isLogined() && showReplyBox && <ReplyBox {...replyBoxProps} />}
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
                setOpenRightSidebarMobile(true)
              } else {
                toSync(onRightSidebarClose)()
              }
            }}
            className="w-auto"
            statePersistKey={RIGHT_SIDEBAR_STATE_KEY}
            style={{
              position: 'sticky',
              top: siteMode == 'top_nav' ? `${NAV_HEIGHT}px` : '',
              minHeight: 'auto',
            }}
          >
            <div
              className={cn(
                'w-0 max-h-screen overflow-hidden',
                !isMobile && 'duration-200 transition-[width] ease-linear',
                !isMobile && openRightSidebar && 'w-[var(--sidebar-width)]'
              )}
            >
              <Sidebar side="right" className="relative max-h-full" gap={false}>
                <SidebarContent
                  className="gap-0 px-2"
                  style={{ minHeight: bodyHeight }}
                >
                  <div
                    className="flex items-center justify-between mb-2"
                    style={{ height: `${NAV_HEIGHT}px` }}
                  >
                    {settingsType == 'site_ui' && (
                      <span className="font-bold">{t('siteUISettings')}</span>
                    )}
                    {settingsType == 'user_ui' && (
                      <span className="font-bold">
                        {t('personalizationUISettings')}
                      </span>
                    )}
                    <Button
                      variant={'ghost'}
                      size={'sm'}
                      title={t('close')}
                      className="text-gray-500"
                      onClick={onRightSidebarClose}
                    >
                      <XIcon size={20} />
                    </Button>
                  </div>
                  {(openRightSidebar || openRightSidebarMobile) &&
                    settingsType == 'site_ui' && (
                      <SiteUIForm
                        onChange={setSiteUIFormDirty}
                        ref={siteUIFormRef}
                      />
                    )}
                  {(openRightSidebar || openRightSidebarMobile) &&
                    settingsType == 'user_ui' && (
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
                  <DialogTitle>
                    {t('postEditHistory', {
                      title: articleHistory.article.title
                        ? articleHistory.article.displayTitle
                        : summryText(articleHistory.article.content, 120),
                    })}
                  </DialogTitle>
                  <DialogDescription></DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto break-words">
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

        {/* <Dialog open={showSiteAbout} onOpenChange={setShowSiteAbout}>
          <DialogContent>
            {currSite && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-bold">
                    {t('about1', { name: currSite.name })}
                  </DialogTitle>
                  <DialogDescription></DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>{currSite.description}</div>
                  <div className="text-sm text-gray-500">
                    <Trans
                      i18nKey={'siteCreatedBy'}
                      components={{
                        userLink: (
                          <Link to={`/users/${currSite.creatorName}`}>
                            <BAvatar
                              username={currSite.creatorName}
                              showUsername
                            />
                          </Link>
                        ),
                        timeTag: (
                          <time>{timeFmt(currSite.createdAt, 'YYYY-M-D')}</time>
                        ),
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog> */}

        <Dialog open={showSiteForm} onOpenChange={onSiteFormClose}>
          <DialogContent className="max-md:max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {editting ? t('editSite') : t('createSite')}
              </DialogTitle>
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
                  <DialogTitle className="font-bold">
                    {t('inviteToSite')}
                  </DialogTitle>
                  <DialogDescription>{t('inviteTip')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Invite
                    data={inviteCode}
                    loading={inviteCodeGeneratting}
                    container={inviteCodeDialogRef.current}
                    publicSite={currSite.visible}
                  />
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {categorySelectionModalSiteFrontId && (
          <CategorySelectionModal
            open={categorySelectionModalOpen}
            onOpenChange={setCategorySelectionModalOpen}
            siteFrontId={categorySelectionModalSiteFrontId}
          />
        )}
      </div>
    )
  }
)

BContainer.displayName = 'BContainer'

export default BContainer
