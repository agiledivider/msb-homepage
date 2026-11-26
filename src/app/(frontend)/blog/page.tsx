import type { Metadata } from 'next'
import { BlogIndex } from '@/components/blog/BlogIndex'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Build-Logs, Berichte und Anleitungen aus der offenen Werkstatt des MakerSpace Bonn.',
}

export default function BlogIndexPage() {
  return <BlogIndex page={1} />
}
