import Link from 'next/link'

const VIEWS = [
  { key: 'list', label: 'Liste' },
  { key: 'calendar', label: 'Kalender' },
  { key: 'tiles', label: 'Kacheln' },
] as const

/** Segmented control that switches the /events layout via the ?view= param. */
export function ViewSwitcher({ current }: { current: string }) {
  return (
    <div className="inline-flex rounded-[10px] border border-line bg-card p-1 font-mono text-[12.5px]">
      {VIEWS.map((v) => {
        const active = v.key === current
        return (
          <Link
            key={v.key}
            href={`/events?view=${v.key}`}
            aria-current={active ? 'page' : undefined}
            className={`rounded-[7px] px-3.5 py-1.5 no-underline transition-colors ${
              active ? 'bg-brand text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {v.label}
          </Link>
        )
      })}
    </div>
  )
}
