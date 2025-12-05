import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { KeyIcon, UserIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { cn } from '@/lib/utils'

import { Dialog, DialogContent, DialogTitle } from './components/ui/dialog'

import BIconCircle from './components/icon/Circle'

import { useIsMobile } from '@/hooks/use-mobile'
import { useContextStore } from '@/state/global'

interface BackgroundLocation {
  pathname: string
  search?: string
  hash?: string
}

export default function SettingsLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const isSingleSite = useContextStore((state) => state.isSingleSite)
  const isMobile = useIsMobile()

  const state = location.state as { backgroundLocation?: BackgroundLocation }
  const showAsModal = Boolean(state?.backgroundLocation)
  const canCloseRef = useRef(!showAsModal)

  useEffect(() => {
    if (!showAsModal) {
      canCloseRef.current = true
      return
    }

    canCloseRef.current = false
    const timer = setTimeout(() => {
      canCloseRef.current = true
    }, 150)

    return () => {
      canCloseRef.current = false
      clearTimeout(timer)
    }
  }, [showAsModal])

  const settingsMenuItems = useMemo(() => {
    const items = [
      {
        key: 'profile',
        label: t('personalProfile'),
        path: '/settings/profile',
        icon: <UserIcon size={18} />,
      },
      {
        key: 'authorizations',
        label: t('oauthAuthorizations'),
        path: '/settings/authorizations',
        icon: <KeyIcon size={18} />,
      },
    ]

    if (isSingleSite) {
      return items.filter((item) => item.key !== 'authorizations')
    }
    return items
  }, [t, isSingleSite])

  const activeKey = useMemo(() => {
    const currentPath = location.pathname
    const activeItem = settingsMenuItems.find((item) =>
      currentPath.startsWith(item.path)
    )
    return activeItem?.key || 'profile'
  }, [location.pathname, settingsMenuItems])

  const handleDialogClose = useCallback(
    (open: boolean) => {
      if (open || !canCloseRef.current) {
        return
      }

      if (state?.backgroundLocation) {
        const { pathname, search, hash } = state.backgroundLocation
        navigate(`${pathname}${search || ''}${hash || ''}`)
      } else {
        navigate(-1)
      }
    },
    [navigate, state]
  )

  const content = (
    <div
      className={cn(
        'flex h-full',
        isMobile ? 'flex-col overflow-hidden' : 'flex-row'
      )}
    >
      <div
        className={cn(
          'w-48 border-r bg-sidebar',
          isMobile && 'w-full border-r-0 border-b'
        )}
      >
        <div
          className={cn(
            'px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/70',
            isMobile && 'text-sm'
          )}
        >
          {t('settings')}
        </div>
        <div
          className={cn(
            isMobile ? 'flex gap-2 overflow-x-auto px-2 pb-3' : 'flex flex-col'
          )}
        >
          {settingsMenuItems.map((item) => (
            <Link
              key={item.key}
              to={item.path}
              state={{ backgroundLocation: state?.backgroundLocation }}
              className={cn(
                'flex items-center gap-2 text-left text-sm outline-none transition-colors h-auto',
                'px-2 py-2',
                isMobile &&
                  'min-w-[120px] justify-center rounded-full border border-input bg-sidebar text-sidebar-foreground',
                activeKey === item.key
                  ? 'bg-primary/90 font-medium text-primary-foreground'
                  : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <BIconCircle size={isMobile ? 28 : 32}>{item.icon}</BIconCircle>
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className={cn('flex-1 overflow-y-auto p-6', isMobile && 'p-4')}>
        <Outlet />
      </div>
    </div>
  )

  if (showAsModal) {
    return (
      <Dialog open={true} onOpenChange={handleDialogClose}>
        <DialogContent className="md:max-w-5xl md:h-[80vh] h-full w-full p-0 gap-0">
          <VisuallyHidden>
            <DialogTitle>{t('settings')}</DialogTitle>
          </VisuallyHidden>
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  return <div className="h-screen">{content}</div>
}
