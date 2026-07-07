/** Thin status strip above the header (opening hours + address). */
export function TopStrip({
  status = '● GEÖFFNET · HEUTE 18:00–21:00 UHR',
  address = 'Kennedyallee 18 · 53175 Bonn · Tel 0228 81286980',
}: {
  status?: string
  address?: string
}) {
  return (
    <div className="flex items-center justify-center gap-4 bg-brand px-4 py-2 font-mono text-[11.5px] tracking-[.03em] text-white md:justify-between md:px-8 md:text-[12.5px]">
      <span>{status}</span>
      {address ? <span className="hidden opacity-85 md:inline">{address}</span> : null}
    </div>
  )
}
