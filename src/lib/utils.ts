import { clsx, type ClassValue } from 'clsx'
import EventEmitter from 'events'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const noop = () => {}

export const bus = new EventEmitter()

export const idIcon = (id: string) => `https://github.com/identicons/${id}.png`
