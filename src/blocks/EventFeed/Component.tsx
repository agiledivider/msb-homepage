import Link from 'next/link'
import { SectionHeading, eventTagClasses } from '../../components/ui'
import type { LinkValue } from '../fields'

type Event = {
  day?: string | null
  sub?: string | null
  tag?: string | null
  tagColor?: string | null
  title: string
  text?: string | null
  link?: LinkValue | null
}
type HourRow = { day?: string | null; note?: string | null; time?: string | null; highlight?: boolean | null }

export type EventFeedBlock = {
  blockType: 'eventFeed'
  tagLabel?: string | null
  heading?: string | null
  allLink?: LinkValue | null
  events?: Event[] | null
  sidebar?: {
    hoursTitle?: string | null
    hoursBadge?: string | null
    hours?: HourRow[] | null
    hoursFootnote?: string | null
    infoEyebrow?: string | null
    infoText?: string | null
    infoLink?: LinkValue | null
  } | null
}

export function EventFeedComponent({ tagLabel, heading, allLink, events, sidebar }: EventFeedBlock) {
  return (
    <div className="grid grid-cols-1 items-start gap-10 pt-2 lg:grid-cols-[1fr_340px]">
      {/* feed */}
      <div>
        <SectionHeading
          tag={tagLabel ?? undefined}
          heading={heading ?? undefined}
          link={allLink}
          className="mb-1.5 border-b-2 border-ink pb-3"
        />
        {(events ?? []).map((e, i) => (
          <Link
            key={i}
            href={e.link?.url || '#'}
            className="grid grid-cols-[96px_1fr] gap-5 border-b border-line py-6 text-inherit no-underline"
          >
            <div className="text-center">
              <div className="font-display text-[34px] font-extrabold leading-none text-brand-text">{e.day}</div>
              <div className="font-mono text-[12px] text-faint">{e.sub}</div>
            </div>
            <div>
              {e.tag ? (
                <div
                  className={`mb-2 inline-block rounded-[5px] px-2 py-[3px] font-mono text-[11px] ${eventTagClasses(e.tagColor)}`}
                >
                  {e.tag}
                </div>
              ) : null}
              <h3 className="mb-1.5 font-display text-[20px] font-bold">{e.title}</h3>
              {e.text ? <p className="m-0 text-[14.5px] leading-[1.55] text-muted">{e.text}</p> : null}
            </div>
          </Link>
        ))}
      </div>

      {/* sticky sidebar */}
      <aside className="flex flex-col gap-[18px] lg:sticky lg:top-24">
        {sidebar?.hours?.length ? (
          <div className="overflow-hidden rounded-[14px] border border-line bg-[#fffdf8] shadow-[0_18px_40px_-28px_rgba(60,52,30,.4)]">
            <div className="flex items-center justify-between bg-brand px-[18px] py-3.5 text-white">
              <span className="font-display text-[16px] font-bold">{sidebar.hoursTitle}</span>
              <span className="font-mono text-[11.5px] opacity-85">{sidebar.hoursBadge}</span>
            </div>
            <div className="px-[18px] pb-3.5 pt-1.5">
              {sidebar.hours.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between border-b border-[#efeadd] py-[11px] ${
                    r.highlight ? '-mx-[18px] bg-green-mint px-[18px]' : ''
                  }`}
                >
                  <span className={`text-[14px] ${r.highlight ? 'text-brand-text' : ''}`}>
                    <strong>{r.day}</strong> {r.highlight ? r.note : <span className="text-faint">{r.note}</span>}
                  </span>
                  <span className={`font-mono text-[12.5px] ${r.highlight ? 'text-brand-text' : 'text-muted'}`}>
                    {r.time}
                  </span>
                </div>
              ))}
              {sidebar.hoursFootnote ? (
                <p className="mt-3 text-[12.5px] leading-[1.5] text-faint">{sidebar.hoursFootnote}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {sidebar?.infoText ? (
          <div className="rounded-[14px] border border-[#e8d3a6] bg-sand p-[18px]">
            <div className="mb-2.5 font-mono text-[11.5px] tracking-[.06em] text-brand-text">{sidebar.infoEyebrow}</div>
            <p className="m-0 mb-3.5 text-[14px] leading-[1.55] text-[#4c4a42]">{sidebar.infoText}</p>
            {sidebar.infoLink?.label ? (
              <Link
                href={sidebar.infoLink.url || '#'}
                className="border-b border-brand-text pb-0.5 font-mono text-[13px] text-brand-text no-underline"
              >
                {sidebar.infoLink.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  )
}
