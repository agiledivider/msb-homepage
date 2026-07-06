import type { Block } from 'payload'
import { linkField } from '../fields'

/** CtaBand — the full-width green "Mach mit. Bau mit." call-to-action band. */
export const CtaBand: Block = {
  slug: 'ctaBand',
  interfaceName: 'CtaBandBlock',
  labels: { singular: 'CTA Band', plural: 'CTA Bands' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'text', type: 'textarea' },
    linkField('primary', 'Primary button'),
    linkField('secondary', 'Secondary button'),
  ],
}
