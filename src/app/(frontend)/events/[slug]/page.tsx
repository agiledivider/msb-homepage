import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Media } from '@/components/Media'
import { eventTimeText } from '@/lib/eventTime'
import { getPayloadClient } from '@/lib/getPayload'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'events', where: { slug: { equals: slug } }, limit: 1, depth: 1 })
  const ev = res.docs[0]
  if (!ev) return {}
  const description = ev.description || undefined
  const image = ev.image && typeof ev.image === 'object' ? ev.image.url : undefined
  const url = `/events/${ev.slug}`
  return {
    title: ev.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: ev.title,
      description,
      url,
      images: image ? [{ url: image }] : undefined,
    },
  }
}

// Date only — the time of day comes from the event's timeLabel, not the stored date.
const fmt = (d: string) =>
  new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(d))

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
    draft,
    overrideAccess: draft,
  })
  const ev = res.docs[0]
  if (!ev) notFound()

  return (
    <main className="mx-auto max-w-[760px] px-4 py-14 md:px-8">
      <div className="mb-3 font-mono text-[12px] tracking-[.06em] text-green">NÄCHSTER TERMIN · EVENT</div>
      <h1 className="m-0 mb-3 font-display text-[clamp(28px,5vw,44px)] font-black leading-[1.04] tracking-[-.02em]">
        {ev.title}
      </h1>
      <div className="mb-8 font-mono text-[13px] text-muted">
        {fmt(ev.date)} · {eventTimeText(ev.timeLabel)}
        {ev.location ? ` · ${ev.location}` : ''}
      </div>
      {ev.image && typeof ev.image === 'object' ? (
        <Media
          resource={ev.image}
          placeholder={ev.title}
          className="mb-8 h-[380px] w-full overflow-hidden rounded-[14px]"
          sizes="(max-width:760px) 100vw, 760px"
        />
      ) : null}
      {ev.description && !ev.body ? (
        <p className="mb-6 text-[17px] leading-[1.7] text-[#332f28]">{ev.description}</p>
      ) : null}
      {ev.body ? (
        <div className="text-[17px] leading-[1.7] text-[#332f28] [&_a]:text-brand-text [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-[24px] [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:mb-1.5 [&_h3]:font-display [&_h3]:text-[18px] [&_h3]:font-bold [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">
          <RichText data={ev.body as SerializedEditorState} />
        </div>
      ) : null}
    </main>
  )
}
