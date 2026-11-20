import type { Field } from 'payload'

/**
 * Shared "button/link" sub-field. In a real project you'd usually swap `url`
 * for an internal document relationship + `reference` toggle; kept as a plain
 * URL here so the blocks drop into any Payload project without extra collections.
 */
export const linkField = (name: string, label: string, opts?: { required?: boolean }): Field => ({
  name,
  label,
  type: 'group',
  fields: [
    {
      // label and target side by side, so each link takes one line, not two
      type: 'row',
      fields: [
        { name: 'label', type: 'text', label: 'Text', required: opts?.required, admin: { width: '50%' } },
        {
          name: 'url',
          type: 'text',
          label: 'Ziel',
          required: opts?.required,
          admin: { width: '50%', description: 'Interner Pfad (z. B. /verein) oder volle URL.' },
        },
      ],
    },
  ],
})

export type LinkValue = { label?: string | null; url?: string | null }
