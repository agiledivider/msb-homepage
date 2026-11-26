import { findPublic } from '@/lib/publicData'
import { search } from '@/lib/search'

export const dynamic = 'force-dynamic'

/** Quick results under the header (S5.17): the best 7, plus the counts per tab. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.slice(0, 100) ?? ''
  if (!q.trim()) {
    // Nothing typed yet: the workshops, as places to start.
    const res = await findPublic({ collection: 'workshops', sort: 'order', limit: 20, depth: 0 })
    const suggestions = res.docs.flatMap((w) => (w.slug ? [{ label: w.title, href: `/werkzeug/${w.slug}` }] : []))
    return Response.json({ query: '', hits: [], counts: null, suggestions })
  }
  const result = await search(q, { limit: 7, compact: true })
  return Response.json({ ...result, suggestions: [] }, { headers: { 'Cache-Control': 'no-store' } })
}
