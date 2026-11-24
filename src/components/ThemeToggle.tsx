'use client'

import { faCircleHalfStroke, faMoon, faSun } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'
import { applyThemeMode, nextThemeMode, parseThemeMode, THEME_STORAGE_KEY, type ThemeMode } from '@/lib/theme'

const LABEL: Record<ThemeMode, string> = { auto: 'Auto (wie Gerät)', light: 'Hell', dark: 'Dunkel' }
const ICON = { auto: faCircleHalfStroke, light: faSun, dark: faMoon } as const

/** Styleguide "Modus-Schalter": each click cycles Auto → Hell → Dunkel; the pick is remembered. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  // 'auto' on the server and first render; the stored pick is already on <html>
  // (layout head script), so only the icon catches up after hydration.
  const [mode, setMode] = useState<ThemeMode>('auto')

  useEffect(() => {
    let stored: ThemeMode = 'auto'
    try {
      stored = parseThemeMode(localStorage.getItem(THEME_STORAGE_KEY))
    } catch {
      // storage blocked: stay on auto
    }
    setMode(stored)
    // Again after hydration: Next adds its own theme-color meta after the head
    // script ran, which would otherwise keep the system colour.
    applyThemeMode(stored)
  }, [])

  const cycle = () => {
    const next = nextThemeMode(mode)
    setMode(next)
    applyThemeMode(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // storage blocked: the pick lasts until reload
    }
  }

  const title = `Darstellung: ${LABEL[mode]}`
  return (
    <button
      type="button"
      onClick={cycle}
      title={title}
      aria-label={title}
      className={`grid h-11 w-11 place-items-center rounded-[8px] text-ink transition-colors hover:bg-fond ${className}`}
    >
      <FontAwesomeIcon icon={ICON[mode]} className="h-5 w-5" />
    </button>
  )
}
