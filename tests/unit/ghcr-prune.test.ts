import { describe, expect, it } from 'vitest'
import { KEEP_TAGGED, MAX_DELETES, planPrune, type Version } from '../../scripts/ghcr-prune'

const NOW = new Date('2026-11-26T12:00:00Z')
let nextId = 1

/** A version created `daysAgo` days before NOW. */
const aVersion = (daysAgo: number, tags: string[] = [], digest?: string): Version => {
  const id = nextId++
  return {
    id,
    name: digest ?? `sha256:${String(id).padStart(64, '0')}`,
    created_at: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
    metadata: { container: { tags } },
  }
}
const ids = (vs: Version[]) => vs.map((v) => v.id).sort((a, b) => a - b)

describe('planPrune', () => {
  it('keeps the newest tagged versions and deletes older ones', () => {
    const tagged = Array.from({ length: KEEP_TAGGED + 5 }, (_, i) => aVersion(i + 2, [`nogit-${i}`]))
    const plan = planPrune(tagged, new Map(), NOW)
    expect(plan.keep).toHaveLength(KEEP_TAGGED)
    expect(ids(plan.remove)).toEqual(ids(tagged.slice(KEEP_TAGGED)))
  })

  it('always keeps latest, however old', () => {
    const latest = aVersion(400, ['latest'])
    const newer = Array.from({ length: KEEP_TAGGED }, (_, i) => aVersion(i + 2, [`sha-${i}`]))
    expect(planPrune([latest, ...newer], new Map(), NOW).keep).toContainEqual(latest)
  })

  it('keeps the untagged manifests a kept CI image is built from (index children)', () => {
    const platform = aVersion(10)
    const attestation = aVersion(10)
    const image = aVersion(10, ['sha-abc', 'latest'])
    const leftover = aVersion(10) // untagged, not part of any kept image
    const plan = planPrune(
      [platform, attestation, image, leftover],
      new Map([[image.name, [platform.name, attestation.name]]]),
      NOW,
    )
    expect(ids(plan.keep)).toEqual(ids([platform, attestation, image]))
    expect(ids(plan.remove)).toEqual([leftover.id])
  })

  it('deletes the children of an image that is itself deleted', () => {
    const tagged = Array.from({ length: KEEP_TAGGED }, (_, i) => aVersion(i + 2, [`sha-${i}`]))
    const oldChild = aVersion(100)
    const oldImage = aVersion(100, ['sha-old'])
    const plan = planPrune([...tagged, oldChild, oldImage], new Map(), NOW)
    expect(ids(plan.remove)).toEqual(ids([oldChild, oldImage]))
  })

  it('leaves anything younger than a day alone (a push may be in flight)', () => {
    const fresh = aVersion(0.5)
    const tagged = Array.from({ length: KEEP_TAGGED }, (_, i) => aVersion(i + 2, [`sha-${i}`]))
    expect(planPrune([fresh, ...tagged], new Map(), NOW).keep).toContainEqual(fresh)
  })

  it('stops on an empty listing', () => {
    expect(planPrune([], new Map(), NOW).refusal).toBe('no versions listed')
  })

  it('stops instead of deleting every version', () => {
    const plan = planPrune([aVersion(50), aVersion(60)], new Map(), NOW)
    expect(plan.refusal).toBe('plan would delete every version')
    expect(plan.remove).toEqual([])
  })

  it(`deletes at most ${MAX_DELETES} per run, oldest first`, () => {
    const latest = aVersion(2, ['latest'])
    const old = Array.from({ length: MAX_DELETES + 50 }, (_, i) => aVersion(i + 10))
    const plan = planPrune([latest, ...old], new Map(), NOW)
    expect(plan.remove).toHaveLength(MAX_DELETES)
    expect(ids(plan.remove)).toEqual(ids(old.slice(50))) // the 200 oldest go first
  })

  it('is idempotent: a second run on what is left deletes nothing', () => {
    const vs = [
      aVersion(1.5, ['latest']),
      ...Array.from({ length: KEEP_TAGGED + 10 }, (_, i) => aVersion(i + 2, [`n-${i}`])),
      aVersion(40),
    ]
    const first = planPrune(vs, new Map(), NOW)
    expect(planPrune(first.keep, new Map(), NOW).remove).toEqual([])
  })
})
