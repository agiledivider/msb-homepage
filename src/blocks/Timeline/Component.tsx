type Item = { id?: string | null; year?: string | null; text?: string | null }

export type TimelineBlock = { blockType: 'timeline'; title?: string | null; items?: Item[] | null }

/** The dated-entries card (formerly part of VereinIntro). */
export function TimelineComponent({ title, items }: TimelineBlock) {
  if (!items?.length) return null
  return (
    <div className="pt-11 first:pt-0">
      <div className="rounded-[14px] border border-line bg-card p-6">
        {title ? <div className="mb-4 font-mono text-[14px] tracking-[.06em] text-muted">{title}</div> : null}
        <div className="flex flex-col">
          {items.map((m, i) => {
            const last = i === items.length - 1
            return (
              <div
                key={m.id ?? `${m.year}-${i}`}
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
    </div>
  )
}
