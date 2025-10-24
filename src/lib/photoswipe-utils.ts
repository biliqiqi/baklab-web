import PhotoSwipeLightbox from 'photoswipe/lightbox'

interface PhotoSwipeBaseOptions {
  galleryId?: string
  dataSource?: Array<{
    src: string
    msrc?: string
    w?: number
    h?: number
  }>
  isMobile?: boolean
  showHideAnimationType?: 'zoom' | 'fade' | 'none'
}

const BASE_OPTIONS = {
  pswpModule: () => import('photoswipe'),
  wheelToZoom: true,
  initialZoomLevel: 'fit' as const,
  secondaryZoomLevel: 2,
  maxZoomLevel: 4,
  bgOpacity: 0.8,
  spacing: 0.1,
  allowPanToNext: true,
  loop: false,
  pinchToClose: true,
  closeOnVerticalDrag: true,
  escKey: true,
  imageClickAction: 'close' as const,
  tapAction: 'close' as const,
}

export function createPhotoSwipeLightbox(
  options: PhotoSwipeBaseOptions
): PhotoSwipeLightbox {
  const { galleryId, dataSource, isMobile, showHideAnimationType } = options

  const lightboxOptions = {
    ...BASE_OPTIONS,
    ...(galleryId
      ? {
          gallery: `#${galleryId}`,
          children: '.pswp-gallery-item',
          arrowKeys: false,
          preload: [1, 2] as [number, number],
        }
      : {}),
    ...(dataSource ? { dataSource } : {}),
    ...(showHideAnimationType ? { showHideAnimationType } : {}),
  }

  const lightbox = new PhotoSwipeLightbox(lightboxOptions)

  if (isMobile && galleryId) {
    lightbox.on('uiRegister', function () {
      if (lightbox.pswp) {
        lightbox.pswp.ui?.registerElement({
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

  return lightbox
}
