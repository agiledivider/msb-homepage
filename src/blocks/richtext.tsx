import type { SerializedLinkNode } from '@payloadcms/richtext-lexical'
import { type JSXConvertersFunction, LinkJSXConverter } from '@payloadcms/richtext-lexical/react'
import type { MediaResource } from '@/components/Media'
import { Polaroid } from '@/components/Polaroid'

/**
 * Resolve an internal (relationship) rich-text link to its on-site path.
 *
 * Payload's default link converter has no `internalDocToHref`, so internal links
 * render with `href="#"` — this supplies the mapping. Relationship depth counts
 * relationship hops (not block nesting), so at the depth our routes fetch (>= 1)
 * the target is populated to an object with a slug. If it somehow isn't populated
 * (id only) we return '#' rather than link to a wrong path.
 */
export const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }): string => {
  const doc = linkNode.fields?.doc
  if (!doc) return '#'
  const slug = typeof doc.value === 'object' ? ((doc.value as { slug?: string | null }).slug ?? undefined) : undefined
  if (!slug) return '#'
  switch (doc.relationTo) {
    case 'blog':
      return `/blog/${slug}`
    case 'events':
      return `/events/${slug}`
    default: // pages live at the site root
      return `/${slug}`
  }
}

type PolaroidFields = { image?: MediaResource; caption?: string | null; rotate?: number | null }

/**
 * Shared rich-text converters for every <RichText> on the site: resolves internal
 * links to real paths and renders the in-editor `polaroidCard` block.
 */
export const richTextConverters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...LinkJSXConverter({ internalDocToHref }),
  blocks: {
    polaroidCard: ({ node }: { node: { fields: PolaroidFields } }) => {
      const { image, caption, rotate } = node.fields
      return (
        <div className="mx-auto my-8 max-w-[320px]">
          <Polaroid image={image} caption={caption} rotate={rotate ?? undefined} sizes="320px" />
        </div>
      )
    },
  },
})
