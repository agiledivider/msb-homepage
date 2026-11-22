import { faEnvelope } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { SectionHeading, TEXT_LINK } from '../../components/ui'

type Person = { id?: string | null; name: string; role: string; email?: string | null }

export type PeopleBlock = {
  blockType: 'people'
  tag?: string | null
  heading?: string | null
  intro?: string | null
  people?: Person[] | null
}

export function PeopleComponent({ tag, heading, intro, people }: PeopleBlock) {
  if (!people?.length) return null
  return (
    // @container: the cards follow the width the block gets (full page or a column), not the window.
    <section className="@container pt-11 first:pt-0">
      <SectionHeading tag={tag ?? undefined} heading={heading ?? undefined} className="mb-4" />
      {intro ? <p className="m-0 mb-6 max-w-[62ch] text-[16.5px] leading-[1.7] text-ink">{intro}</p> : null}

      <div className="grid grid-cols-1 gap-4 @md:grid-cols-2 @4xl:grid-cols-3">
        {people.map((p) => (
          <div key={p.id ?? p.name} className="rounded-[12px] border border-line bg-card p-[22px]">
            <div className="font-sans text-[19px] font-bold text-ink">{p.name}</div>
            <div className="mt-1 font-mono text-[14px] tracking-[.04em] text-muted">{p.role}</div>
            {p.email ? (
              <a
                href={`mailto:${p.email}`}
                className={`mt-1 inline-flex min-h-11 items-center gap-2 break-all text-[15px] ${TEXT_LINK}`}
              >
                <FontAwesomeIcon icon={faEnvelope} className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {p.email}
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
