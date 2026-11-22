import type { Block } from 'payload'
import { People } from '../People/config'
import { Prose } from '../Prose/config'
import { Quote } from '../Quote/config'
import { Timeline } from '../Timeline/config'

/** What may go into a column: content blocks, no layout blocks (no columns in columns). */
export const COLUMN_BLOCKS = [Prose, Quote, Timeline, People]

/** Column widths an editor can pick; the component maps each to grid columns. */
export const SPLITS = [
  { value: '1-1', label: 'Gleich breit (1:1)' },
  { value: '3-2', label: 'Links etwas breiter (3:2)' },
  { value: '2-1', label: 'Links doppelt so breit (2:1)' },
  { value: '1-2', label: 'Rechts doppelt so breit (1:2)' },
  { value: '2-3', label: 'Rechts etwas breiter (2:3)' },
] as const
export type Split = (typeof SPLITS)[number]['value']

/** Columns — two columns of content blocks side by side; stacked (left, then right) on phones. */
export const Columns: Block = {
  slug: 'columns',
  interfaceName: 'ColumnsBlock',
  labels: { singular: 'Zwei Spalten', plural: 'Zwei Spalten' },
  fields: [
    {
      name: 'split',
      type: 'select',
      label: 'Aufteilung',
      required: true,
      defaultValue: '3-2',
      options: SPLITS.map(({ value, label }) => ({ value, label })),
      admin: { description: 'Auf dem Handy stehen die Spalten untereinander, links zuerst.' },
    },
    // Side by side in the editor too, like on the page (tried 2026-11-22; a
    // row is presentation only, the stored data is the same either way).
    {
      type: 'row',
      fields: [
        { name: 'left', type: 'blocks', label: 'Linke Spalte', blocks: COLUMN_BLOCKS, admin: { width: '50%' } },
        { name: 'right', type: 'blocks', label: 'Rechte Spalte', blocks: COLUMN_BLOCKS, admin: { width: '50%' } },
      ],
    },
  ],
}
