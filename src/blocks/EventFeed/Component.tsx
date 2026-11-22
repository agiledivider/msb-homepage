import Link from 'next/link'
import { CARD_TITLE, eventTagClasses, SectionHeading } from '../../components/ui'
import type { LinkValue } from '../fields'
import { EventFeedSidebar } from './Sidebar'

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
            className="group grid grid-cols-[96px_1fr] gap-5 border-b border-line py-6 text-inherit no-underline"
          >
            <div className="text-center">
              <div className="font-display text-[34px] font-extrabold leading-none text-brand-text">{e.day}</div>
              <div className="font-mono text-[14px] text-muted">{e.sub}</div>
            </div>
            <div>
              {e.tag ? (
                <div
                  className={`mb-2 inline-block rounded-[5px] px-2 py-[3px] font-mono text-[14px] ${eventTagClasses(e.tagColor)}`}
                >
                  {e.tag}
                </div>
              ) : null}
              <h3 className={`mb-1.5 font-sans text-[20px] font-bold ${CARD_TITLE}`}>{e.title}</h3>
              {e.text ? <p className="m-0 text-[14.5px] leading-[1.55] text-muted">{e.text}</p> : null}
            </div>
          </Link>
        ))}
      </div>

      {/* sticky sidebar */}
      <EventFeedSidebar sidebar={sidebar} />
    </div>
  )
}
