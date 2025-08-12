import i18next from 'i18next'

// import { PERMISSION_DATA } from '@/constants/permissions' // 注释：已被后端翻译系统替代
import { Site } from '@/types/types'

// 注释：这些类型定义基于已弃用的 PERMISSION_DATA，现在直接使用后端返回的数据结构
// export type PermissionData = typeof PERMISSION_DATA

// 保留 PermissionModule 类型定义，因为它仍在 getPermissionModuleName 中使用
export type PermissionModule = 'article' | 'user' | 'manage' | 'platform_manage' | 'permission' | 'role' | 'activity' | 'category' | 'site'

// 注释：保留 PermissionAction 类型定义以维持兼容性，但基于硬编码值而不是 PERMISSION_DATA
export type PermissionAction<_K extends PermissionModule> = string

export type PermissionModuleData = Record<PermissionModule, string>

// 注释：这个接口定义保留以维持兼容性，但在新的权限系统中不再使用
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
