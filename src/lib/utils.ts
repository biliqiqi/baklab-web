import { type ClassValue, clsx } from 'clsx'
import EventEmitter from 'events'
import MarkdownIt from 'markdown-it'
import { KeyboardEvent, KeyboardEventHandler } from 'react'
import { twMerge } from 'tailwind-merge'

import { DEFAULT_FONT_SIZE } from '@/constants/constants'
import { SITE_STATUS_COLOR_MAP, SITE_STATUS_NAME_MAP } from '@/constants/maps'
import {
  PERMISSION_DATA,
  PERMISSION_MODULE_DATA,
} from '@/constants/permissions'
import {
  PermissionAction,
  PermissionItem,
  PermissionModule,
} from '@/constants/types'
import i18n from '@/i18n'
import { Article, SiteStatus } from '@/types/types'

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

export const deleteCookie = (
  name: string,
  path: string = '/',
  domain?: string
) => {
  const pastDate = new Date(0).toUTCString()

  let cookieString = `${name}=; expires=${pastDate}; path=${path}`

  if (domain) {
    cookieString += `; domain=${domain}`
  }

  document.cookie = cookieString
}

export const extractDomain = (url: string) => new URL(url).hostname

// export const getRoleName = (roleFrontId: FrontRole) => {
//   return ROLE_DATA[roleFrontId]?.name || ''
// }

// export const getRoleItem = (roleFrontId: FrontRole): RoleItem | undefined => {
//   return ROLE_DATA[roleFrontId]
// }

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

export const getPermissionModuleName = (moduleId: PermissionModule) =>
  PERMISSION_MODULE_DATA[moduleId] || i18n.t('unknowPermissionModule')

export const formatMinutes = (totalMinutes: number): string => {
  if (totalMinutes < 0) {
    return i18n.t('invalidTime')
  }

  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60

  const parts: string[] = []

  if (days > 0) {
    parts.push(i18n.t('dayCount', { num: days }))
  }

  if (hours > 0) {
    parts.push(i18n.t('hourCount', { num: hours }))
  }

  if (minutes > 0 || parts.length === 0) {
    parts.push(i18n.t('minuteCount', { num: minutes }))
  }

  return parts.join(' ')
}

export const summryText = (text: string, max: number) =>
  text.length > max ? text.slice(0, max) + '...' : text

export const extractText = (html: string) => {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

const md = new MarkdownIt({
  linkify: true,
})

export const renderMD = (markdown: string) => {
  const htmlStr = md.render(markdown)

  return htmlStr
}

export const md2text = (markdown: string) => {
  const htmlStr = renderMD(markdown)
  const tmpEl = document.createElement('div')
  tmpEl.innerHTML = htmlStr

  return tmpEl.textContent || ''
}

export const genArticlePath = ({ siteFrontId, id }: Article) =>
  `/${siteFrontId}/articles/${id}`

export const getSiteStatusName = (status: SiteStatus) =>
  SITE_STATUS_NAME_MAP[status] || ''

export const getSiteStatusColor = (status: SiteStatus) =>
  SITE_STATUS_COLOR_MAP[status] || ''

export const isInnerURL = (url: string) =>
  new URL(url).origin == location.origin

export const getFirstChar = (str: string) => {
  const firstCharRes = str.match(/(\p{L}|\p{Emoji_Presentation})/u)
  return firstCharRes ? firstCharRes[0] : ''
}

export const setRootFontSize = (size: string) => {
  const sizeNum = Number(size) || DEFAULT_FONT_SIZE
  document.documentElement.style.fontSize = `${sizeNum}px`
}

export const handleWithKeyName = (
  keyName: string,
  fn: KeyboardEventHandler
) => {
  return (ev: KeyboardEvent<HTMLElement>) => {
    if (ev.key.toLowerCase() == keyName.toLowerCase()) {
      fn(ev)
    }
  }
}
