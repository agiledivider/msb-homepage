import Link from 'next/link'
import { Media } from '@/components/Media'
import { CARD_TITLE, eventTagClasses } from '@/components/ui'
import { MembersOnlyBadge } from './MembersOnlyBadge'

/** Members-only row (S5.15, design B): a Mitglieder-Gelb bar in the left margin. */
const MEMBERS_BAR =
  'before:absolute before:top-3.5 before:bottom-3.5 before:-left-3 before:w-1.5 before:rounded-[3px] before:bg-yellow'

import { type EventVM, fmtDay2, fmtMonthShort, fmtWeekdayShort, fmtYear } from './model'

/**
 * Dense date list with a small thumbnail per event. `showYear` adds the year
 * under the date (archive, S5.16); the upcoming list doesn't need it.
 */
export function ListView({ events, showYear = false }: { events: EventVM[]; showYear?: boolean }) {
  return (
    <div className="border-t border-line">
      {events.map((e) => (
        <article
          key={e.id}
          className={`group relative grid grid-cols-[58px_84px_1fr] items-center gap-4 border-b border-line py-4 md:grid-cols-[72px_128px_1fr_auto] md:gap-5 ${e.membersOnly ? MEMBERS_BAR : ''}`}
        >
          <div className="text-center">
            <div className="font-display text-[28px] font-extrabold leading-none text-brand-text md:text-[32px]">
              {fmtDay2(e.date)}
            </div>
            <div className="font-mono text-[14px] text-muted">
              {/* Narrow phone column: month and weekday stack instead of wrapping mid-label. */}
              {fmtMonthShort(e.date)}
              <span className="max-md:hidden"> · </span>
              <span className="max-md:block">{fmtWeekdayShort(e.date)}</span>
            </div>
            {showYear ? <div className="font-mono text-[14px] text-muted">{fmtYear(e.date)}</div> : null}
          </div>

          <Media
            resource={e.image}
            placeholder="Foto"
            className="aspect-[4/3] w-full overflow-hidden rounded-[8px]"
            sizes="128px"
          />

          <div className="min-w-0">
            {e.category || e.membersOnly ? (
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                {e.membersOnly ? <MembersOnlyBadge /> : null}
                {e.category ? (
                  <span
                    className={`inline-block rounded-[5px] px-2 py-[3px] font-mono text-[14px] ${eventTagClasses(e.tagColor)}`}
                  >
                    {e.category}
                  </span>
                ) : null}
              </div>
            ) : null}
            <h3 className="m-0 mb-1 font-sans text-[18px] font-bold md:text-[19px]">
              <Link href={e.href} className={`text-inherit no-underline after:absolute after:inset-0 ${CARD_TITLE}`}>
                {e.title}
              </Link>
            </h3>
            {e.subtitle ? (
              <p className="m-0 mb-1 font-serif text-[16px] italic leading-[1.35] text-muted">{e.subtitle}</p>
            ) : null}
            {e.description ? (
              <p className="m-0 line-clamp-2 text-[14px] leading-[1.5] text-muted">{e.description}</p>
            ) : null}
          </div>

          <span className="hidden font-mono text-[14px] text-muted md:block md:justify-self-end md:text-right">
            {e.time}
            {e.location ? <br /> : null}
            {e.location}
          </span>
        </article>
      ))}
    </div>
  )
}
