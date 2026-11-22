import { type PeopleBlock, PeopleComponent } from '../People/Component'
import { type ProseBlock, ProseComponent } from '../Prose/Component'
import { type QuoteBlock, QuoteComponent } from '../Quote/Component'
import { type TimelineBlock, TimelineComponent } from '../Timeline/Component'
import type { Split } from './config'

type Child = (ProseBlock | QuoteBlock | TimelineBlock | PeopleBlock) & { id?: string | null }

export type ColumnsBlock = {
  blockType: 'columns'
  split?: Split | null
  left?: Child[] | null
  right?: Child[] | null
}

/** Grid columns per split; literal strings so Tailwind generates them. */
const GRID: Record<Split, string> = {
  '1-1': 'lg:grid-cols-2',
  '3-2': 'lg:grid-cols-[3fr_2fr]',
  '2-1': 'lg:grid-cols-[2fr_1fr]',
  '1-2': 'lg:grid-cols-[1fr_2fr]',
  '2-3': 'lg:grid-cols-[2fr_3fr]',
}

function Child({ block }: { block: Child }) {
  switch (block.blockType) {
    case 'prose':
      return <ProseComponent {...block} />
    case 'quote':
      return <QuoteComponent {...block} />
    case 'timeline':
      return <TimelineComponent {...block} />
    case 'people':
      return <PeopleComponent {...block} />
    default:
      block satisfies never
      return null
  }
}

/** Two columns of content blocks; each column keeps its own vertical rhythm. */
export function ColumnsComponent({ split, left, right }: ColumnsBlock) {
  if (!left?.length && !right?.length) return null
  const grid = GRID[split ?? '3-2'] ?? GRID['3-2']
  return (
    <div className="pt-11 first:pt-0">
      <div className={`grid grid-cols-1 items-start gap-10 ${grid}`}>
        {[left, right].map((column, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: always exactly two columns, left then right
          <div key={i} className="min-w-0">
            {column?.map((block, j) => (
              <Child key={block.id ?? `${block.blockType}-${j}`} block={block} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
