import { Fragment, type ReactNode } from 'react'
import { type ColumnsBlock, ColumnsComponent } from '../blocks/Columns/Component'
import { type CtaBandBlock, CtaBandComponent } from '../blocks/CtaBand/Component'
import { type EventFeedBlock, EventFeedComponent } from '../blocks/EventFeed/Component'
import { type EventsListBlock, EventsListComponent } from '../blocks/EventsList/Component'
import { type HeroBlock, HeroComponent } from '../blocks/Hero/Component'
import { type JoinOptionsBlock, JoinOptionsComponent } from '../blocks/JoinOptions/Component'
import { type PageIntroBlock, PageIntroComponent } from '../blocks/PageIntro/Component'
import { type PeopleBlock, PeopleComponent } from '../blocks/People/Component'
import { type PressBlock, PressComponent } from '../blocks/Press/Component'
import { type ProseBlock, ProseComponent } from '../blocks/Prose/Component'
import { type QuoteBlock, QuoteComponent } from '../blocks/Quote/Component'
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
  | ColumnsBlock
  | QuoteBlock
  | TimelineBlock
  | ValuesBlock

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY: Record<string, (props: any) => ReactNode> = {
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
          const Component = REGISTRY[block.blockType]
          if (!Component) return null
          return (
            <Fragment key={i}>
              <Component {...block} />
            </Fragment>
          )
        })}
      </div>
    </main>
  )
}
