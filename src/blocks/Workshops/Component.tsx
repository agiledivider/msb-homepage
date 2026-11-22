import { SectionHeading } from '../../components/ui'
import type { LinkValue } from '../fields'

type Item = { code?: string | null; title: string; desc?: string | null }

export type WorkshopsBlock = {
  blockType: 'workshops'
  variant?: 'preview' | 'detailed' | null
  tagLabel?: string | null
  tagColor?: 'green' | 'orange' | null
  heading?: string | null
  allLink?: LinkValue | null
  note?: string | null
  items?: Item[] | null
  footnote?: string | null
}

export function WorkshopsComponent({
  variant,
  tagLabel,
  tagColor,
  heading,
  allLink,
  note,
  items,
  footnote,
}: WorkshopsBlock) {
  const detailed = variant === 'detailed'
  return (
    <div className="pt-14 first:pt-0">
      {tagLabel || heading ? (
        <SectionHeading
          tag={tagLabel ?? undefined}
          tagColor={tagColor ?? 'orange'}
          heading={heading ?? undefined}
          link={allLink}
          className="mb-[18px]"
        />
      ) : null}

      <div className="relative rounded-[14px] border border-pegboard-edge bg-pegboard px-[30px] py-[34px] shadow-[inset_0_2px_18px_rgba(70,55,25,.16),inset_0_0_0_1px_rgba(255,255,255,.25)] [background-image:radial-gradient(circle,rgba(48,35,16,.4)_0_3px,transparent_3.6px),radial-gradient(circle,rgba(48,35,16,.2)_0_4.3px,transparent_4.9px),radial-gradient(circle,rgba(255,253,247,.9)_0_4.3px,transparent_4.9px)] [background-size:38px_38px] [background-position:0_0,1.4px_1.4px,-1.4px_-1.4px]">
        {note ? (
          <div className="absolute -top-3.5 right-[26px] -rotate-3 font-hand text-[23px] font-bold text-brand-text">
            {note}
          </div>
        ) : null}
        <div className={`grid gap-4 ${detailed ? 'sm:grid-cols-2' : 'sm:grid-cols-2 md:grid-cols-3'}`}>
          {(items ?? []).map((it, i) => (
            <div
              key={i}
              className="relative rounded-[10px] border border-line bg-card p-[18px] shadow-[0_10px_22px_-14px_rgba(60,52,30,.5)]"
            >
              {!detailed ? (
                <div className="absolute right-3 top-2 flex gap-[5px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-pegboard-peg" />
                  <span className="h-1.5 w-1.5 rounded-full bg-pegboard-peg" />
                </div>
              ) : null}
              {it.code ? <div className="mb-1.5 font-mono text-[14px] text-brand-text">{it.code}</div> : null}
              <div className={`mb-1.5 font-sans font-bold ${detailed ? 'text-[21px]' : 'text-[18px]'}`}>{it.title}</div>
              {it.desc ? (
                <p className={`m-0 leading-[1.5] text-muted ${detailed ? 'text-[14px] leading-[1.6]' : 'text-[14px]'}`}>
                  {it.desc}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {footnote ? <p className="m-0 mt-4 font-mono text-[14px] text-muted">{footnote}</p> : null}
    </div>
  )
}
