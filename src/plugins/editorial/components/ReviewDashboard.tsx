import type { Payload } from 'payload'
import { isReviewer } from '../access'
import { REVIEWER_ROLES_DEFAULT } from '../types'
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
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {g.docs.map((doc) => (
                    <li
                      key={doc.id}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                    >
                      <a
                        href={`/admin/collections/${g.slug}/${doc.id}`}
                        style={{ color: 'var(--theme-text)', textDecoration: 'none', fontSize: 14, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        › {doc.title ?? `#${doc.id}`}
                      </a>
                      {/* Reviewer queue: diff + approve straight from the card */}
                      {section.status === 'in_review' ? (
                        <DashboardActions collectionSlug={g.slug} id={doc.id} />
                      ) : null}
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
 * überarbeiten" (changes_requested); someone with both roles sees both.
 */
export async function ReviewDashboard({ payload, user }: Props) {
  const roles = ((user as { editorialRoles?: string[] } | undefined)?.editorialRoles) ?? []
  if (roles.length === 0) return null

  const bases: Omit<Section, 'groups' | 'total'>[] = []
  if (isReviewer(user, REVIEWER_ROLES_DEFAULT)) {
    bases.push({ key: 'review', label: 'Zur Freigabe', desc: 'Beiträge, die auf deine Freigabe warten.', status: 'in_review' })
  }
  if (roles.includes('editor')) {
    bases.push({
      key: 'edit',
      label: 'Zu überarbeiten',
      desc: 'Beiträge, die ein Reviewer zur Überarbeitung zurückgegeben hat.',
      status: 'changes_requested',
    })
  }
  if (bases.length === 0) return null

  const collections = workflowCollections(payload)
  const sections = await Promise.all(bases.map((b) => loadSection(payload, collections, b)))

  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: 24 }}>
      {sections.map((s) => (
        <SectionBox key={s.key} section={s} />
      ))}
    </div>
  )
}
