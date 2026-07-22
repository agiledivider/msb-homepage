import { VIEWS, type ViewKey } from './model'

const LABELS: Record<ViewKey, string> = { list: 'Liste', calendar: 'Kalender', tiles: 'Kacheln' }
// Display order (differs from VIEWS, which is the URL/validation order).
const ORDER: ViewKey[] = ['list', 'calendar', 'tiles']

/**
 * Segmented control that switches the /events layout.
 *
 * Buttons rather than links: on a static host the query string can't select a
 * different document, so the view is client state and `EventsClient` mirrors it
 * into the URL with `history.replaceState`.
 */
export function ViewSwitcher({ current, onChange }: { current: ViewKey; onChange: (v: ViewKey) => void }) {
  return (
    <div className="inline-flex rounded-[10px] border border-line bg-card p-1 font-mono text-[12.5px]">
      {ORDER.filter((k) => VIEWS.includes(k)).map((key) => {
        const active = key === current
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-current={active ? 'page' : undefined}
            className={`rounded-[7px] px-3.5 py-1.5 transition-colors ${
              active ? 'bg-brand text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {LABELS[key]}
          </button>
        )
      })}
    </div>
  )
}
