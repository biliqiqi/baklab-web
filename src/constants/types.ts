import { PERMISSION_DATA } from '@/constants/permissions'
import { ROLE_DATA } from '@/constants/roles'

export type RoleData = typeof ROLE_DATA
export type PermissionData = typeof PERMISSION_DATA
export type Role = keyof RoleData

export type PermissionModule = keyof PermissionData
export type PermissionAction<K extends PermissionModule> =
  keyof PermissionData[K]

export interface PermissionItem {
  name: string
  adapt_id: string
  enable: boolean
}

export type PermitFn = <T extends PermissionModule>(
  m: T,
  a: PermissionAction<T>
) => boolean
