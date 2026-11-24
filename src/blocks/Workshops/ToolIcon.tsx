/**
 * Hand-drawn tools that hang on the pegboard, one per workshop (artist mockup
 * 2026-11-23, "Werkzeugschatten"). Tall 100×240 drawings: they read as a tool
 * hanging on a hook at the left edge of each card. Brand tokens only, so they
 * follow the palette.
 */
import type { ToolIconName } from './icons'

const INK = 'var(--color-ink)'
const STEEL = { fill: 'var(--color-kreide)', stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' as const }
const GREEN = { fill: 'var(--color-brand)', stroke: INK, strokeWidth: 3 }
const ORANGE = { fill: 'var(--color-orange)', stroke: INK, strokeWidth: 3 }
const WHITE = { fill: 'var(--color-card)', stroke: INK, strokeWidth: 3 }
const PALE = { fill: 'var(--color-green-pale)', stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' as const }
const LINE = { fill: 'none', stroke: INK, strokeWidth: 2, strokeLinecap: 'round' as const }
const LINE4 = { ...LINE, strokeWidth: 4 }

function Drawing({ name }: { name: ToolIconName }) {
  switch (name) {
    case 'loetkolben':
      return (
        <>
          <circle {...LINE4} cx="50" cy="16" r="10" />
          <path {...LINE4} d="M50 26 V44" />
          <rect fill={INK} x="43" y="40" width="14" height="16" rx="3" />
          <rect {...GREEN} x="37" y="54" width="26" height="82" rx="11" />
          <path {...LINE} d="M40 72 H60 M40 82 H60 M40 92 H60" />
          <rect {...STEEL} x="44.5" y="136" width="11" height="58" />
          <path {...STEEL} d="M45 194 H55 L51.5 234 H48.5 Z" />
        </>
      )
    case 'schluessel':
      return (
        <>
          <rect {...STEEL} x="42" y="44" width="16" height="146" rx="5" />
          <path
            {...STEEL}
            fillRule="evenodd"
            d="M28 30a22 22 0 1 0 44 0a22 22 0 1 0 -44 0z M40 30a10 10 0 1 0 20 0a10 10 0 1 0 -20 0z"
          />
          <path {...STEEL} d="M60 229 A26 26 0 1 0 40 229 L40 202 L60 202 Z" />
          <path {...LINE} d="M50 60 V176" />
        </>
      )
    case 'saege':
      return (
        <>
          <polygon
            {...STEEL}
            points="30,76 72,76 62,236 40,236 33.5,229 39.1,222 32.6,215 38.2,208 31.7,201 37.3,194 30.8,187 36.4,180 29.9,173 35.5,166 29.0,159 34.5,152 28.1,145 33.6,138 27.2,131 32.7,124 26.3,117 31.8,110 25.4,103 30.9,96 24.5,89 30.0,82"
          />
          <path
            {...ORANGE}
            fillRule="evenodd"
            d="M18 24a18 18 0 0 1 18 -18h28a18 18 0 0 1 18 18v38a18 18 0 0 1 -18 18h-28a18 18 0 0 1 -18 -18z M38 20h24a6 6 0 0 1 6 6v20a6 6 0 0 1 -6 6h-24a6 6 0 0 1 -6 -6v-20a6 6 0 0 1 6 -6z"
          />
          <circle fill={INK} cx="40" cy="68" r="3" />
          <circle fill={INK} cx="60" cy="68" r="3" />
        </>
      )
    case 'schere': {
      const blade = { fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
      return (
        <>
          <path {...blade} stroke={INK} strokeWidth={11} d="M40 50 L52 110 L56 232" />
          <path {...blade} stroke={INK} strokeWidth={11} d="M60 50 L48 110 L44 232" />
          <path {...blade} stroke="var(--color-kreide)" strokeWidth={6} d="M40 50 L52 110 L56 232" />
          <path {...blade} stroke="var(--color-kreide)" strokeWidth={6} d="M60 50 L48 110 L44 232" />
          <path
            {...ORANGE}
            fillRule="evenodd"
            d="M18 34a18 18 0 1 0 36 0a18 18 0 1 0 -36 0z M27 34a9 9 0 1 0 18 0a9 9 0 1 0 -18 0z"
          />
          <path
            {...ORANGE}
            fillRule="evenodd"
            d="M46 34a18 18 0 1 0 36 0a18 18 0 1 0 -36 0z M55 34a9 9 0 1 0 18 0a9 9 0 1 0 -18 0z"
          />
          <circle {...WHITE} cx="50" cy="100" r="5" />
        </>
      )
    }
    case 'spule':
      return (
        <>
          <path
            fill="none"
            stroke={INK}
            strokeWidth={7}
            strokeLinecap="round"
            d="M86 86 C98 130 58 140 70 182 S88 224 62 234"
          />
          <path
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth={3}
            strokeLinecap="round"
            d="M86 86 C98 130 58 140 70 182 S88 224 62 234"
          />
          <circle {...WHITE} cx="50" cy="62" r="45" />
          <circle {...GREEN} cx="50" cy="62" r="38" />
          <circle fill="none" stroke={INK} strokeWidth={1.5} strokeOpacity={0.35} cx="50" cy="62" r="32" />
          <circle fill="none" stroke={INK} strokeWidth={1.5} strokeOpacity={0.35} cx="50" cy="62" r="26" />
          <circle {...WHITE} cx="50" cy="62" r="17" />
          <circle fill={INK} cx="50" cy="62" r="6" />
        </>
      )
    case 'geodreieck':
      return (
        <>
          <polygon {...PALE} points="50,14 94,200 6,200" />
          <path {...LINE} d="M26 200 A24 24 0 0 1 74 200" />
          <path
            {...LINE}
            d="M14 200v-8M20 200v-5M26 200v-8M32 200v-5M38 200v-8M44 200v-5M50 200v-12M56 200v-5M62 200v-8M68 200v-5M74 200v-8M80 200v-5M86 200v-8"
          />
          <circle fill={INK} cx="50" cy="52" r="6" />
          <path {...LINE} d="M50 70 V188" />
        </>
      )
    case 'laser':
      // Laser head on a ring: green housing, steel nozzle, beam and a spark on the workpiece.
      return (
        <>
          <circle {...LINE4} cx="50" cy="16" r="10" />
          <path {...LINE4} d="M50 26 V40" />
          <rect {...GREEN} x="24" y="40" width="52" height="58" rx="8" />
          <path {...LINE} d="M32 54 H68 M32 64 H68" />
          <circle fill={INK} cx="64" cy="84" r="4" />
          <path {...STEEL} d="M38 98 H62 L56 132 H44 Z" />
          <path {...STEEL} d="M44 132 H56 L52 146 H48 Z" />
          <path fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" d="M50 150 V204" />
          <path fill="none" stroke="var(--color-orange)" strokeWidth={3} strokeLinecap="round" d="M50 150 V204" />
          <path
            {...ORANGE}
            strokeLinejoin="round"
            d="M50 196 L55 208 L68 210 L57 216 L60 230 L50 222 L40 230 L43 216 L32 210 L45 208 Z"
          />
          <path {...LINE} d="M16 232 H84" />
        </>
      )
    default:
      return name satisfies never
  }
}

/**
 * Pencil look (trial 2026-11-24): the same drawings, as if sketched with
 * graphite and coloured pencils. One filter wobbles the lines and breaks
 * strokes and fills up with paper grain; a second, fainter outline-only pass
 * with another wobble gives the doubled line of a quick sketch. Ids are per
 * drawing, so two cards with the same tool share an identical definition.
 */
function PencilFilters({ id }: { id: string }) {
  return (
    <defs>
      {[
        { key: 'a', seed: 3, scale: 4 },
        { key: 'b', seed: 11, scale: 8 },
      ].map(({ key, seed, scale }) => (
        <filter key={key} id={`${id}-${key}`} x="-15%" y="-8%" width="130%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed={seed} result="wobble" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="wobble"
            scale={scale}
            xChannelSelector="R"
            yChannelSelector="G"
            result="drawn"
          />
          {/* streaks along one direction: the strokes of a coloured pencil */}
          <feTurbulence type="fractalNoise" baseFrequency="0.09 1.3" numOctaves="2" seed={seed + 4} result="paper" />
          <feColorMatrix
            in="paper"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3 2.15"
            result="grain"
          />
          <feComposite in="drawn" in2="grain" operator="in" />
        </filter>
      ))}
    </defs>
  )
}

export function ToolIcon({ name, className = '' }: { name: ToolIconName; className?: string }) {
  const id = `msb-pencil-${name}`
  return (
    <svg viewBox="0 0 100 240" className={className} aria-hidden="true" focusable="false">
      <PencilFilters id={id} />
      <g filter={`url(#${id}-a)`}>
        <Drawing name={name} />
      </g>
      <g filter={`url(#${id}-b)`} opacity={0.6} className="[&_*]:fill-none">
        <Drawing name={name} />
      </g>
    </svg>
  )
}
