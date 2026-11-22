import { TapeTag } from '../../components/ui'

export type PageIntroBlock = {
  blockType: 'pageIntro'
  tag?: string | null
  tagColor?: 'green' | 'orange' | null
  meta?: string | null
  headline: string
  lede?: string | null
}

export function PageIntroComponent({ tag, tagColor, meta, headline, lede }: PageIntroBlock) {
  return (
    <div className="pt-11">
      <div className="mb-4 flex items-center gap-3.5">
        {tag ? <TapeTag color={tagColor ?? 'green'}>{tag}</TapeTag> : null}
        {meta ? <span className="font-mono text-[14px] text-muted">{meta}</span> : null}
      </div>
      <h1 className="m-0 mb-3.5 max-w-[800px] font-display text-[clamp(40px,6vw,48px)] font-black leading-[1.02] tracking-[-.02em] break-words">
        {headline}
      </h1>
      {lede ? <p className="m-0 max-w-[34em] font-serif text-[20px] italic leading-[1.4] text-muted">{lede}</p> : null}
    </div>
  )
}
