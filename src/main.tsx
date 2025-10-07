import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ThemeProvider } from './components/ThemeProvider'

import App from './App'
import './index.css'

if ('serviceWorker' in navigator && import.meta.env.DEV) {
  navigator.serviceWorker.register('/dev-sw.js?dev-sw', {
    type: 'classic',
    scope: '/',
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system">
      <App />
    </ThemeProvider>
  </StrictMode>
)
