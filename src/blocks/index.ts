import { CtaBand } from './CtaBand/config'
import { EventFeed } from './EventFeed/config'
import { EventsList } from './EventsList/config'
import { Hero } from './Hero/config'
import { JoinOptions } from './JoinOptions/config'
import { PageIntro } from './PageIntro/config'
import { Prose } from './Prose/config'
import { VereinIntro } from './VereinIntro/config'
import { Workshops } from './Workshops/config'

/**
 * All MakerSpace Bonn content blocks. Drop into a `blocks` layout field:
 *
 *   import { msbBlocks } from '@/blocks'
 *   { name: 'layout', type: 'blocks', blocks: msbBlocks }
 */
export const msbBlocks = [Hero, PageIntro, EventFeed, Workshops, CtaBand, VereinIntro, EventsList, JoinOptions, Prose]

export { CtaBand, EventFeed, EventsList, Hero, JoinOptions, PageIntro, Prose, VereinIntro, Workshops }
