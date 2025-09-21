import { KeyIcon, UserIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import BIconCircle from './icon/Circle'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar'

interface SettingsSidebarProps {
  activeKey?: string
}

export default function SettingsSidebar({ activeKey }: SettingsSidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()

  const settingsMenuItems = useMemo(
    () => [
      {
        key: 'profile',
        label: t('personalProfile'),
        path: '/settings/profile',
        icon: <UserIcon size={18} />,
      },
      // {
      //   key: 'security',
      //   label: t('security'),
      //   path: '/settings/security',
      //   icon: <ShieldIcon size={18} />,
      // },
      // {
      //   key: 'notifications',
      //   label: t('notifications'),
      //   path: '/settings/notifications',
      //   icon: <BellIcon size={18} />,
      // },
      // {
      //   key: 'preferences',
      //   label: t('contentPreferences'),
      //   path: '/settings/preferences',
      //   icon: <HeartIcon size={18} />,
      // },
      {
        key: 'authorizations',
        label: t('oauthAuthorizations'),
        path: '/settings/authorizations',
        icon: <KeyIcon size={18} />,
      },
      // {
      //   key: 'data',
      //   label: t('dataManagement'),
      //   path: '/settings/data',
      //   icon: <DatabaseIcon size={18} />,
      // },
    ],
    [t]
  )

  const currentActiveKey = useMemo(() => {
    if (activeKey) return activeKey

    const currentPath = location.pathname
    const activeItem = settingsMenuItems.find((item) =>
      currentPath.startsWith(item.path)
    )
    return activeItem?.key || 'profile'
  }, [location.pathname, settingsMenuItems, activeKey])

  return (
    <Sidebar className="relative max-h-full" gap={false}>
      <SidebarContent className="gap-0">
        <SidebarGroup>
          <SidebarGroupLabel>{t('settings')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsMenuItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentActiveKey === item.key}
                  >
                    <Link to={item.path}>
                      <BIconCircle size={32}>{item.icon}</BIconCircle>
                      {item.label}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
