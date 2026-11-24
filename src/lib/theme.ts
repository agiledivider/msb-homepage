/**
 * Light/dark mode (S4.6, styleguide 2026-11 "Hell/Dunkel").
 *
 * The site follows the system setting. A visitor's explicit pick is stored in
 * localStorage and applied as `data-theme` on <html>; globals.css switches the
 * colour tokens on it. `THEME_INIT_SCRIPT` runs in <head> before first paint so a
 * remembered "dark" never flashes light.
 */
export const THEME_MODES = ['auto', 'light', 'dark'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

/** Storage key from the styleguide recipe. */
export const THEME_STORAGE_KEY = 'darstellung'

/** Browser bar colour per mode = Hintergrund (Papier / Tannennacht). */
export const THEME_COLOR = { light: '#fbf8f2', dark: '#0c1511' } as const

export const parseThemeMode = (v: unknown): ThemeMode =>
  THEME_MODES.includes(v as ThemeMode) ? (v as ThemeMode) : 'auto'

export const nextThemeMode = (m: ThemeMode): ThemeMode => THEME_MODES[(THEME_MODES.indexOf(m) + 1) % THEME_MODES.length]

/**
 * Apply a mode to the document: `data-theme` (none for auto) and both
 * theme-color metas, which otherwise follow the system media query only.
 */
export function applyThemeMode(m: ThemeMode, doc: Document = document): void {
  const root = doc.documentElement
  if (m === 'auto') delete root.dataset.theme
  else root.dataset.theme = m
  for (const meta of doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const own = meta.media.includes('dark') ? THEME_COLOR.dark : THEME_COLOR.light
    meta.content = m === 'auto' ? own : THEME_COLOR[m]
  }
}

/** Inline <head> script: the stored pick, applied before the CSS paints. */
export const THEME_INIT_SCRIPT = `try{var m=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(m==='light'||m==='dark'){document.documentElement.dataset.theme=m;document.querySelectorAll('meta[name="theme-color"]').forEach(function(t){t.content=${JSON.stringify(THEME_COLOR)}[m]})}}catch(e){}`
