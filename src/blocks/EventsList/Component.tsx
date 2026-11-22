import Link from 'next/link'
import { eventTagClasses } from '../../components/ui'
import type { LinkValue } from '../fields'

type Event = {
  day?: string | null
  sub?: string | null
  tag?: string | null
  tagColor?: string | null
  time?: string | null
  title: string
  text?: string | null
  link?: LinkValue | null
}
type BigEvent = { title: string; meta?: string | null }

export type EventsListBlock = {
  blockType: 'eventsList'
  events?: Event[] | null
  sidebar?: {
    bigTitle?: string | null
    bigEvents?: BigEvent[] | null
    infoTitle?: string | null
    infoText?: string | null
    infoLink?: LinkValue | null
  } | null
}

export function EventsListComponent({ events, sidebar }: EventsListBlock) {
  return (
    <div className="grid grid-cols-1 items-start gap-9 lg:grid-cols-[1fr_300px]">
      <div>
        {(events ?? []).map((e, i) => (
          <div
            key={i}
            className={`grid grid-cols-[92px_1fr_auto] items-center gap-[18px] border-t border-line py-5 ${
              i === (events?.length ?? 0) - 1 ? 'border-b' : ''
            }`}
          >
            <div className="text-center">
              <div className="font-display text-[30px] font-extrabold leading-none text-brand-text">{e.day}</div>
              <div className="font-mono text-[14px] text-muted">{e.sub}</div>
            </div>
            <div>
              {e.tag ? (
                <div
                  className={`mb-1.5 inline-block rounded-[5px] px-2 py-[3px] font-mono text-[14px] ${eventTagClasses(e.tagColor)}`}
                >
                  {e.tag}
                </div>
              ) : null}
              <h3 className="m-0 mb-1 font-sans text-[19px] font-bold">
                {e.link?.url ? (
                  <Link href={e.link.url} className="text-inherit no-underline">
                    {e.title}
                  </Link>
                ) : (
                  e.title
                )}
              </h3>
              {e.text ? <p className="m-0 text-[14px] leading-[1.5] text-muted">{e.text}</p> : null}
            </div>
            <span className="font-mono text-[14px] text-muted">{e.time}</span>
          </div>
        ))}
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
        {sidebar?.bigEvents?.length ? (
          <div className="rounded-[14px] border border-line bg-card p-5">
            <div className="mb-3 font-mono text-[14px] tracking-[.06em] text-muted">{sidebar.bigTitle}</div>
            {sidebar.bigEvents.map((b, i, arr) => (
              <div
                key={i}
                className={`${i > 0 ? 'mt-3' : ''} ${i < arr.length - 1 ? 'mb-3 border-b border-line pb-3' : ''}`}
              >
                <div className="font-sans text-[16px] font-bold">{b.title}</div>
                {b.meta ? <div className="text-[14px] text-muted">{b.meta}</div> : null}
              </div>
            ))}
          </div>
        ) : null}

        {sidebar?.infoText ? (
          <div className="rounded-[14px] border border-line bg-fond p-5">
            <div className="mb-1.5 font-hand text-[22px] font-bold text-brand-text">{sidebar.infoTitle}</div>
            <p className="m-0 mb-3 text-[14px] leading-[1.55] text-ink">{sidebar.infoText}</p>
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
    </div>
  )
}
