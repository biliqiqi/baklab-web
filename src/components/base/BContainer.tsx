import React, {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { toSync } from '@/lib/fire-and-forget'
import { cn } from '@/lib/utils'

import { joinSite } from '@/api/site'
import { useIsMobile } from '@/hooks/use-mobile'
import useDocumentTitle from '@/hooks/use-page-title'
import {
  useAlertDialogStore,
  useArticleHistoryStore,
  useAuthedUserStore,
  useCategoryStore,
  useDialogStore,
  useNotFoundStore,
  useSidebarStore,
  useSiteStore,
  useTopDrawerStore,
} from '@/state/global'
import { FrontCategory } from '@/types/types'

import ArticleHistory from '../ArticleHistory'
import NotFound from '../NotFound'
import SigninForm from '../SigninForm'
import SignupForm from '../SignupForm'
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
import { SidebarProvider } from '../ui/sidebar'
import { BLoaderBlock } from './BLoader'
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

    const { open: showTopDrawer, update: setShowTopDrawer } =
      useTopDrawerStore()
    const { signin, signup, updateSignin, updateSignup } = useDialogStore()
    const { showNotFound, updateNotFound } = useNotFoundStore()

    const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebarStore()
    const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false)

    const { siteFrontId } = useParams()

    const alertDialog = useAlertDialogStore()

    const { currSite, updateCurrSite, fetchSiteList, fetchSiteData } =
      useSiteStore(
        useShallow(({ site, update, fetchSiteList, fetchSiteData }) => ({
          currSite: site,
          updateCurrSite: update,
          fetchSiteList,
          fetchSiteData,
        }))
      )

    const { fetchCategoryList, updateCategories } = useCategoryStore(
      useShallow(({ fetchCategoryList, updateCategories, categories }) => ({
        cateList: categories,
        fetchCategoryList,
        updateCategories,
      }))
    )

    const { isLogined, authToken } = useAuthedUserStore(
      useShallow(({ permit, userID, authToken, isLogined }) => ({
        currUserId: userID,
        authPermit: permit,
        isLogined,
        authToken,
      }))
    )

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
      document.cookie = `top_drawer:state=${String(!showTopDrawer)};path=/`
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
      }
    }, [location, isMobile, updateNotFound])

    return (
      <div>
        <BTopDrawer />
        <SidebarProvider
          ref={ref}
          defaultOpen={false}
          className="max-w-[1000px] mx-auto relative justify-between"
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          openMobile={sidebarOpenMobile}
          onOpenMobileChange={setSidebarOpenMobile}
        >
          <div
            className={cn(
              'w-0 sticky top-0 left-0 max-h-screen overflow-hidden',
              !isMobile && 'duration-200 transition-[width] ease-linear',
              !isMobile && sidebarOpen && 'w-[var(--sidebar-width)]'
            )}
          >
            <BSidebar category={category} />
          </div>
          <main
            className={cn(
              'flex-grow border-l-[1px] b-bg-main w-full',
              !isMobile && 'duration-200 transition-[width] ease-linear',
              !isMobile && sidebarOpen && 'w-[calc(100%-var(--sidebar-width))]'
            )}
          >
            <BNav
              category={category}
              goBack={goBack}
              onGripClick={onToggleTopDrawer}
            />
            <div className="container mx-auto max-w-3xl px-4 py-4" {...props}>
              {showNotFound ? (
                <NotFound />
              ) : loading ? (
                <BLoaderBlock />
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
                        <Link to="/signin">登录</Link>
                      </Button>
                    </Card>
                  )}
                </>
              )}
            </div>
          </main>
        </SidebarProvider>

        <Dialog open={signin} onOpenChange={updateSignin}>
          <DialogContent className="w-[500px]">
            <DialogHeader>
              <DialogTitle>登录</DialogTitle>
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
              <DialogTitle>注册</DialogTitle>
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
                  {alertCancelBtnText}
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
                {alertConfirmBtnText}
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
      </div>
    )
  }
)

BContainer.displayName = 'BContainer'

export default BContainer
