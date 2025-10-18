import { useCallback, useEffect } from 'react'

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

  const setTheme = useCallback(
    (theme: Theme) => {
      setUserUITheme({ theme })
    },
    [setUserUITheme]
  )

  useEffect(() => {
    updateTheme(theme)

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => updateTheme(theme)

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  const value = {
    theme,
    setTheme,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
