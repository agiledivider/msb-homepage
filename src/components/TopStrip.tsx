'use client'

import { useEffect, useState } from 'react'

/** Thin status strip above the header (live opening state + address). */

const SPACE_API = 'https://status.makerspacebonn.de/api/spaceapi'
const REFRESH_MS = 5 * 60 * 1000 // refresh the opening state every five minutes

type SpaceState = { open: boolean; openUntil?: string; message?: string }

/** German labels mirroring the original SpaceAPI iframe script (short = mobile, full = desktop). */
function stateLabels(state: SpaceState): { short: string; full: string } {
  if (!state.open) return { short: 'Geschlossen', full: 'Der MakerSpace ist geschlossen' }
  if (state.openUntil)
    return {
      short: `Für Mitglieder bis ${state.openUntil} geöffnet.`,
      full: `Der MakerSpace ist für Mitglieder bis ${state.openUntil} geöffnet.`,
    }
  return { short: 'Für Mitglieder geöffnet', full: 'Der MakerSpace ist für Mitglieder geöffnet' }
}

export function TopStrip({
  status = '● GEÖFFNET · HEUTE 18:00–21:00 UHR',
  address = 'Kennedyallee 18 · 53175 Bonn · Tel 0228 81286980',
}: {
  status?: string
  address?: string
}) {
  const [state, setState] = useState<SpaceState | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const res = await fetch(SPACE_API)
        if (!res.ok) throw new Error(`HTTP-Fehler: ${res.status}`)
        const data = await res.json()
        if (active) setState(data.state as SpaceState)
      } catch (error) {
        console.error('SpaceAPI:', error)
      }
    }

    load()
    const id = setInterval(load, REFRESH_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  // Until the first fetch resolves, fall back to the CMS-provided text + brand green.
  const labels = state ? stateLabels(state) : { short: status, full: status }
  // Open: Markengrün with ink (never white). Closed: Sicherheitsrot with white,
  // red on purpose so a closed space is unmistakable (Falk, 2026-11-22).
  const bg = state && !state.open ? 'bg-red text-white' : 'bg-brand text-ink'

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
