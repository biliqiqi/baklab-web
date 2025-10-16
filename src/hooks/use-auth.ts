import { useShallow } from 'zustand/react/shallow'

import { type PermissionAction, type PermissionModule } from '@/constants/types'
import { isLogined, useAuthedUserStore, useSiteStore } from '@/state/global'
import { SITE_STATUS, type Site } from '@/types/types'

export const useAuth: () => boolean = () => useAuthedUserStore(isLogined)

export const usePermit = <T extends PermissionModule>(
  module: T,
  action: PermissionAction<T>,
  globalScope?: boolean
): boolean => {
  const { user, permitUnderSite } = useAuthedUserStore(
    useShallow(({ user, permitUnderSite }) => ({ user, permitUnderSite }))
  )
  const site = useSiteStore((state) => state.site)

  const permissionId = `${module}.${String(action)}`

  if (!user || user.id === '0' || !module || !action) return false
  if (user.super) return true
  if (user.banned || !user.permissions) return false

  const basePermitted = user.permissions.some(
    (item) => item.frontId === permissionId
  )

  if (site && !globalScope) {
    return (
      permitUnderSite as <M extends PermissionModule>(
        site: Site,
        module: M,
        action: PermissionAction<M>
      ) => boolean
    )(site, module, action)
  } else {
    return basePermitted
  }
}

export const usePermitUnderSite = <T extends PermissionModule>(
  site: Site | null | undefined,
  module: T,
  action: PermissionAction<T>
): boolean => {
  const user = useAuthedUserStore((state) => state.user)

  const permissionId = `${module}.${String(action)}`

  if (!site || !user || user.id === '0' || !module || !action) return false
  if (user.super) return true
  if (user.banned || !user.permissions) return false

  const basePermitted = user.permissions.some(
    (item) => item.frontId === permissionId
  )

  if (user.roleFrontId === 'platform_admin') return true

  if (site.status !== SITE_STATUS.Normal) {
    return false
  }

  let sitePermitted = false
  if (site.currUserRole?.permissions && site.currUserRole.id !== '0') {
    sitePermitted = site.currUserRole.permissions.some(
      (item) => item.frontId === permissionId
    )
  }

  if (sitePermitted) return true

  if (site.allowNonMemberInteract) {
    return basePermitted
  }

  return false
}
