import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { BlogIndex } from '@/components/blog/BlogIndex'
import { blogPagePath, parseBlogPage } from '@/lib/blogPages'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ n: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = parseBlogPage((await params).n)
  if (!page) return {}
  return {
    title: `Blog – Seite ${page}`,
    description: 'Ältere Build-Logs, Berichte und Anleitungen aus der offenen Werkstatt des MakerSpace Bonn.',
    alternates: { canonical: blogPagePath(page) },
  }
}

/** Older blog posts, 20 per page (S5.10). /blog/seite/1 is /blog. */
export default async function BlogPage({ params }: Props) {
  const { n } = await params
  if (n === '1') permanentRedirect('/blog')
  const page = parseBlogPage(n)
  if (!page) notFound()
  return <BlogIndex page={page} />
}
