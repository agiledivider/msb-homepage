import type { Block } from 'payload'

/**
 * PolaroidCard — a taped-photo block for use *inside* the Lexical rich-text
 * editor (via BlocksFeature), not as a page-level layout block. Editors can drop
 * a polaroid into prose; the frontend renders it through <Polaroid>.
 */
export const PolaroidCard: Block = {
  slug: 'polaroidCard',
  interfaceName: 'PolaroidCardBlock',
  labels: { singular: 'Polaroid', plural: 'Polaroids' },
  fields: [
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Foto', required: true },
    { name: 'caption', type: 'text', label: 'Bildunterschrift' },
    {
      name: 'rotate',
      type: 'number',
      label: 'Neigung (Grad)',
      admin: {
        description: 'Tilt in degrees, applied from the md breakpoint up (flat on mobile). e.g. -3 or 2.',
      },
    },
  ],
}
