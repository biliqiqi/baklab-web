import { PERMISSION_DATA } from '@/constants/permissions'

// import { ROLE_DATA } from '@/constants/roles'

// export type RoleData = typeof ROLE_DATA
// export type FrontRole = keyof RoleData

/**
   @property level 角色层级，数值越小权限越大
   @property name 角色名称
   @property adapt_id 与后端适配用的角色id名称
   @property permissions 当前角色拥有的权限id字符串列表
 */
// export interface RoleItem {
//   level: number
//   name: string
//   adapt_id: string
//   permissions: string[] | null
// }

export type PermissionData = typeof PERMISSION_DATA
export type PermissionModule = keyof PermissionData
export type PermissionAction<K extends PermissionModule> =
  keyof PermissionData[K]

export type PermissionModuleData = Record<PermissionModule, string>

export interface PermissionItem {
  name: string
  adapt_id: string
  enable: boolean
}

/**
   对当前用户进行权限判断

   @param module {PermissionModule} 权限模块
   @param action {PermissionAction} 权限行为
   @param globalScope 是否全局权限
 */
export type PermitFn = <T extends PermissionModule>(
  module: T,
  action: PermissionAction<T>,
  globalScope?: boolean
) => boolean
