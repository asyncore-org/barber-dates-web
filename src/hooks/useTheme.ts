import { useState, useEffect } from 'react'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'gio_theme'

function applyThemeToDOM(theme: Theme) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(STORAGE_KEY, theme)
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    return stored ?? 'dark'
  })

  useEffect(() => {
    applyThemeToDOM(theme)
  }, [theme])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    const doToggle = () => {
      applyThemeToDOM(newTheme)
      setTheme(newTheme)
    }
    if (!document.startViewTransition) {
      doToggle()
      return
    }
    document.startViewTransition(doToggle)
  }

  return { theme, setTheme, toggleTheme }
}
