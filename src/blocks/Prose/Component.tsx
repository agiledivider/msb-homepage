import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { PROSE_LINKS } from '../../components/ui'
import { richTextConverters } from '../richtext'

export type ProseBlock = {
  blockType: 'prose'
  body?: SerializedEditorState | null
}

/** Long-form legal / content prose at a comfortable reading measure. Headings,
 *  paragraphs, links and lists are styled to match the site typography. */
export function ProseComponent({ body }: ProseBlock) {
  if (!body) return null
  return (
    <div className="pt-11 first:pt-0">
      <RichText
        data={body}
        converters={richTextConverters}
        className={
          'max-w-[760px] ' +
          '[&_h2]:mt-9 [&_h2]:mb-2.5 [&_h2]:font-display [&_h2]:text-[24px] [&_h2]:font-extrabold [&_h2]:text-ink [&_h2:first-child]:mt-0 ' +
          '[&_h3]:mt-6 [&_h3]:mb-1.5 [&_h3]:font-sans [&_h3]:text-[20px] [&_h3]:font-bold [&_h3]:text-ink ' +
          '[&_p]:m-0 [&_p]:mb-4 [&_p]:text-[15.5px] [&_p]:leading-[1.7] [&_p]:text-ink ' +
          '[&_strong]:text-ink ' +
          `${PROSE_LINKS} ` +
          '[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_li]:text-[15.5px] [&_li]:leading-[1.7] [&_li]:text-ink'
        }
      />
    </div>
  )
}
