import type { Field } from 'payload'

const slugify = (val: string): string =>
  val
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

/** URL slug that auto-fills from a source field (default `title`) when empty. */
export const slugField = (from = 'title'): Field => ({
  name: 'slug',
  type: 'text',
  label: 'URL-Pfad',
  index: true,
  unique: true,
  admin: { position: 'sidebar', description: 'Leer lassen: wird aus dem Titel erzeugt.' },
  hooks: {
    beforeValidate: [
      ({ value, data }) => {
        if (typeof value === 'string' && value.trim().length) return slugify(value)
        const fallback = data?.[from]
        if (typeof fallback === 'string' && fallback.length) return slugify(fallback)
        return value
      },
    ],
  },
})
