import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'sonner/dist/styles.css'

import { ThemeProvider } from './components/ThemeProvider'

import App from './App'
import {
  THUMBNAIL_MAX_DPR,
  THUMBNAIL_MAX_HEIGHT_DESKTOP,
  THUMBNAIL_MAX_WIDTH_DESKTOP,
} from './constants/constants'
import './index.css'

function initImageMaxSize() {
  const dpr = Math.min(window.devicePixelRatio || 1, THUMBNAIL_MAX_DPR)
  const calculatedMaxWidth = THUMBNAIL_MAX_WIDTH_DESKTOP * dpr
  const calculatedMaxHeight = THUMBNAIL_MAX_HEIGHT_DESKTOP * dpr
  document.documentElement.style.setProperty(
    '--img-max-width-desktop',
    `${calculatedMaxWidth}px`
  )
  document.documentElement.style.setProperty(
    '--img-max-height-desktop',
    `${calculatedMaxHeight}px`
  )
}

initImageMaxSize()

window.addEventListener('resize', initImageMaxSize)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        if (import.meta.env.DEV) {
          console.log('SW registered:', registration)
        }
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.log('SW registration failed:', error)
        }
      })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system">
      <App />
    </ThemeProvider>
  </StrictMode>
)
