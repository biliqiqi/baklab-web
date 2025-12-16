import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
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
import { queryClient } from './lib/query-client'
import { createIDBPersister, shouldPersistQuery } from './state/query-db'

// Polyfill to prevent React crashes when Google Translate modifies the DOM.
// Google Translate wraps text nodes in <font> elements, which breaks React's
// reconciliation when it tries to remove/insert nodes that no longer exist
// in the expected location. This catches NotFoundError and prevents crashes
// while still allowing translation to work.
// See: https://github.com/facebook/react/issues/11538
// See also: https://issues.chromium.org/issues/41407169
// Source: https://github.com/langfuse/langfuse/pull/9888
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalRemoveChild = Element.prototype.removeChild
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalInsertBefore = Element.prototype.insertBefore

  Element.prototype.removeChild = function <T extends Node>(child: T): T {
    try {
      return originalRemoveChild.call(this, child) as T
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        // Node was likely moved by Google Translate - silently ignore
        return child
      }
      throw error
    }
  }

  Element.prototype.insertBefore = function <T extends Node>(
    newNode: T,
    referenceNode: Node | null
  ): T {
    try {
      return originalInsertBefore.call(this, newNode, referenceNode) as T
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        // Reference node was likely moved by Google Translate
        // Fallback: append to end (DOM is already inconsistent anyway)
        return this.appendChild(newNode)
      }
      throw error
    }
  }
}

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

const persister = createIDBPersister()

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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24,
        dehydrateOptions: {
          shouldDehydrateQuery: shouldPersistQuery,
        },
      }}
    >
      <ThemeProvider defaultTheme="system">
        <App />
      </ThemeProvider>
    </PersistQueryClientProvider>
  </StrictMode>
)
