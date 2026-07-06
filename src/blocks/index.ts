import { Hero } from './Hero/config'
import { PageIntro } from './PageIntro/config'
import { EventFeed } from './EventFeed/config'
import { Workshops } from './Workshops/config'
import { CtaBand } from './CtaBand/config'
import { VereinIntro } from './VereinIntro/config'
import { EventsList } from './EventsList/config'
import { JoinOptions } from './JoinOptions/config'

/**
 * All MakerSpace Bonn content blocks. Drop into a `blocks` layout field:
 *
 *   import { msbBlocks } from '@/blocks'
 *   { name: 'layout', type: 'blocks', blocks: msbBlocks }
 */
export const msbBlocks = [
  Hero,
  PageIntro,
  EventFeed,
  Workshops,
  CtaBand,
  VereinIntro,
  EventsList,
  JoinOptions,
]

export { Hero, PageIntro, EventFeed, Workshops, CtaBand, VereinIntro, EventsList, JoinOptions }
