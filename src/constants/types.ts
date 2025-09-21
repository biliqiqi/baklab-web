import i18next from 'i18next'

// import { PERMISSION_DATA } from '@/constants/permissions'
import { Site } from '@/types/types'

// These type definitions based on deprecated PERMISSION_DATA, now use backend returned data structure directly
// export type PermissionData = typeof PERMISSION_DATA

// Keep PermissionModule type definition as it's still used in getPermissionModuleName
export type PermissionModule = 'article' | 'user' | 'manage' | 'platform_manage' | 'permission' | 'role' | 'activity' | 'category' | 'site' | 'oauth'

// Keep PermissionAction type definition for compatibility, but based on hardcoded values not PERMISSION_DATA
export type PermissionAction<_K extends PermissionModule> = string

export type PermissionModuleData = Record<PermissionModule, string>

// This interface definition kept for compatibility, but no longer used in new permission system
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
