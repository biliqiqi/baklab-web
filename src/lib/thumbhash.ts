import {
  thumbHashToApproximateAspectRatio,
  thumbHashToDataURL,
} from 'thumbhash'

import {
  THUMBNAIL_MAX_DPR,
  THUMBNAIL_MAX_HEIGHT_DESKTOP,
  THUMBNAIL_MAX_HEIGHT_MOBILE,
  THUMBNAIL_MAX_WIDTH_DESKTOP,
  THUMBNAIL_MAX_WIDTH_MOBILE,
} from '@/constants/constants'

export interface ImageMetadata {
  thumbhash: string | null
  width: number | null
  height: number | null
}

export function parseImageMetadataFromUrl(url: string): ImageMetadata {
  const fileName = url.split('/').pop() || url
  const match = fileName.match(
    /^(.+?)(?:_tmbh([^_]+))?(?:_raw(\d+)x(\d+))?(\..+)$/
  )

  if (match) {
    return {
      thumbhash: match[2] || null,
      width: match[3] ? parseInt(match[3], 10) : null,
      height: match[4] ? parseInt(match[4], 10) : null,
    }
  }

  return { thumbhash: null, width: null, height: null }
}

export function parseThumbHashFromUrl(url: string): string | null {
  return parseImageMetadataFromUrl(url).thumbhash
}

function decodeThumbHashBase64(thumbhashBase64: string): Uint8Array {
  const base64 = thumbhashBase64.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const standardBase64 = base64 + padding
  const binary = atob(standardBase64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function thumbHashToPreview(thumbhashBase64: string): string {
  const bytes = decodeThumbHashBase64(thumbhashBase64)
  return thumbHashToDataURL(bytes)
}

export function getThumbHashAspectRatio(thumbhashBase64: string): number {
  const bytes = decodeThumbHashBase64(thumbhashBase64)
  return thumbHashToApproximateAspectRatio(bytes)
}

export function buildThumbnailUrl(
  originalUrl: string,
  targetWidth: number,
  targetHeight: number,
  quality: number = 80
): string {
  const url = new URL(originalUrl)
  url.searchParams.set('w', targetWidth.toString())
  url.searchParams.set('h', targetHeight.toString())
  url.searchParams.set('q', quality.toString())
  return url.toString()
}

export function calculateThumbnailWidth(
  originalWidth: number,
  isMobile: boolean
): number {
  const dpr = Math.min(window.devicePixelRatio || 1, THUMBNAIL_MAX_DPR)
  const baseWidth = isMobile ? THUMBNAIL_MAX_WIDTH_MOBILE : 800
  const targetWidth = baseWidth * dpr

  return Math.min(originalWidth, targetWidth)
}

export function calculateThumbnailDimensions(
  originalWidth: number,
  originalHeight: number,
  isMobile: boolean
): { width: number; height: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, THUMBNAIL_MAX_DPR)
  const maxWidth = isMobile
    ? THUMBNAIL_MAX_WIDTH_MOBILE
    : THUMBNAIL_MAX_WIDTH_DESKTOP
  const maxHeight = isMobile
    ? THUMBNAIL_MAX_HEIGHT_MOBILE
    : THUMBNAIL_MAX_HEIGHT_DESKTOP
  const targetMaxWidth = maxWidth * dpr
  const targetMaxHeight = maxHeight * dpr

  const widthRatio = targetMaxWidth / originalWidth
  const heightRatio = targetMaxHeight / originalHeight
  const scale = Math.min(widthRatio, heightRatio, 1)

  const thumbnailWidth = Math.round(originalWidth * scale)
  const thumbnailHeight = Math.round(originalHeight * scale)

  return { width: thumbnailWidth, height: thumbnailHeight }
}
