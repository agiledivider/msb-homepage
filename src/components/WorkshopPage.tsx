import Link from 'next/link'
import { CtaBandComponent } from '@/blocks/CtaBand/Component'
import { isToolIcon } from '@/blocks/Workshops/icons'
import { ToolIcon } from '@/blocks/Workshops/ToolIcon'
import type { MachineAccess } from '@/collections/Workshops'
import { MembersOnlyBadge } from '@/components/events/MembersOnlyBadge'
import { asMedia, eventsToList } from '@/lib/mappers'
import type { Blog, Event, Workshop } from '@/payload-types'
import { Media } from './Media'
import { Polaroid } from './Polaroid'
import { BTN_PRIMARY, BTN_SECONDARY, CARD_LINK, CARD_TITLE, MONO_LINK, TapeTag } from './ui'

/**
 * One workshop's page, after the UX mockup "D1" (2026-11-23): head with promise
 * and photo, quick facts, what you can do, machines, safety and material on the
 * left; next dates, whom to ask and the way in on the right; projects, other
 * workshops, closing band. Every section is CMS content and hides when empty.
 */

/** Access badges (styleguide: green = OK, Gelber Fond = Achtung, outline = restricted). */
const ACCESS: Record<MachineAccess, { label: string; className: string; hint: string }> = {
  free: {
    label: 'frei nutzbar',
    className: 'bg-green-pale text-brand-text',
    hint: 'nach der allgemeinen Sicherheitsunterweisung',
  },
  briefing: { label: 'Einweisung nötig', className: 'bg-fond-gelb text-text-gelb', hint: 'einmal pro Maschine' },
  supervised: {
    label: 'nur mit Werkstattpat:in',
    className: 'border border-dashed border-ink text-ink',
    hint: 'nicht allein',
  },
}

const STEPS = [
  { strong: 'Offene Tür', rest: 'besuchen und umschauen' },
  { strong: 'Mitglied', rest: 'werden' },
  { strong: 'Einweisung', rest: 'für die Maschine machen' },
  { strong: 'Selbstständig', rest: 'loslegen' },
] as const

const H2 = 'm-0 mb-4 font-display text-[24px] font-extrabold md:text-[26px]'
const BOX = 'rounded-[12px] border border-line bg-card p-4'
const BOX_LABEL = 'mb-3 font-mono text-[14px] tracking-[.06em] text-muted'
// Quick-facts strip: as many columns as facts, so no cell stays empty (literal classes for Tailwind).
const FACT_COLS: Record<number, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
}
const CHIP = 'inline-flex items-center rounded-[5px] px-2 py-1 font-mono text-[14px]'
const BTN = 'inline-flex min-h-11 items-center justify-center rounded-[8px] px-4 text-[14px] font-bold'

const postDate = (p: Blog) =>
  p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) : null

/** "Reflowofen nur nach Einweisung" / "3 Maschinen nur nach Einweisung". */
function briefingChip(machines: NonNullable<Workshop['machines']>): string | null {
  const restricted = machines.filter((m) => m.access !== 'free')
  if (!restricted.length || restricted.length === machines.length) return null
  return restricted.length === 1
    ? `${restricted[0].name} nur nach Einweisung`
    : `${restricted.length} Maschinen nur nach Einweisung`
}

export function WorkshopPage({
  workshop: w,
  others,
  events,
  posts,
}: {
  workshop: Workshop
  others: Workshop[]
  events: Event[]
  posts: Blog[]
}) {
  const icon = isToolIcon(w.icon) ? w.icon : null
  const cover = asMedia(w.cover)
  const makes = w.makes ?? []
  const machines = w.machines ?? []
  const safety = w.safety ?? []
  const upcoming = eventsToList(events) ?? []
  const next = upcoming[0]
  const contact = w.contact
  const contactPhoto = asMedia(contact?.photo)
  const chip = briefingChip(machines)
  const facts = [
    { label: 'Wo', value: w.facts?.where },
    {
      label: 'Ansprechperson',
      value: [contact?.name, contact?.role].filter(Boolean).join(', ') || null,
    },
    { label: 'Offen', value: w.facts?.hours },
    { label: 'Kosten', value: w.facts?.cost },
  ].filter((f) => f.value)
  const usedAccess = (Object.keys(ACCESS) as MachineAccess[]).filter((a) => machines.some((m) => m.access === a))

  return (
    <>
      <main className="mx-auto max-w-shell px-4 pb-14 md:px-8">
        <div className="animate-msbfade">
          <nav aria-label="Brotkrumen" className="pt-6 font-mono text-[14px] text-muted md:pt-8">
            <Link href="/werkzeug" className={MONO_LINK}>
              Werkzeug &amp; Räume
            </Link>
            <span aria-hidden> / </span>
            <span aria-current="page">{w.title}</span>
          </nav>

          {/* Head */}
          <div className="grid items-center gap-8 pt-4 md:grid-cols-[1fr_minmax(260px,400px)] md:gap-12">
            <div>
              <div className="mb-3">
                <TapeTag color="orange">WERKSTATT</TapeTag>
              </div>
              <h1 className="m-0 mb-3.5 font-display text-[clamp(36px,6vw,52px)] font-black leading-[1.02] tracking-[-.02em] break-words">
                {w.title}
              </h1>
              {w.promise || w.verbs ? (
                <p className="m-0 max-w-[34em] text-[17px] leading-[1.55] md:text-[18px]">{w.promise || w.verbs}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`${CHIP} bg-yellow text-tinte`}>Für Mitglieder</span>
                <span className={`${CHIP} bg-green-pale text-brand-text`}>Offene Tür: für alle &amp; kostenlos</span>
                {chip ? <span className={`${CHIP} bg-fond-gelb text-text-gelb`}>{chip}</span> : null}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {next?.link?.url ? (
                  <Link href={next.link.url} className={`${BTN} ${BTN_PRIMARY}`}>
                    Nächster Termin: {next.day}. {next.sub?.split(' · ')[0]} →
                  </Link>
                ) : null}
                <Link href="/events" className={`${BTN} ${next ? BTN_SECONDARY : BTN_PRIMARY}`}>
                  Offene Tür besuchen{next ? '' : ' →'}
                </Link>
                {next ? null : (
                  <Link href="/mitmachen" className={`${BTN} ${BTN_SECONDARY}`}>
                    Mitglied werden
                  </Link>
                )}
              </div>
            </div>
            {cover ? (
              <div className="mx-auto w-full max-w-[400px]">
                <Polaroid
                  image={cover}
                  caption={w.coverCaption}
                  rotate={2}
                  sizes="(max-width:767px) 100vw, 400px"
                  priority
                />
              </div>
            ) : icon ? (
              <div className="hidden justify-center md:flex">
                <ToolIcon name={icon} className="h-[240px] w-[100px] -rotate-6" />
              </div>
            ) : null}
          </div>

          {/* Quick facts */}
          {facts.length ? (
            <dl
              className={`m-0 mt-8 grid gap-px overflow-hidden rounded-[12px] border border-line bg-line ${FACT_COLS[facts.length] ?? ''}`}
            >
              {facts.map((f) => (
                <div key={f.label} className="bg-fond px-4 py-3">
                  <dt className="font-mono text-[14px] tracking-[.06em] text-muted uppercase">{f.label}</dt>
                  <dd className="m-0 mt-1 text-[15px] leading-snug">{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1fr_300px]">
            <div className="min-w-0">
              {makes.length ? (
                <section className="mb-10">
                  <h2 className={H2}>Was du hier machen kannst</h2>
                  <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
                    {makes.map((m) => (
                      <li key={m.id ?? m.title} className={BOX}>
                        <span className="block text-[16px] font-bold">{m.title}</span>
                        {m.text ? (
                          <span className="mt-1 block text-[14px] leading-[1.5] text-muted">{m.text}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {machines.length ? (
                <section className="mb-10">
                  <h2 className={H2}>Maschinen &amp; Ausstattung</h2>
                  <ul className="m-0 list-none divide-y divide-line rounded-[12px] border border-line bg-card p-0">
                    {machines.map((m) => {
                      const a = ACCESS[m.access]
                      return (
                        <li key={m.id ?? m.name} className="flex items-center justify-between gap-4 px-4 py-3">
                          <span className="min-w-0">
                            <span className="block text-[15px] font-semibold">{m.name}</span>
                            {m.note ? <span className="block text-[14px] text-muted">{m.note}</span> : null}
                          </span>
                          <span className={`${CHIP} shrink-0 whitespace-nowrap ${a.className}`}>{a.label}</span>
                        </li>
                      )
                    })}
                  </ul>
                  <dl className="m-0 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-muted">
                    {usedAccess.map((k) => (
                      <div key={k} className="flex items-center gap-2">
                        <dt className={`${CHIP} ${ACCESS[k].className}`}>{ACCESS[k].label}</dt>
                        <dd className="m-0">{ACCESS[k].hint}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}

              {safety.length ? (
                <section className="mb-10 overflow-hidden rounded-[12px] border-2 border-red bg-card">
                  <h2 className="m-0 bg-red px-4 py-2 font-mono text-[14px] font-semibold tracking-[.08em] text-white">
                    ⚠ SICHERHEIT
                  </h2>
                  <ul className="m-0 list-disc py-3 pr-4 pl-9 text-[15px] leading-[1.6]">
                    {safety.map((s) => (
                      <li key={s.id ?? s.text}>{s.text}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {w.materials ? (
                <section className="mb-10">
                  <h2 className={H2}>Material &amp; Kosten</h2>
                  <p className="m-0 max-w-[60ch] text-[16px] leading-[1.6] whitespace-pre-line">{w.materials}</p>
                </section>
              ) : null}
            </div>

            {/* Sidebar */}
            <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
              {upcoming.length ? (
                <div className={BOX}>
                  <div className={BOX_LABEL}>NÄCHSTE TERMINE</div>
                  <ul className="m-0 list-none divide-y divide-line p-0">
                    {upcoming.map((e) => (
                      <li key={e.link?.url ?? e.title} className="py-2.5 first:pt-0 last:pb-0">
                        <Link
                          href={e.link?.url ?? '/events'}
                          className="group grid grid-cols-[52px_1fr] items-start gap-3 text-ink no-underline"
                        >
                          <span className="rounded-[6px] border border-line bg-fond py-1 text-center">
                            <span className="block font-sans text-[20px] leading-none font-bold text-brand-text">
                              {e.day}
                            </span>
                            <span className="block font-mono text-[14px] text-muted">{e.sub?.split(' · ')[0]}</span>
                          </span>
                          <span>
                            {e.membersOnly ? <MembersOnlyBadge className="mb-1" /> : null}
                            <span className={`block text-[15px] font-bold leading-snug ${CARD_TITLE}`}>{e.title}</span>
                            <span className="block text-[14px] text-muted">
                              {e.sub?.split(' · ')[1]} · {e.time}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link href="/events" className={`mt-2 ${MONO_LINK}`}>
                    alle Termine →
                  </Link>
                </div>
              ) : null}

              {contact?.name || contact?.linkUrl ? (
                <div className={BOX}>
                  <div className={BOX_LABEL}>FRAG NACH</div>
                  <div className="flex items-center gap-3">
                    {contactPhoto ? (
                      <Media
                        resource={contactPhoto}
                        placeholder="Foto"
                        className="h-14 w-14 shrink-0 overflow-hidden rounded-full"
                        sizes="56px"
                      />
                    ) : null}
                    <span>
                      {contact.name ? <span className="block text-[16px] font-bold">{contact.name}</span> : null}
                      <span className="block text-[14px] text-muted">
                        {contact.role || `Werkstattpat:in ${w.title}`}
                      </span>
                    </span>
                  </div>
                  {contact.linkUrl ? (
                    <Link href={contact.linkUrl} className={`mt-3 w-full ${BTN} ${BTN_SECONDARY}`}>
                      {contact.linkLabel || 'Nachricht schreiben'}
                    </Link>
                  ) : null}
                  {contact.note ? <p className="m-0 mt-2 text-[14px] text-muted">{contact.note}</p> : null}
                </div>
              ) : null}

              <div className="rounded-[12px] border border-line bg-fond p-4">
                <div className={BOX_LABEL}>SO KOMMST DU AN DIE MASCHINEN</div>
                <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {STEPS.map((s, i) => (
                    <li key={s.strong} className="flex items-center gap-2.5 text-[15px]">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand font-mono text-[14px] text-tinte">
                        {i + 1}
                      </span>
                      <span>
                        <b>{s.strong}</b> {s.rest}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          </div>

          {posts.length ? (
            <section className="mt-4">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="m-0 font-display text-[24px] font-extrabold md:text-[26px]">
                  Projekte aus der Werkstatt
                </h2>
                <Link href="/blog" className={MONO_LINK}>
                  mehr im Blog →
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/blog/${p.slug}`}
                    className={`overflow-hidden rounded-[12px] border border-line bg-card text-ink ${CARD_LINK}`}
                  >
                    <Media
                      resource={asMedia(p.cover)}
                      placeholder="Foto"
                      className="aspect-[16/10] w-full"
                      sizes="(max-width:639px) 100vw, 380px"
                    />
                    <span className="block p-4">
                      <span className="block font-mono text-[14px] text-muted">
                        Blog{postDate(p) ? ` · ${postDate(p)}` : ''}
                      </span>
                      <span className={`mt-1 block text-[16px] font-bold leading-snug ${CARD_TITLE}`}>{p.title}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {others.length ? (
            <section className="mt-10">
              <div className={BOX_LABEL}>WEITERE WERKSTÄTTEN</div>
              <div className="flex flex-wrap gap-2">
                {others.map((o) => (
                  <Link
                    key={o.id}
                    href={`/werkzeug/${o.slug}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-card py-1 pr-4 pl-3 text-[14px] text-ink no-underline transition-colors hover:border-brand-text hover:bg-green-pale"
                  >
                    {isToolIcon(o.icon) ? <ToolIcon name={o.icon} className="h-7 w-3 shrink-0" /> : null}
                    {o.title}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <div className="mx-auto max-w-shell px-4 pb-[72px] md:px-8">
        <CtaBandComponent
          blockType="ctaBand"
          heading={w.cta?.heading || `Lust auf ${w.title}?`}
          text={w.cta?.text || 'Komm zur Offenen Tür: für alle und kostenlos.'}
          primary={{ label: 'Offene Tür besuchen →', url: '/events' }}
          secondary={{ label: 'Mitglied werden', url: '/mitmachen' }}
        />
      </div>
    </>
  )
}
