import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'
import { useEffect, useRef } from 'react'

import {
  buildThumbnailUrl,
  calculateThumbnailDimensions,
  parseImageMetadataFromUrl,
  thumbHashToPreview,
} from '@/lib/thumbhash'
import { setupLazyLoadImages } from '@/lib/utils'

import { useIsMobile } from './use-mobile'

interface UseImageGalleryOptions {
  galleryId: string
  contentRef: React.RefObject<HTMLElement>
  enabled?: boolean
  setupImages?: boolean
}

export function useImageGallery({
  galleryId,
  contentRef,
  enabled = true,
  setupImages = true,
}: UseImageGalleryOptions) {
  const lightboxRef = useRef<PhotoSwipeLightbox | null>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!enabled || !contentRef.current) return

    const imageHandlers = new Map<HTMLImageElement, () => void>()
    const images = contentRef.current.querySelectorAll('img')

    if (setupImages) {
      images.forEach((img) => {
        const parent = img.parentElement
        if (parent && !parent.classList.contains('pswp-gallery-item')) {
          const originalSrc = img.dataset.originalSrc || img.src
          const metadata = parseImageMetadataFromUrl(originalSrc)

          img.dataset.originalSrc = originalSrc

          if (metadata.width && metadata.height) {
            const thumbnailDimensions = calculateThumbnailDimensions(
              metadata.width,
              metadata.height,
              isMobile
            )

            img.style.width = `${thumbnailDimensions.width}px`
            img.style.aspectRatio = `${metadata.width} / ${metadata.height}`
            img.style.objectFit = 'cover'

            const thumbnailUrl = buildThumbnailUrl(
              originalSrc,
              thumbnailDimensions.width,
              thumbnailDimensions.height
            )
            img.dataset.thumbnailSrc = thumbnailUrl
          }

          if (metadata.thumbhash && img.dataset.loaded !== 'thumbhash') {
            try {
              const thumbDataUrl = thumbHashToPreview(metadata.thumbhash)
              img.src = thumbDataUrl
              img.dataset.loaded = 'thumbhash'
            } catch (error) {
              console.warn('Failed to generate thumbhash preview:', error)
            }
          }

          const wrapper = document.createElement('a')
          wrapper.href = originalSrc
          wrapper.classList.add('pswp-gallery-item')
          wrapper.style.cursor = 'zoom-in'

          if (metadata.thumbhash) {
            try {
              const thumbDataUrl = thumbHashToPreview(metadata.thumbhash)
              wrapper.dataset.pswpMsrc = thumbDataUrl
            } catch (error) {
              console.warn('Failed to set PhotoSwipe thumbnail:', error)
            }
          }

          if (metadata.width && metadata.height) {
            wrapper.dataset.pswpWidth = String(metadata.width)
            wrapper.dataset.pswpHeight = String(metadata.height)
          } else {
            const updateSize = () => {
              if (img.naturalWidth && img.naturalHeight) {
                wrapper.dataset.pswpWidth = String(img.naturalWidth)
                wrapper.dataset.pswpHeight = String(img.naturalHeight)
              }
            }

            if (img.complete && img.naturalWidth) {
              updateSize()
            } else {
              const loadHandler = () => {
                updateSize()
                img.removeEventListener('load', loadHandler)
              }
              img.addEventListener('load', loadHandler)
              imageHandlers.set(img, loadHandler)
            }
          }

          img.parentNode?.insertBefore(wrapper, img)
          wrapper.appendChild(img)
        }
      })

      const cleanupLazyLoad = setupLazyLoadImages(contentRef.current)

      lightboxRef.current = new PhotoSwipeLightbox({
        gallery: `#${galleryId}`,
        children: '.pswp-gallery-item',
        pswpModule: () => import('photoswipe'),
        wheelToZoom: true,
        initialZoomLevel: 'fit',
        secondaryZoomLevel: 2,
        maxZoomLevel: 4,
        arrowKeys: false,
        preload: [1, 2],
        bgOpacity: 0.8,
        spacing: 0.1,
        allowPanToNext: true,
        loop: false,
        pinchToClose: true,
        closeOnVerticalDrag: true,
        escKey: true,
        imageClickAction: 'close',
        tapAction: 'close',
      })

      if (isMobile) {
        lightboxRef.current.on('uiRegister', function () {
          if (lightboxRef.current?.pswp) {
            lightboxRef.current.pswp.ui?.registerElement({
              name: 'custom-style',
              appendTo: 'root',
              onInit: (el) => {
                const style = document.createElement('style')
                style.innerHTML = `
                  .pswp__button--arrow { display: none !important; }
                `
                el.appendChild(style)
              },
            })
          }
        })
      }

      lightboxRef.current.init()

      return () => {
        imageHandlers.forEach((handler, img) => {
          img.removeEventListener('load', handler)
        })
        imageHandlers.clear()
        cleanupLazyLoad()
        lightboxRef.current?.destroy()
        lightboxRef.current = null
      }
    } else {
      images.forEach((img) => {
        const parent = img.parentElement
        if (parent && !parent.classList.contains('pswp-gallery-item')) {
          const originalSrc = img.dataset.originalSrc || img.src
          const metadata = parseImageMetadataFromUrl(originalSrc)

          const wrapper = document.createElement('a')
          wrapper.href = originalSrc
          wrapper.classList.add('pswp-gallery-item')
          wrapper.style.cursor = 'zoom-in'

          if (metadata.thumbhash) {
            try {
              const thumbDataUrl = thumbHashToPreview(metadata.thumbhash)
              wrapper.dataset.pswpMsrc = thumbDataUrl
            } catch (error) {
              console.warn('Failed to set PhotoSwipe thumbnail:', error)
            }
          }

          if (metadata.width && metadata.height) {
            wrapper.dataset.pswpWidth = String(metadata.width)
            wrapper.dataset.pswpHeight = String(metadata.height)
          } else {
            const updateSize = () => {
              if (img.naturalWidth && img.naturalHeight) {
                wrapper.dataset.pswpWidth = String(img.naturalWidth)
                wrapper.dataset.pswpHeight = String(img.naturalHeight)
              }
            }

            if (img.complete && img.naturalWidth) {
              updateSize()
            } else {
              const loadHandler = () => {
                updateSize()
                img.removeEventListener('load', loadHandler)
              }
              img.addEventListener('load', loadHandler)
              imageHandlers.set(img, loadHandler)
            }
          }

          img.parentNode?.insertBefore(wrapper, img)
          wrapper.appendChild(img)
        }
      })

      lightboxRef.current = new PhotoSwipeLightbox({
        gallery: `#${galleryId}`,
        children: '.pswp-gallery-item',
        pswpModule: () => import('photoswipe'),
        wheelToZoom: true,
        initialZoomLevel: 'fit',
        secondaryZoomLevel: 2,
        maxZoomLevel: 4,
        arrowKeys: false,
        preload: [1, 2],
        bgOpacity: 0.8,
        spacing: 0.1,
        allowPanToNext: true,
        loop: false,
        pinchToClose: true,
        closeOnVerticalDrag: true,
        escKey: true,
        imageClickAction: 'close',
        tapAction: 'close',
      })

      if (isMobile) {
        lightboxRef.current.on('uiRegister', function () {
          if (lightboxRef.current?.pswp) {
            lightboxRef.current.pswp.ui?.registerElement({
              name: 'custom-style',
              appendTo: 'root',
              onInit: (el) => {
                const style = document.createElement('style')
                style.innerHTML = `
                  .pswp__button--arrow { display: none !important; }
                `
                el.appendChild(style)
              },
            })
          }
        })
      }

      lightboxRef.current.init()

      return () => {
        imageHandlers.forEach((handler, img) => {
          img.removeEventListener('load', handler)
        })
        imageHandlers.clear()
        lightboxRef.current?.destroy()
        lightboxRef.current = null
      }
    }
  }, [enabled, contentRef, galleryId, setupImages, isMobile])

  return lightboxRef
}
