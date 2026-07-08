import type { JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import { Polaroid } from '@/components/Polaroid'
import type { MediaResource } from '@/components/Media'

type PolaroidFields = {
  image?: MediaResource
  caption?: string | null
  rotate?: number | null
}

/**
 * RichText converters that render the in-editor `polaroidCard` block through the
 * shared <Polaroid>. Pass to <RichText converters={polaroidConverters} />.
 */
export const polaroidConverters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
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
