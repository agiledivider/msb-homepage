type Item = { id?: string | null; title: string; text?: string | null }

export type ValuesBlock = { blockType: 'values'; items?: Item[] | null }

/** A row of value cards (formerly part of VereinIntro): three per row from sm up. */
export function ValuesComponent({ items }: ValuesBlock) {
  if (!items?.length) return null
  return (
    <div className="pt-9 first:pt-0">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map((v) => (
          <div key={v.id ?? v.title} className="rounded-[12px] border border-line bg-card p-[22px]">
            <div className="mb-2 font-sans text-[19px] font-bold">{v.title}</div>
            {v.text ? <p className="m-0 text-[14px] leading-[1.55] text-muted">{v.text}</p> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
