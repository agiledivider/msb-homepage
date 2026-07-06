import { Fragment, type ReactNode } from 'react'

import { HeroComponent, type HeroBlock } from '../blocks/Hero/Component'
import { PageIntroComponent, type PageIntroBlock } from '../blocks/PageIntro/Component'
import { EventFeedComponent, type EventFeedBlock } from '../blocks/EventFeed/Component'
import { WorkshopsComponent, type WorkshopsBlock } from '../blocks/Workshops/Component'
import { CtaBandComponent, type CtaBandBlock } from '../blocks/CtaBand/Component'
import { VereinIntroComponent, type VereinIntroBlock } from '../blocks/VereinIntro/Component'
import { EventsListComponent, type EventsListBlock } from '../blocks/EventsList/Component'
import { JoinOptionsComponent, type JoinOptionsBlock } from '../blocks/JoinOptions/Component'

export type MsbBlock =
  | HeroBlock
  | PageIntroBlock
  | EventFeedBlock
  | WorkshopsBlock
  | CtaBandBlock
  | VereinIntroBlock
  | EventsListBlock
  | JoinOptionsBlock

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
