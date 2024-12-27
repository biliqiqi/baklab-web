import { type ClassValue, clsx } from 'clsx'
import EventEmitter from 'events'
import { twMerge } from 'tailwind-merge'

import { PERMISSION_DATA } from '@/constants/permissions'
import { ROLE_DATA } from '@/constants/roles'
import {
  PermissionAction,
  PermissionItem,
  PermissionModule,
  Role,
  RoleItem,
} from '@/constants/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const noop = () => {}

export const bus = new EventEmitter()

export const idIcon = (id: string) => `https://github.com/identicons/${id}.png`

export const getCookie = (name: string) => {
  const cookieArr = document.cookie.split(';')

  for (let i = 0; i < cookieArr.length; i++) {
    const cookiePair = cookieArr[i].split('=')

    const cookieName = cookiePair[0].trim()

    if (cookieName === name) {
      return decodeURIComponent(cookiePair[1])
    }
  }

  return null
}

export const extractDomain = (url: string) => new URL(url).hostname

export const getRoleName = (roleFrontId: Role) => {
  return ROLE_DATA[roleFrontId]?.name || ''
}

export const getRoleItem = (roleFrontId: Role): RoleItem | undefined => {
  return ROLE_DATA[roleFrontId]
}

export const getPermissionName = <K extends PermissionModule>(
  permissFrontId: string
): string | undefined => {
  const [module, action] = permissFrontId.split('.') as [K, PermissionAction<K>]

  try {
    const permit = PERMISSION_DATA[module][action] as PermissionItem
    return permit?.name
  } catch (_err) {
    return undefined
  }
}

export const formatMinutes = (totalMinutes: number): string => {
  if (totalMinutes < 0) {
    return '无效时间'
  }

  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60

  // 构建输出字符串
  const parts: string[] = []

  if (days > 0) {
    parts.push(`${days} 天`)
  }

  if (hours > 0) {
    parts.push(`${hours} 小时`)
  }

  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes} 分钟`)
  }

  return parts.join(' ')
}

export const summryText = (text: string, max: number) =>
  text.length > max ? text.slice(0, max) + '...' : text
