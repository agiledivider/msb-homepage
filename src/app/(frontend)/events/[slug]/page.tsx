import { notFound } from 'next/navigation'
import { draftMode } from 'next/headers'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { getPayloadClient } from '@/lib/getPayload'
import { Media } from '@/components/Media'

export const dynamic = 'force-dynamic'

const fmt = (d: string) =>
  new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
        {fmt(ev.date)}
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
      {ev.description ? <p className="mb-6 text-[17px] leading-[1.7] text-[#332f28]">{ev.description}</p> : null}
      {ev.body ? (
        <div className="text-[17px] leading-[1.7] text-[#332f28] [&_p]:mb-4">
          <RichText data={ev.body as SerializedEditorState} />
        </div>
      ) : null}
    </main>
  )
}
