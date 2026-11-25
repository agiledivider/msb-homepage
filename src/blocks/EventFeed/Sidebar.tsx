import Link from 'next/link'
import { Fragment } from 'react'
import { MONO_LINK } from '../../components/ui'
import type { LinkValue } from '../fields'

type HourRow = { day?: string | null; note?: string | null; time?: string | null; highlight?: boolean | null }

export type EventFeedSidebarData = {
  hoursTitle?: string | null
  hoursBadge?: string | null
  hours?: HourRow[] | null
  hoursFootnote?: string | null
  infoEyebrow?: string | null
  infoText?: string | null
  infoLink?: LinkValue | null
} | null

type DayGroup = { day: string; entries: HourRow[]; highlight: boolean }

/**
 * Consecutive rows of the same day become one group, so the date shows once
 * (e.g. Monday with 10–14 and 18–21). A group is highlighted when any entry is.
 */
export function groupByDay(rows: HourRow[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const row of rows) {
    const day = row.day?.trim() ?? ''
    const last = groups.at(-1)
    if (last && day && last.day === day) last.entries.push(row)
    else groups.push({ day, entries: [row], highlight: false })
  }
  for (const g of groups) g.highlight = g.entries.some((e) => e.highlight)
  return groups
}

/** The sticky right column of the "Was läuft" feed: opening hours + info card. */
export function EventFeedSidebar({ sidebar }: { sidebar?: EventFeedSidebarData }) {
  return (
    <aside className="flex flex-col gap-[18px] lg:sticky lg:top-24">
      {sidebar?.hours?.length ? (
        <div className="overflow-hidden rounded-[14px] border border-line bg-card shadow-[0_18px_40px_-28px_rgba(60,52,30,.4)]">
          <div className="flex items-center justify-between bg-brand px-[18px] py-3.5 text-tinte">
            <span className="font-sans text-[16px] font-bold">{sidebar.hoursTitle}</span>
            <span className="font-mono text-[14px] opacity-85">{sidebar.hoursBadge}</span>
          </div>
          <div className="px-[18px] pb-3.5 pt-1.5">
            {groupByDay(sidebar.hours).map((g, gi) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: server-rendered list in date order, a day can repeat in editor rows
                key={gi}
                className={`grid grid-cols-[3.5rem_1fr_auto] items-baseline gap-x-3 gap-y-1.5 border-b border-line py-[11px] text-[14px] ${
                  g.highlight ? '-mx-[18px] bg-green-pale px-[18px] text-brand-text' : ''
                }`}
              >
                {g.entries.map((e, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: server-rendered list, entries have no client state
                  <Fragment key={i}>
                    <strong className="whitespace-nowrap">{i === 0 ? g.day : null}</strong>
                    <span className={g.highlight ? '' : 'text-muted'}>{e.note}</span>
                    <span className={`whitespace-nowrap font-mono ${g.highlight ? 'text-brand-text' : 'text-muted'}`}>
                      {e.time}
                    </span>
                  </Fragment>
                ))}
              </div>
            ))}
            {sidebar.hoursFootnote ? (
              <p className="mt-3 text-[14px] leading-[1.5] text-muted">{sidebar.hoursFootnote}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {sidebar?.infoText ? (
        <div className="rounded-[14px] border border-line bg-fond p-[18px]">
          <div className="mb-2.5 font-mono text-[14px] tracking-[.06em] text-brand-text">{sidebar.infoEyebrow}</div>
          <p className="m-0 mb-3.5 text-[14px] leading-[1.55] text-ink">{sidebar.infoText}</p>
          {sidebar.infoLink?.label ? (
            <Link href={sidebar.infoLink.url || '#'} className={MONO_LINK}>
              {sidebar.infoLink.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </aside>
  )
}
