import type { Config } from 'tailwindcss'

/**
 * MakerSpace Bonn design tokens, ported from the standalone design.
 * Tailwind v3 style config. On a Tailwind v4 project, mirror the `colors`
 * and `fontFamily` maps below into an `@theme` block in globals.css instead.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#23231f',
        paper: '#f1ede2',
        card: '#fffdf8',
        cream: '#fbf7ec',
        muted: '#736e62',
        faint: '#9a9484',
        line: '#e4dfd1',
        green: {
          DEFAULT: '#238811',
          deep: '#325725',
          lime: '#5eb130',
          pale: '#eaf3dd',
          mint: '#edf6e0',
          soft: '#cfe9ad',
        },
        orange: {
          DEFAULT: '#e0872e',
          ink: '#20170a',
          soft: '#f4d7ae',
        },
        sand: '#f5e6c9',
      },
      fontFamily: {
        display: ['var(--font-archivo)', 'Archivo', 'sans-serif'],
        sans: ['var(--font-plex-sans)', 'IBM Plex Sans', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'IBM Plex Mono', 'monospace'],
        serif: ['var(--font-newsreader)', 'Newsreader', 'serif'],
        hand: ['var(--font-caveat)', 'Caveat', 'cursive'],
      },
      maxWidth: {
        shell: '1180px',
      },
      keyframes: {
        msbfade: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        msbfade: 'msbfade .4s ease both',
      },
    },
  },
  plugins: [],
}

export default config
