import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ThemeProvider } from './components/ThemeProvider'

import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system">
      <App />
    </ThemeProvider>
  </StrictMode>
)
