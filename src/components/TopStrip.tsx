'use client'

import { stateLabels, useSpaceState } from '@/lib/spaceState'

/** Thin status strip above the header (live opening state + address). */

export function TopStrip({
  status = '● GEÖFFNET · HEUTE 18:00–21:00 UHR',
  address = 'Kennedyallee 18 · 53175 Bonn · Tel 0228 81286980',
}: {
  status?: string
  address?: string
}) {
  const state = useSpaceState()

  // Until the first fetch resolves, fall back to the CMS-provided text + brand green.
  const labels = state ? stateLabels(state) : { short: status, full: status }
  // Open: Markengrün with ink (never white). Closed: Sicherheitsrot with white,
  // red on purpose so a closed space is unmistakable (Falk, 2026-11-22).
  const bg = state && !state.open ? 'bg-red text-white' : 'bg-brand text-tinte'

  return (
    <div
      className={`flex items-center justify-center gap-4 ${bg} px-4 py-2 font-mono text-[14px] tracking-[.03em] transition-colors md:justify-between md:px-8 md:text-[14px]`}
    >
      <span>
        <span className="md:hidden">{labels.short}</span>
        <span className="hidden md:inline">{labels.full}</span>
      </span>
      {address ? <span className="hidden md:inline">{address}</span> : null}
    </div>
  )
}
