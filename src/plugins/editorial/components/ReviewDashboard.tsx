import type { Payload } from 'payload'
import { hasPermission } from 'payload-rbac-plugin'
import { isReviewer } from '../access'
import { DashboardActions } from './DashboardActions'

type Props = { payload: Payload; user?: unknown }

type Doc = { id: string | number; title?: string }
type Group = { slug: string; docs: Doc[] }
type Section = { key: string; label: string; desc: string; status: string; groups: Group[]; total: number }

/** Collections that opted into the workflow carry a top-level `reviewStatus`. */
const workflowCollections = (payload: Payload): string[] =>
  payload.config.collections
    .filter((c) => c.fields?.some((f) => 'name' in f && f.name === 'reviewStatus'))
    .map((c) => c.slug)

const loadSection = async (
  payload: Payload,
  collections: string[],
  base: Omit<Section, 'groups' | 'total'>,
): Promise<Section> => {
  const groups = await Promise.all(
    collections.map(async (slug) => {
      const res = await payload.find({
        collection: slug as never,
        where: { reviewStatus: { equals: base.status } } as never,
        draft: true,
        overrideAccess: true,
        depth: 0,
        limit: 25,
      })
      return { slug, docs: res.docs as Doc[] }
    }),
  )
  return { ...base, groups, total: groups.reduce((n, g) => n + g.docs.length, 0) }
}

/** S9.5: a draft nobody has submitted yet, with who saved it last. */
export type OpenDraft = {
  collection: string
  collectionLabel: string
  id: string | number
  title: string
  updatedAt: string
  /** null: saved without a logged-in user (seed, script) or before S9.5 */
  editor: string | null
  viaClaude: boolean
}

const userName = (u: unknown): string | null => {
  if (!u || typeof u !== 'object') return null
  const { name, email } = u as { name?: unknown; email?: unknown }
  return typeof name === 'string' && name ? name : typeof email === 'string' && email ? email : null
}

/**
 * S9.5: the latest version is a draft that hasn't been submitted (reviewStatus
 * 'draft'), across the given collections, newest first. Drafts in review or
 * sent back have their own boxes.
 */
export async function loadOpenDrafts(payload: Payload, collections: string[], limit = 25): Promise<OpenDraft[]> {
  const perCollection = await Promise.all(
    collections.map(async (slug) => {
      const res = await payload.find({
        collection: slug as never,
        where: { and: [{ reviewStatus: { equals: 'draft' } }, { _status: { equals: 'draft' } }] } as never,
        draft: true,
        overrideAccess: true,
        depth: 1,
        sort: '-updatedAt',
        limit,
      })
      const label = payload.config.collections.find((c) => c.slug === slug)?.labels?.plural
      return (res.docs as Record<string, unknown>[]).map((d) => ({
        collection: slug,
        collectionLabel: typeof label === 'string' ? label : slug,
        id: d.id as string | number,
        title: typeof d.title === 'string' && d.title ? d.title : `#${String(d.id)}`,
        updatedAt: String(d.updatedAt),
        editor: userName(d.lastEditedBy) ?? userName(d.createdBy),
        viaClaude: d.lastEditedViaClaude === true,
      }))
    }),
  )
  return perCollection
    .flat()
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit)
}

const BERLIN = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' })

function DraftsBox({ drafts }: { drafts: OpenDraft[] }) {
  return (
    <div style={{ border: '1px solid var(--theme-elevation-150)', borderRadius: 8, padding: '18px 20px' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>Offene Entwürfe</h2>
      <p style={{ margin: '0 0 12px', color: 'var(--theme-elevation-500)', fontSize: 13 }}>
        Gespeichert, aber noch nicht zur Prüfung eingereicht.
      </p>
      {drafts.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: 'var(--theme-elevation-450)' }}>Keine offenen Entwürfe.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {drafts.map((d) => (
            <li key={`${d.collection}-${d.id}`} style={{ minWidth: 0 }}>
              <a
                href={`/admin/collections/${d.collection}/${d.id}`}
                style={{
                  display: 'block',
                  color: 'var(--theme-text)',
                  textDecoration: 'none',
                  fontSize: 14,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                › {d.title}
              </a>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--theme-elevation-500)', paddingLeft: 12 }}>
                {d.collectionLabel} · {BERLIN.format(new Date(d.updatedAt))} Uhr · {d.editor ?? 'unbekannt'}
                {d.viaClaude ? (
                  <span
                    style={{
                      marginLeft: 6,
                      padding: '0 6px',
                      borderRadius: 4,
                      border: '1px solid var(--theme-elevation-250)',
                      fontSize: 11,
                    }}
                  >
                    über Claude
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SectionBox({ section }: { section: Section }) {
  return (
    <div style={{ border: '1px solid var(--theme-elevation-150)', borderRadius: 8, padding: '18px 20px' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>{section.label}</h2>
      <p style={{ margin: '0 0 12px', color: 'var(--theme-elevation-500)', fontSize: 13 }}>{section.desc}</p>

      {section.total === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: 'var(--theme-elevation-450)' }}>Nichts zu tun. 🎉</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {section.groups
            .filter((g) => g.docs.length > 0)
            .map((g) => (
              <div key={g.slug}>
                <div
                  style={{
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    color: 'var(--theme-elevation-400)',
                    marginBottom: 6,
                  }}
                >
                  {g.slug} · {g.docs.length}
                </div>
                <ul
                  style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                  {g.docs.map((doc) => (
                    <li
                      key={doc.id}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                    >
                      <a
                        href={`/admin/collections/${g.slug}/${doc.id}`}
                        style={{
                          color: 'var(--theme-text)',
                          textDecoration: 'none',
                          fontSize: 14,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        › {doc.title ?? `#${doc.id}`}
                      </a>
                      {/* Reviewer queue: diff + approve straight from the card */}
                      {section.status === 'in_review' ? <DashboardActions collectionSlug={g.slug} id={doc.id} /> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

/**
 * Admin dashboard (beforeDashboard). Shows one box per editorial role the user
 * holds — a reviewer sees "Zur Freigabe" (in_review), an editor sees "Zu
 * überarbeiten" (changes_requested); someone with both roles sees both. Both
 * also see "Offene Entwürfe": drafts nobody has submitted yet (S9.5).
 */
export async function ReviewDashboard({ payload, user: sessionUser }: Props) {
  const collections = workflowCollections(payload)
  // The dashboard gets the session user with its roles as bare IDs, so every
  // permission check would fail and both boxes stay hidden. Load the roles and
  // their permissions, as the RBAC checks expect.
  const id = (sessionUser as { id?: string | number } | undefined)?.id
  if (id === undefined) return null
  const user = await payload.findByID({ collection: 'users', id, depth: 2, overrideAccess: true })
  // review box → editorial:review; edit box → content-edit permission on any workflow collection
  const canReview = isReviewer(user)
  const canEdit = collections.some((slug) => hasPermission(user as never, `${slug}:update`))
  if (!canReview && !canEdit) return null

  const bases: Omit<Section, 'groups' | 'total'>[] = []
  if (canReview) {
    bases.push({
      key: 'review',
      label: 'Zur Freigabe',
      desc: 'Beiträge, die auf deine Freigabe warten.',
      status: 'in_review',
    })
  }
  if (canEdit) {
    bases.push({
      key: 'edit',
      label: 'Zu überarbeiten',
      desc: 'Beiträge, die ein Reviewer zur Überarbeitung zurückgegeben hat.',
      status: 'changes_requested',
    })
  }
  if (bases.length === 0) return null

  // S9.5: reviewers see every open draft, editors those in collections they may edit.
  const draftCollections = canReview
    ? collections
    : collections.filter((slug) => hasPermission(user as never, `${slug}:update`))
  const [sections, drafts] = await Promise.all([
    Promise.all(bases.map((b) => loadSection(payload, collections, b))),
    loadOpenDrafts(payload, draftCollections),
  ])

  return (
    <div
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        marginBottom: 24,
      }}
    >
      {sections.map((s) => (
        <SectionBox key={s.key} section={s} />
      ))}
      <DraftsBox drafts={drafts} />
    </div>
  )
}
