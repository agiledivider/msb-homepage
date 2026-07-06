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
    { name: 'label', type: 'text', required: opts?.required },
    {
      name: 'url',
      type: 'text',
      required: opts?.required,
      admin: { description: 'Internal path (e.g. /verein) or full URL.' },
    },
  ],
})

export type LinkValue = { label?: string | null; url?: string | null }
