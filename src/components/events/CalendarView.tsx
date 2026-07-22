import Link from 'next/link'
import { eventTagClasses } from '@/components/ui'
import { type EventVM, fmtMonthYear } from './model'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

/**
 * Month grid: one calendar month with its events as chips per day.
 *
 * Month navigation calls back rather than linking to `?month=…` — a static host
 * can't serve a different document per query string, so `EventsClient` owns the
 * month as state and mirrors it into the URL.
 */
export function CalendarView({
  month,
  events,
  today,
  onNavigate,
}: {
  month: Date
  events: EventVM[]
  today: Date
  onNavigate: (month: Date) => void
}) {
  const year = month.getFullYear()
  const mo = month.getMonth()
  const firstWeekday = (new Date(year, mo, 1).getDay() + 6) % 7 // Monday = 0
  const daysInMonth = new Date(year, mo + 1, 0).getDate()

  // Bucket events by day-of-month.
  const byDay = new Map<number, EventVM[]>()
  for (const e of events) {
    const day = e.date.getDate()
    byDay.set(day, [...(byDay.get(day) ?? []), e])
  }

  // Leading blanks + day numbers, padded to full weeks.
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const prev = new Date(year, mo - 1, 1)
  const next = new Date(year, mo + 1, 1)
  const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === mo && today.getDate() === day

  const navBtn =
    'rounded-[8px] border border-line px-3 py-1.5 no-underline transition-colors hover:border-brand hover:text-brand-text'

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3 font-mono text-[13px] text-muted">
        <button type="button" onClick={() => onNavigate(prev)} className={navBtn}>
          ← {fmtMonthYear(prev)}
        </button>
        <h2 className="m-0 font-display text-[20px] font-extrabold text-ink md:text-[22px]">{fmtMonthYear(month)}</h2>
        <button type="button" onClick={() => onNavigate(next)} className={navBtn}>
          {fmtMonthYear(next)} →
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-7 gap-px">
            {WEEKDAYS.map((w) => (
              <div key={w} className="bg-card py-2 text-center font-mono text-[11.5px] tracking-[.06em] text-faint">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[10px] border border-line bg-line">
            {cells.map((day, i) => {
              const dayEvents = day ? (byDay.get(day) ?? []) : []
              return (
                <div key={i} className={`min-h-[104px] bg-card p-1.5 ${day ? '' : 'bg-[#f6f2e8]'}`}>
                  {day ? (
                    <div
                      className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full font-mono text-[12px] ${
                        isToday(day) ? 'bg-brand font-bold text-white' : 'text-muted'
                      }`}
                    >
                      {day}
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-1">
                    {dayEvents.map((e) => (
                      <Link
                        key={e.id}
                        href={e.href}
                        title={`${e.time} · ${e.title}`}
                        className={`block truncate rounded-[4px] px-1.5 py-0.5 text-[11px] leading-tight no-underline ${eventTagClasses(e.tagColor)}`}
                      >
                        <span className="font-semibold">{e.time}</span> {e.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
