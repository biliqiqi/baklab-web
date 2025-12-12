import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Outlet, useLocation } from '@tanstack/react-router'
import { KeyIcon, UserIcon } from 'lucide-react'
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { useTranslation } from 'react-i18next'

import { Link, useNavigate } from '@/lib/router'
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

interface SettingsLayoutProps {
  modalOverride?: boolean
  forcedPathname?: string
  onRequestClose?: () => void
  onRouteChange?: (path: string) => void
  children?: ReactNode
}

export default function SettingsLayout({
  modalOverride,
  forcedPathname,
  onRequestClose,
  onRouteChange,
  children,
}: SettingsLayoutProps = {}) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const isSingleSite = useContextStore((state) => state.isSingleSite)
  const isMobile = useIsMobile()

  const state = location.state as { backgroundLocation?: BackgroundLocation }
  const effectivePathname = forcedPathname ?? location.pathname
  const showAsModal = modalOverride ?? Boolean(state?.backgroundLocation)
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
    const activeItem = settingsMenuItems.find((item) =>
      effectivePathname.startsWith(item.path)
    )
    return activeItem?.key || 'profile'
  }, [effectivePathname, settingsMenuItems])

  const handleDialogClose = useCallback(
    (open: boolean) => {
      if (open || !canCloseRef.current) {
        return
      }

      if (onRequestClose) {
        onRequestClose()
        return
      }

      if (state?.backgroundLocation) {
        const { pathname, search, hash } = state.backgroundLocation
        navigate({ to: `${pathname}${search || ''}${hash || ''}` })
      } else {
        window.history.back()
      }
    },
    [navigate, onRequestClose, state]
  )

  const handleRouteChange = useCallback(
    (path: string) => {
      if (showAsModal && onRouteChange) {
        onRouteChange(path)
      }
    },
    [onRouteChange, showAsModal]
  )

  const settingsContent = children ?? <Outlet />

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
          {settingsMenuItems.map((item) => {
            const className = cn(
              'flex items-center gap-2 text-left text-sm outline-none transition-colors h-auto',
              'px-2 py-2',
              isMobile &&
                'min-w-[120px] justify-center rounded-full border border-input bg-sidebar text-sidebar-foreground',
              activeKey === item.key
                ? 'bg-primary/90 font-medium text-primary-foreground'
                : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )

            if (showAsModal) {
              return (
                <button
                  key={item.key}
                  type="button"
                  className={className}
                  onClick={() => handleRouteChange(item.path)}
                >
                  <BIconCircle size={isMobile ? 28 : 32}>
                    {item.icon}
                  </BIconCircle>
                  <span className="truncate">{item.label}</span>
                </button>
              )
            }

            return (
              <Link key={item.key} to={item.path} className={className}>
                <BIconCircle size={isMobile ? 28 : 32}>
                  {item.icon}
                </BIconCircle>
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <div className={cn('flex-1 overflow-y-auto p-6', isMobile && 'p-4')}>
        {settingsContent}
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
