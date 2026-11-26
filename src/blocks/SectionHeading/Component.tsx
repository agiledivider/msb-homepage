import { SectionHeading } from '../../components/ui'

export type SectionHeadingBlock = {
  blockType: 'sectionHeading'
  tag?: string | null
  tagColor?: 'green' | 'orange' | null
  heading: string
}

/**
 * Tape label + heading above the next block. Every block starts with its own
 * top spacing (pt-11), so the negative bottom margin pulls the next one up to
 * the heading's usual distance.
 */
export function SectionHeadingComponent({ tag, tagColor, heading }: SectionHeadingBlock) {
  return (
    <div className="-mb-7 pt-11 first:pt-0">
      <SectionHeading tag={tag ?? undefined} tagColor={tagColor ?? 'green'} heading={heading} />
    </div>
  )
}
