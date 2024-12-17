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
