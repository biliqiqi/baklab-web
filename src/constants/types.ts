import { PERMISSION_DATA } from '@/constants/permissions'
import { ROLE_DATA } from '@/constants/roles'

export type RoleData = typeof ROLE_DATA
export type PermissionData = typeof PERMISSION_DATA
export type Role = keyof RoleData

/**
   @property level 角色层级，数值越小权限越大
   @property name 角色名称
   @property adapt_id 与后端适配用的角色id名称
   @property permissions 当前角色拥有的权限id字符串列表
 */
export interface RoleItem {
  level: number
  name: string
  adapt_id: string
  permissions: string[] | null
}

export type PermissionModule = keyof PermissionData
export type PermissionAction<K extends PermissionModule> =
  keyof PermissionData[K]

export type PermissionModuleData = Record<PermissionModule, string>

export interface PermissionItem {
  name: string
  adapt_id: string
  enable: boolean
}

export type PermitFn = <T extends PermissionModule>(
  m: T,
  a: PermissionAction<T>
) => boolean
