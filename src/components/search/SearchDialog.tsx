import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { SearchHit } from '@/lib/search'
import { Kbd, SearchField } from './SearchField'
import { SearchHitRow } from './SearchHitRow'

type Quick = {
  query: string
  hits: SearchHit[]
  counts: { alle: number } | null
  suggestions: Array<{ label: string; href: string }>
}

const resultsUrl = (q: string) => `/suche?q=${encodeURIComponent(q.trim())}`

/**
 * Quick search (S5.17): a panel that drops from the header. Results while
 * typing, arrow keys to move, Enter to open (or to see all results), Esc to
 * close. Opens from the header button, "/" or ⌘K / Ctrl+K anywhere.
 */
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [data, setData] = useState<Quick | null>(null)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  const listId = useId()

  // Results while typing: a short pause first, and a newer query cancels an older one.
  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    const t = setTimeout(
      async () => {
        setLoading(true)
        try {
          const res = await fetch(`/suche/schnell?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
          if (res.ok) {
            setData((await res.json()) as Quick)
            setActive(-1)
          }
        } catch {
          // aborted by the next keystroke, or offline: keep what's shown
        } finally {
          if (!ctrl.signal.aborted) setLoading(false)
        }
      },
      q ? 140 : 0,
    )
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [q, open])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const html = document.documentElement
    const before = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = before
    }
  }, [open])

  const close = useCallback(() => {
    setActive(-1)
    onClose()
  }, [onClose])

  if (!open) return null

  const hits = data && data.query === q ? data.hits : (data?.hits ?? [])
  const total = data?.counts?.alle ?? 0
  const typed = q.trim().length >= 2

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'ArrowDown' && hits.length) {
      e.preventDefault()
      setActive((i) => (i + 1) % hits.length)
    } else if (e.key === 'ArrowUp' && hits.length) {
      e.preventDefault()
      setActive((i) => (i <= 0 ? hits.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = hits[active]
      if (hit) router.push(hit.href)
      else if (typed) router.push(resultsUrl(q))
      else return
      close()
    }
  }

  return (
    <div className="fixed inset-0 z-40">
      {/* Click outside the panel closes it. */}
      <button
        type="button"
        aria-label="Suche schließen"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        onKeyDown={onKeyDown}
        aria-label="Website durchsuchen"
        className="relative mx-auto flex max-h-[calc(100dvh-24px)] w-full max-w-[720px] flex-col overflow-hidden border-b border-line bg-card shadow-[0_0_0_100vmax_rgba(30,28,25,.42),0_24px_48px_-20px_rgba(30,28,25,.6)] motion-safe:animate-search-drop md:mt-20 md:rounded-[16px] md:border"
      >
        <search>
          <form
            action="/suche"
            className="flex items-end gap-2 border-b border-line px-4 pb-4 pt-3 md:px-5"
            onSubmit={(e) => {
              e.preventDefault()
              if (typed) {
                router.push(resultsUrl(q))
                close()
              }
            }}
          >
            <div className="min-w-0 flex-1">
              <SearchField
                id={`${listId}-q`}
                label="Website durchsuchen"
                inputRef={inputRef}
                name="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="z. B. Lasercutter oder Repair-Café"
                role="combobox"
                aria-expanded={hits.length > 0}
                aria-controls={listId}
                aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                end={<Kbd>Esc</Kbd>}
              />
            </div>
            <button
              type="button"
              onClick={close}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] text-muted hover:bg-fond hover:text-ink"
              aria-label="Suche schließen"
            >
              <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
            </button>
          </form>
        </search>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 md:px-3" aria-live="polite">
          {!typed ? (
            <div className="px-3 py-3">
              <p className="m-0 mb-3 text-[15px] text-muted">Direkt in eine Werkstatt:</p>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {(data?.suggestions ?? []).map((s) => (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      onClick={close}
                      className="inline-flex min-h-11 items-center rounded-[10px] border border-line px-3.5 text-[15px] text-ink no-underline hover:border-brand-text hover:text-brand-text"
                    >
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : hits.length ? (
            <div id={listId} role="listbox" aria-label="Treffer">
              {hits.map((hit, i) => (
                <SearchHitRow
                  key={hit.id}
                  id={`${listId}-${i}`}
                  hit={hit}
                  size="quick"
                  active={i === active}
                  onPick={close}
                />
              ))}
            </div>
          ) : loading ? (
            <p className="m-0 px-3 py-4 text-[15px] text-muted">Suche läuft …</p>
          ) : data?.query === q ? (
            <p className="m-0 px-3 py-4 text-[15px] text-muted">
              Für „{q.trim()}“ gibt es keinen Treffer. Ein kürzeres Wort findet oft mehr.
            </p>
          ) : null}
        </div>

        {typed && total > 0 ? (
          <div className="flex items-center justify-between gap-4 border-t border-line bg-fond px-5 py-2.5">
            <Link
              href={resultsUrl(q)}
              onClick={close}
              className="inline-flex min-h-11 items-center font-sans text-[15px] font-semibold text-brand-text underline decoration-2 underline-offset-4"
            >
              {total === 1 ? 'Den Treffer' : `Alle ${total} Treffer`} für „{q.trim()}“ ansehen
            </Link>
            <span className="hidden items-center gap-1.5 font-sans text-[14px] text-muted md:inline-flex">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> wählen, <Kbd>Enter</Kbd> öffnet
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Opens the quick search with "/" or ⌘K / Ctrl+K, unless the visitor is typing somewhere. */
export function useSearchShortcut(openSearch: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const typing = el?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName ?? '')
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        openSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openSearch])
}
