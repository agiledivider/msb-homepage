import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { richTextConverters } from '@/blocks/richtext'
import { Media } from '@/components/Media'
import { PROSE_LINKS } from '@/components/ui'
import { eventTimeText } from '@/lib/eventTime'
import { postMeta } from '@/lib/postMeta'
import type { Blog, Event } from '@/payload-types'

/**
 * The body of a blog post / event page. Shared by the public detail pages and
 * the signed preview link, so a preview shows exactly what goes live.
 */

const PROSE = `text-[17px] leading-[1.7] text-ink ${PROSE_LINKS} [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-[24px] [&_h2]:font-extrabold [&_h3]:mt-6 [&_h3]:mb-1.5 [&_h3]:font-sans [&_h3]:text-[20px] [&_h3]:font-bold [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1`

const TITLE =
  'm-0 mb-3 font-display text-[clamp(40px,5vw,48px)] font-black leading-[1.02] tracking-[-.02em] break-words'

const SUBTITLE = 'm-0 mb-4 font-serif text-[20px] italic leading-[1.4] text-muted max-w-[34em]'

export function BlogArticle({ post }: { post: Blog }) {
  const meta = postMeta(post)
  return (
    <main className="mx-auto max-w-[760px] px-4 py-14 md:px-8">
      <div className="mb-3 font-mono text-[14px] tracking-[.06em] text-brand-text">AUS DER WERKSTATT · BLOG</div>
      <h1 className={TITLE}>{post.title}</h1>
      {post.subtitle ? <p className={SUBTITLE}>{post.subtitle}</p> : null}
      {meta ? <div className="mb-8 font-mono text-[14px] text-muted">{meta}</div> : null}
      {post.cover && typeof post.cover === 'object' ? (
        <Media
          resource={post.cover}
          placeholder={post.title}
          className="mb-8 h-[380px] w-full overflow-hidden rounded-[14px]"
          sizes="(max-width:760px) 100vw, 760px"
        />
      ) : null}
      {post.body ? (
        <div className={PROSE}>
          <RichText data={post.body as SerializedEditorState} converters={richTextConverters} />
        </div>
      ) : null}
    </main>
  )
}

// Date only — the time of day comes from the event's timeLabel, not the stored date.
const fmt = (d: string) =>
  new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(d))

export function EventArticle({ ev }: { ev: Event }) {
  return (
    <main className="mx-auto max-w-[760px] px-4 py-14 md:px-8">
      <div className="mb-3 font-mono text-[14px] tracking-[.06em] text-brand-text">NÄCHSTER TERMIN · EVENT</div>
      <h1 className={TITLE}>{ev.title}</h1>
      {ev.subtitle ? <p className={SUBTITLE}>{ev.subtitle}</p> : null}
      <div className="mb-8 font-mono text-[14px] text-muted">
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
      {ev.description && !ev.body ? <p className="mb-6 text-[17px] leading-[1.7] text-ink">{ev.description}</p> : null}
      {ev.body ? (
        <div className={PROSE}>
          <RichText data={ev.body as SerializedEditorState} converters={richTextConverters} />
        </div>
      ) : null}
    </main>
  )
}
