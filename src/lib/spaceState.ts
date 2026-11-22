'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'

/**
 * Live opening state from the MakerSpace's SpaceAPI (status.makerspacebonn.de).
 * Used by the top strip and the footer. The API returns only open/closed and an
 * optional "open until"; regular hours are not part of it (checked 2026-11-22).
 */
export const SPACE_API = 'https://status.makerspacebonn.de/api/spaceapi'
const REFRESH_MS = 5 * 60 * 1000 // refresh every five minutes
const TIMEOUT_MS = 8000

const SpaceStateSchema = z.object({
  open: z.boolean(),
  openUntil: z.string().min(1).optional(),
  message: z.string().optional(),
})
const SpaceApiSchema = z.object({ state: SpaceStateSchema })

export type SpaceState = z.infer<typeof SpaceStateSchema>

/** Parses a SpaceAPI response body; returns null if it doesn't match. */
export function parseSpaceApi(body: unknown): SpaceState | null {
  const parsed = SpaceApiSchema.safeParse(body)
  return parsed.success ? parsed.data.state : null
}

/** German labels mirroring the original SpaceAPI iframe script (short = mobile, full = desktop). */
export function stateLabels(state: SpaceState): { short: string; full: string } {
  if (!state.open) return { short: 'Geschlossen', full: 'Der MakerSpace ist geschlossen' }
  if (state.openUntil)
    return {
      short: `Für Mitglieder bis ${state.openUntil} geöffnet.`,
      full: `Der MakerSpace ist für Mitglieder bis ${state.openUntil} geöffnet.`,
    }
  return { short: 'Für Mitglieder geöffnet', full: 'Der MakerSpace ist für Mitglieder geöffnet' }
}

/** Live state, refreshed every five minutes; null until the first answer (or if the API is down). */
export function useSpaceState(): SpaceState | null {
  const [state, setState] = useState<SpaceState | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await fetch(SPACE_API, { signal: AbortSignal.timeout(TIMEOUT_MS) })
        if (!res.ok) return
        const next = parseSpaceApi(await res.json())
        if (active && next) setState(next)
      } catch {
        // Network error or timeout: keep the last known state (or the fallback).
      }
    }
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  return state
}
