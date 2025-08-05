import { type ClassValue, clsx } from 'clsx'
import EventEmitter from 'events'
import MarkdownIt from 'markdown-it'
import { KeyboardEvent, KeyboardEventHandler } from 'react'
import { twMerge } from 'tailwind-merge'

import { DEFAULT_FONT_SIZE } from '@/constants/constants'
import { SITE_STATUS_COLOR_MAP } from '@/constants/maps'
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
import { Article, ArticleStatus, SITE_STATUS, SiteStatus } from '@/types/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const noop = () => { }

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
    // @ts-expect-error permission name keys
    return i18n.t(permit?.name || 'unknow permission name')
  } catch (_err) {
    return undefined
  }
}

export const getPermissionModuleName = (moduleId: PermissionModule): string => {
  return (
    // @ts-expect-error permission module name keys
    i18n.t(PERMISSION_MODULE_DATA[moduleId]) || i18n.t('unknowPermissionModule')
  )
}

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

export const genArticlePath = ({
  siteFrontId,
  id,
  categoryFrontId,
  contentForm,
}: Article) => {
  if (contentForm && contentForm.frontId == 'chat') {
    return `/${siteFrontId}/bankuai/${categoryFrontId}#message${id}`
  }
  return `/${siteFrontId}/articles/${id}`
}

export const getSiteStatusName = (status: SiteStatus) => {
  switch (status) {
    case SITE_STATUS.ReadOnly:
      return i18n.t('readonly')
    case SITE_STATUS.Normal:
      return i18n.t('normal')
    case SITE_STATUS.Pending:
      return i18n.t('pending')
    case SITE_STATUS.Reject:
      return i18n.t('rejected')
    case SITE_STATUS.Banned:
      return i18n.t('banned')
    case SITE_STATUS.All:
      return i18n.t('all')
    default:
      return ''
  }
}

export const getSiteStatusColor = (status: SiteStatus) =>
  SITE_STATUS_COLOR_MAP[status] || ''

export const getArticleStatusName = (status: ArticleStatus) => {
  switch (status) {
    case 'pending':
      return i18n.t('pending')
    case 'published':
      return i18n.t('published')
    case 'rejected':
      return i18n.t('rejected')
    case 'draft':
      return i18n.t('draft')
    default:
      return ''
  }
}

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

export const getModeReasons = () => [
  i18n.t('ads'),
  i18n.t('unfriendly'),
  i18n.t('rumors'),
  i18n.t('sexViolence'),
  i18n.t('politics'),
  i18n.t('racist'),
  i18n.t('privacy'),
  i18n.t('troll'),
  i18n.t('pirate'),
  i18n.t('selfHarm'),
  i18n.t('lackAIGenNote'),
]

export const scrollToBottom = (
  scrollBehavior: ScrollBehavior,
  fn?: () => void
) => {
  const container = document.querySelector('#outer-container')
  if (container) {
    setTimeout(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: scrollBehavior,
      })

      if (typeof fn == 'function') {
        setTimeout(fn, 100)
      }
    }, 100)
  }
}

export const scrollToElement = (
  element: HTMLElement,
  callback = noop,
  mode: ScrollBehavior = 'smooth'
) => {
  if (!element) return

  element.scrollIntoView({ behavior: mode, block: 'center' })

  if (mode == 'smooth') {
    setTimeout(() => {
      callback()
    }, 500)
  } else {
    callback()
  }
}

export const highlightElement = (element: HTMLElement, className: string) => {
  element.classList.add(className)
  setTimeout(() => {
    element.classList.remove(className)
  }, 2000)
}
