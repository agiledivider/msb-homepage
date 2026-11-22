import { Columns } from './Columns/config'
import { CtaBand } from './CtaBand/config'
import { EventFeed } from './EventFeed/config'
import { EventsList } from './EventsList/config'
import { Hero } from './Hero/config'
import { JoinOptions } from './JoinOptions/config'
import { PageIntro } from './PageIntro/config'
import { People } from './People/config'
import { Press } from './Press/config'
import { Prose } from './Prose/config'
import { Quote } from './Quote/config'
import { Timeline } from './Timeline/config'
import { Values } from './Values/config'
import { VereinIntro } from './VereinIntro/config'
import { Workshops } from './Workshops/config'

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
  Prose,
  People,
  Press,
  Columns,
  Quote,
  Timeline,
  Values,
]

/**
 * Still in the schema so existing pages keep their data and the conversion
 * (src/seed/vereinLayout.ts) can read it, but no longer offered to editors:
 * /verein is built from Zwei Spalten + Text + Zitat + Zeitleiste + Werte now.
 * Remove it, with a migration dropping its tables, once no page uses it.
 */
export const RETIRED_BLOCKS = ['vereinIntro']

export {
  Columns,
  CtaBand,
  EventFeed,
  EventsList,
  Hero,
  JoinOptions,
  PageIntro,
  People,
  Press,
  Prose,
  Quote,
  Timeline,
  Values,
  VereinIntro,
  Workshops,
}
