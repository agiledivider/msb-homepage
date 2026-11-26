import { Fragment, type ReactNode } from 'react'
import { type ColumnsBlock, ColumnsComponent } from '../blocks/Columns/Component'
import { type CtaBandBlock, CtaBandComponent } from '../blocks/CtaBand/Component'
import { type DocumentsBlock, DocumentsComponent } from '../blocks/Documents/Component'
import { type DonateBlock, DonateComponent } from '../blocks/Donate/Component'
import { type EventFeedBlock, EventFeedComponent } from '../blocks/EventFeed/Component'
import { type EventsListBlock, EventsListComponent } from '../blocks/EventsList/Component'
import { type HeroBlock, HeroComponent } from '../blocks/Hero/Component'
import { type JoinOptionsBlock, JoinOptionsComponent } from '../blocks/JoinOptions/Component'
import { type PageIntroBlock, PageIntroComponent } from '../blocks/PageIntro/Component'
import { type PeopleBlock, PeopleComponent } from '../blocks/People/Component'
import { type PressBlock, PressComponent } from '../blocks/Press/Component'
import { type ProseBlock, ProseComponent } from '../blocks/Prose/Component'
import { type QuoteBlock, QuoteComponent } from '../blocks/Quote/Component'
import { type SupportersBlock, SupportersComponent } from '../blocks/Supporters/Component'
import { type TimelineBlock, TimelineComponent } from '../blocks/Timeline/Component'
import { type ValuesBlock, ValuesComponent } from '../blocks/Values/Component'
import { type VereinIntroBlock, VereinIntroComponent } from '../blocks/VereinIntro/Component'
import { type WorkshopsBlock, WorkshopsComponent } from '../blocks/Workshops/Component'

export type MsbBlock =
  | HeroBlock
  | PageIntroBlock
  | EventFeedBlock
  | WorkshopsBlock
  | CtaBandBlock
  | VereinIntroBlock
  | EventsListBlock
  | JoinOptionsBlock
  | ProseBlock
  | PeopleBlock
  | PressBlock
  | DocumentsBlock
  | DonateBlock
  | SupportersBlock
  | ColumnsBlock
  | QuoteBlock
  | TimelineBlock
  | ValuesBlock

/** One renderer per blockType, each typed against its own block. */
const REGISTRY: {
  [K in MsbBlock['blockType']]: (props: Extract<MsbBlock, { blockType: K }>) => ReactNode | Promise<ReactNode>
} = {
  hero: HeroComponent,
  pageIntro: PageIntroComponent,
  eventFeed: EventFeedComponent,
  workshops: WorkshopsComponent,
  ctaBand: CtaBandComponent,
  vereinIntro: VereinIntroComponent,
  eventsList: EventsListComponent,
  joinOptions: JoinOptionsComponent,
  prose: ProseComponent,
  people: PeopleComponent,
  press: PressComponent,
  documents: DocumentsComponent,
  donate: DonateComponent,
  supporters: SupportersComponent,
  columns: ColumnsComponent,
  quote: QuoteComponent,
  timeline: TimelineComponent,
  values: ValuesComponent,
}

/**
 * Renders a Payload `blocks` layout array. Content sits in the shared
 * max-width shell; blocks that break out (Hero prism, CTA band) manage their
 * own spacing.
 */
export function RenderBlocks({ blocks }: { blocks?: MsbBlock[] | null }) {
  if (!blocks?.length) return null
  return (
    <main className="mx-auto max-w-shell px-4 pb-[72px] md:px-8">
      <div className="animate-msbfade">
        {blocks.map((block, i) => {
          // Indexing the mapped type by a union loses the K link; the entry for
          // block.blockType does take this block.
          const Component = REGISTRY[block.blockType] as
            | ((props: MsbBlock) => ReactNode | Promise<ReactNode>)
            | undefined
          if (!Component) return null
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: server-rendered CMS list in editor order, items have no client state
            <Fragment key={i}>
              <Component {...block} />
            </Fragment>
          )
        })}
      </div>
    </main>
  )
}
