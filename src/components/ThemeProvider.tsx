import { useEffect } from 'react'

import { useUserUIStore } from '@/state/global'
import { Theme } from '@/types/types'

import { ThemeProviderContext } from './theme-provider'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

const updateTheme = (settingTheme: Theme) => {
  const root = window.document.documentElement

  root.classList.remove('light', 'dark')

  if (settingTheme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches
      ? 'dark'
      : 'light'

    root.classList.add(systemTheme)
    return
  }

  root.classList.add(settingTheme)
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey: _storageKey = 'ui-theme',
  ...props
}: ThemeProviderProps) {
  // Use userUIStore as single source of truth for theme
  const theme = useUserUIStore((state) => state.theme) || defaultTheme
  const setUserUITheme = useUserUIStore((state) => state.setState)

  useEffect(() => {
    updateTheme(theme)
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => updateTheme(theme))
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      setUserUITheme({ theme })
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
