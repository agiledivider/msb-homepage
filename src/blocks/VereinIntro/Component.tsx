import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { germanQuote } from '../../lib/germanQuote'
import { richTextConverters } from '../richtext'

type Milestone = { year?: string | null; text?: string | null }
type Value = { title: string; text?: string | null }

export type VereinIntroBlock = {
  blockType: 'vereinIntro'
  body?: SerializedEditorState | null
  quote?: string | null
  timelineTitle?: string | null
  timeline?: Milestone[] | null
  values?: Value[] | null
}

export function VereinIntroComponent({ body, quote, timelineTitle, timeline, values }: VereinIntroBlock) {
  return (
    <div className="pt-11 first:pt-0">
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          {body ? (
            <RichText
              data={body}
              converters={richTextConverters}
              className="[&_p]:m-0 [&_p]:mb-4 [&_p]:text-[16.5px] [&_p]:leading-[1.7] [&_p]:text-ink [&_strong]:text-ink"
            />
          ) : null}
          {quote ? (
            <blockquote className="m-0 mt-[26px] border-l-[3px] border-brand py-1 pl-5">
              <p className="m-0 font-serif text-[22px] italic leading-[1.3] text-ink">{germanQuote(quote)}</p>
            </blockquote>
          ) : null}
        </div>

        {timeline?.length ? (
          <div className="rounded-[14px] border border-line bg-card p-6">
            <div className="mb-4 font-mono text-[14px] tracking-[.06em] text-muted">{timelineTitle}</div>
            <div className="flex flex-col">
              {timeline.map((m, i) => {
                const last = i === timeline.length - 1
                return (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: server-rendered CMS list in editor order, items have no client state
                    key={i}
                    className={`ml-2 grid grid-cols-[64px_1fr] gap-3.5 pl-[18px] ${
                      last ? 'border-l-2 border-transparent' : 'border-l-2 border-line pb-4'
                    }`}
                  >
                    <span className="font-sans text-[16px] font-bold text-brand-text">{m.year}</span>
                    <span className="text-[14px] leading-[1.5] text-ink">{m.text}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      {values?.length ? (
        <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {values.map((v, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: server-rendered CMS list in editor order, items have no client state
            <div key={i} className="rounded-[12px] border border-line bg-card p-[22px]">
              <div className="mb-2 font-sans text-[19px] font-bold">{v.title}</div>
              {v.text ? <p className="m-0 text-[14px] leading-[1.55] text-muted">{v.text}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
