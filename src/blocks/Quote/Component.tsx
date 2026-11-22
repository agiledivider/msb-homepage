import { germanQuote } from '../../lib/germanQuote'

export type QuoteBlock = { blockType: 'quote'; text?: string | null }

/** Pull quote (formerly part of VereinIntro): Newsreader italic, Markengrün bar, „…“. */
export function QuoteComponent({ text }: QuoteBlock) {
  if (!text) return null
  return (
    <div className="pt-8 first:pt-0">
      <blockquote className="m-0 border-l-[3px] border-brand py-1 pl-5">
        <p className="m-0 font-serif text-[22px] italic leading-[1.3] text-ink">{germanQuote(text)}</p>
      </blockquote>
    </div>
  )
}
