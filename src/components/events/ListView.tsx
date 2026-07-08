import Link from 'next/link'
import { Media } from '@/components/Media'
import { eventTagClasses } from '@/components/ui'
import { fmtDay2, fmtMonthShort, fmtWeekdayShort, type EventVM } from './model'

/** Dense date list with a small thumbnail per event. */
export function ListView({ events }: { events: EventVM[] }) {
  return (
    <div className="border-t border-line">
      {events.map((e) => (
        <article
          key={e.id}
          className="grid grid-cols-[58px_84px_1fr] items-center gap-4 border-b border-line py-4 md:grid-cols-[72px_128px_1fr_auto] md:gap-5"
        >
          <div className="text-center">
            <div className="font-display text-[28px] font-extrabold leading-none text-brand-text md:text-[32px]">
              {fmtDay2(e.date)}
            </div>
            <div className="font-mono text-[11px] text-faint">
              {fmtMonthShort(e.date)} · {fmtWeekdayShort(e.date)}
            </div>
          </div>

          <Media
            resource={e.image}
            placeholder="Foto"
            className="aspect-[4/3] w-full overflow-hidden rounded-[8px]"
            sizes="128px"
          />

          <div className="min-w-0">
            {e.category ? (
              <div
                className={`mb-1.5 inline-block rounded-[5px] px-2 py-[3px] font-mono text-[11px] ${eventTagClasses(e.tagColor)}`}
              >
                {e.category}
              </div>
            ) : null}
            <h3 className="m-0 mb-1 font-display text-[18px] font-bold md:text-[19px]">
              <Link href={e.href} className="text-inherit no-underline hover:text-brand-text">
                {e.title}
              </Link>
            </h3>
            {e.description ? (
              <p className="m-0 line-clamp-2 text-[14px] leading-[1.5] text-muted">{e.description}</p>
            ) : null}
          </div>

          <span className="hidden font-mono text-[12px] text-muted md:block md:justify-self-end md:text-right">
            {e.time}
            {e.location ? <br /> : null}
            {e.location}
          </span>
        </article>
      ))}
    </div>
  )
}
