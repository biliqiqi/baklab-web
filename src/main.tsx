import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ThemeProvider } from './components/ThemeProvider'

import App from './App'
import './index.css'
import 'sonner/dist/styles.css'

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
