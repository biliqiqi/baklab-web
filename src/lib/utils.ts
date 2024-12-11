import { type ClassValue, clsx } from 'clsx'
import EventEmitter from 'events'
import { twMerge } from 'tailwind-merge'

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
