import Link from 'next/link'
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

/** The sticky right column of the "Was läuft" feed: opening hours + info card. */
export function EventFeedSidebar({ sidebar }: { sidebar?: EventFeedSidebarData }) {
  return (
    <aside className="flex flex-col gap-[18px] lg:sticky lg:top-24">
      {sidebar?.hours?.length ? (
        <div className="overflow-hidden rounded-[14px] border border-line bg-card shadow-[0_18px_40px_-28px_rgba(60,52,30,.4)]">
          <div className="flex items-center justify-between bg-brand px-[18px] py-3.5 text-ink">
            <span className="font-sans text-[16px] font-bold">{sidebar.hoursTitle}</span>
            <span className="font-mono text-[14px] opacity-85">{sidebar.hoursBadge}</span>
          </div>
          <div className="px-[18px] pb-3.5 pt-1.5">
            {sidebar.hours.map((r, i) => (
              <div
                key={i}
                className={`flex items-center justify-between border-b border-line py-[11px] ${
                  r.highlight ? '-mx-[18px] bg-green-pale px-[18px]' : ''
                }`}
              >
                <span className={`text-[14px] ${r.highlight ? 'text-brand-text' : ''}`}>
                  <strong>{r.day}</strong> {r.highlight ? r.note : <span className="text-muted">{r.note}</span>}
                </span>
                <span className={`font-mono text-[14px] ${r.highlight ? 'text-brand-text' : 'text-muted'}`}>
                  {r.time}
                </span>
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
            <Link
              href={sidebar.infoLink.url || '#'}
              className="border-b border-brand-text pb-0.5 font-mono text-[14px] text-brand-text no-underline"
            >
              {sidebar.infoLink.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </aside>
  )
}
