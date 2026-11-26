/**
 * ghcr-prune — delete old image versions on GHCR so the packages don't grow forever.
 *
 *   pnpm ghcr:prune                 # dry run: prints the plan for every package
 *   pnpm ghcr:prune --apply         # deletes it
 *   pnpm ghcr:prune msb-demo        # one package only
 *
 * Kept per package: `latest`, the KEEP_TAGGED newest tagged versions (rollback
 * targets), every manifest a kept image is built from, and anything younger than
 * MIN_AGE_MS (a push may still be in flight). Everything else goes.
 *
 * Why the manifest step: CI images are OCI indexes whose platform image and
 * attestation show up on GHCR as *untagged* versions. "Delete untagged" would
 * break every CI image, `latest` included. The publisher's msb-demo images are
 * single manifests, so there untagged versions really are leftovers from
 * same-day re-publishes.
 *
 * Breakers: stops on an empty listing, on a plan that would delete every
 * version, and deletes at most MAX_DELETES per package and run.
 *
 * Needs `gh` (token with read:packages + delete:packages, or GITHUB_TOKEN in
 * Actions with admin access to the package) and `docker buildx` logged in to
 * ghcr.io. Runs weekly in .github/workflows/ghcr-prune.yml. Since 2026-11-26.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { z } from 'zod'

const run = promisify(execFile)

export const PACKAGES = ['msb-homepage', 'msb-publisher', 'msb-backup', 'msb-demo'] as const
export const KEEP_TAGGED = 30
export const MIN_AGE_MS = 24 * 60 * 60 * 1000
export const MAX_DELETES = 200

const VersionSchema = z.object({
  id: z.number(),
  name: z.string().startsWith('sha256:'), // the manifest digest
  created_at: z.string(),
  metadata: z.object({ container: z.object({ tags: z.array(z.string()) }) }),
})
export type Version = z.infer<typeof VersionSchema>

const ManifestSchema = z.object({
  mediaType: z.string().optional(),
  manifests: z.array(z.object({ digest: z.string() })).optional(),
})

export type Plan = { keep: Version[]; remove: Version[]; refusal?: string }

/**
 * What to delete. `childrenOf(digest)` lists the manifests an image is built
 * from (empty for a plain manifest); it is only asked for kept tagged versions.
 */
export function planPrune(versions: Version[], childrenOf: Map<string, string[]>, now: Date): Plan {
  if (versions.length === 0) return { keep: [], remove: [], refusal: 'no versions listed' }

  const newestFirst = [...versions].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const tagged = newestFirst.filter((v) => v.metadata.container.tags.length > 0)
  const keptTagged = new Set([
    ...tagged.slice(0, KEEP_TAGGED).map((v) => v.id),
    ...tagged.filter((v) => v.metadata.container.tags.includes('latest')).map((v) => v.id),
  ])
  const protectedDigests = new Set(
    newestFirst.filter((v) => keptTagged.has(v.id)).flatMap((v) => childrenOf.get(v.name) ?? []),
  )

  const keep: Version[] = []
  const remove: Version[] = []
  for (const v of newestFirst) {
    const young = now.getTime() - Date.parse(v.created_at) < MIN_AGE_MS
    if (keptTagged.has(v.id) || protectedDigests.has(v.name) || young) keep.push(v)
    else remove.push(v)
  }

  if (keep.length === 0) return { keep, remove: [], refusal: 'plan would delete every version' }
  if (remove.length > MAX_DELETES) {
    // Oldest first, so the next run carries on where this one stopped.
    const oldestFirst = [...remove].reverse()
    return { keep: [...keep, ...oldestFirst.slice(MAX_DELETES)], remove: oldestFirst.slice(0, MAX_DELETES) }
  }
  return { keep, remove }
}

async function listVersions(owner: string, pkg: string): Promise<Version[]> {
  const { stdout } = await run(
    'gh',
    ['api', '--paginate', `/users/${owner}/packages/container/${pkg}/versions`, '--jq', '.[]'],
    { maxBuffer: 64 * 1024 * 1024, timeout: 120_000 },
  )
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => VersionSchema.parse(JSON.parse(line)))
}

async function children(owner: string, pkg: string, digest: string): Promise<string[]> {
  const { stdout } = await run(
    'docker',
    ['buildx', 'imagetools', 'inspect', '--raw', `ghcr.io/${owner}/${pkg}@${digest}`],
    { timeout: 60_000 },
  )
  return ManifestSchema.parse(JSON.parse(stdout)).manifests?.map((m) => m.digest) ?? []
}

const label = (v: Version) =>
  `${v.id}  ${v.created_at.slice(0, 10)}  ${v.metadata.container.tags.join(',') || '(untagged)'}`

async function prunePackage(owner: string, pkg: string, apply: boolean, now: Date): Promise<boolean> {
  const versions = await listVersions(owner, pkg)
  // Children only matter for images we keep; ask for the candidates.
  const newestTagged = versions
    .filter((v) => v.metadata.container.tags.length > 0)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, KEEP_TAGGED + 1)
  const childrenOf = new Map<string, string[]>()
  for (const v of newestTagged) childrenOf.set(v.name, await children(owner, pkg, v.name))

  const plan = planPrune(versions, childrenOf, now)
  console.log(`\n${pkg}: ${versions.length} versions, keep ${plan.keep.length}, delete ${plan.remove.length}`)
  if (plan.refusal) {
    console.log(`  stopped: ${plan.refusal}`)
    return false
  }
  for (const v of plan.remove) console.log(`  delete ${label(v)}`)
  if (!apply || plan.remove.length === 0) return true

  for (const v of plan.remove) {
    await run('gh', ['api', '-X', 'DELETE', `/users/${owner}/packages/container/${pkg}/versions/${v.id}`], {
      timeout: 60_000,
    })
  }
  console.log(`  deleted ${plan.remove.length}`)
  return true
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const only = args.filter((a) => !a.startsWith('--'))
  const owner = process.env.GHCR_OWNER || 'agiledivider'
  const packages = only.length ? only : [...PACKAGES]
  const now = new Date()

  let ok = true
  for (const pkg of packages) ok = (await prunePackage(owner, pkg, apply, now)) && ok
  if (!apply) console.log('\ndry run: nothing deleted. Add --apply to delete.')
  if (!ok) process.exit(1)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
