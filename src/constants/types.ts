import i18next from 'i18next'

import { Site } from '@/types/types'


export type PermissionModule = 'article' | 'user' | 'manage' | 'platform_manage' | 'permission' | 'role' | 'activity' | 'category' | 'site' | 'oauth'

export type PermissionAction<_K extends PermissionModule> = string

export type PermissionModuleData = Record<PermissionModule, string>

export interface PermissionItem {
  name: string
  adapt_id: string
  enable: boolean
}

/**
   Check if the permission module is globally used
   @param module {PermissionModule} Permission mudle
   @param action {PermissionAction} Permission action
   @param globalScope Is globally used
 */
export type PermitFn = <T extends PermissionModule>(
  module: T,
  action: PermissionAction<T>,
  globalScope?: boolean
) => boolean

export type PermitUnderSiteFn = <T extends PermissionModule>(
  site: Site,
  module: T,
  action: PermissionAction<T>
) => boolean

export type I18n = typeof i18next
