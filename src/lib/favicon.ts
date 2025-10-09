let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let originalFavicon: string | null = null

const initCanvas = () => {
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    ctx = canvas.getContext('2d')
  }
}

const getFaviconElement = (): HTMLLinkElement => {
  let faviconEl = document.querySelector('link[rel*="icon"]') as HTMLLinkElement

  if (!faviconEl) {
    faviconEl = document.createElement('link')
    faviconEl.rel = 'shortcut icon'
    faviconEl.type = 'image/x-icon'
    document.head.appendChild(faviconEl)
  }

  if (!originalFavicon) {
    originalFavicon = faviconEl.href || '/favicon.ico'
  }

  return faviconEl
}

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

const formatCount = (count: number): string => {
  if (count === 0) return ''
  if (count < 100) return count.toString()
  return '99'
}

const drawBadge = async (count: number) => {
  if (!ctx || !canvas) return

  ctx.clearRect(0, 0, 32, 32)

  if (originalFavicon) {
    try {
      const img = await loadImage(originalFavicon)
      ctx.drawImage(img, 0, 0, 32, 32)
    } catch (error) {
      console.warn('Failed to load original favicon:', error)
      ctx.fillStyle = '#4f46e5'
      ctx.fillRect(0, 0, 32, 32)
    }
  }

  if (count > 0) {
    const text = formatCount(count)
    const isDoubleDigit = text.length === 2
    const fontSize = isDoubleDigit ? 18 : 22

    if (isDoubleDigit) {
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.ellipse(16, 20, 15, 12, 0, 0, 2 * Math.PI)
      ctx.fill()
    } else {
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(16, 20, 12, 0, 2 * Math.PI)
      ctx.fill()
    }

    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${fontSize}px Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 16, 20)
  }

  return canvas.toDataURL('image/png')
}

export const setFaviconBadge = async (count: number) => {
  initCanvas()
  const faviconEl = getFaviconElement()
  const dataUrl = await drawBadge(count)

  if (dataUrl) {
    faviconEl.href = dataUrl
  }
}

export const resetFavicon = () => {
  if (originalFavicon) {
    const faviconEl = getFaviconElement()
    faviconEl.href = originalFavicon
  }
}
