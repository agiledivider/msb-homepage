import type { Field, TextFieldSingleValidation } from 'payload'

/** Longest title that still fits the start-page hero mat (blog, events). */
export const TITLE_MAX = { blog: 70, events: 60 } as const

/**
 * Title with a length limit for what people write (CMS and Claude via MCP).
 * Only checked when a user writes a new or changed title: the ~60 long titles
 * imported from the old Joomla site keep saving, and seeds (no user) are free.
 * Why: a long post title pushed the hero's text and buttons off the mat
 * (2026-11-22). No schema change, so no migration.
 */
const validate =
  (max: number): TextFieldSingleValidation =>
  (value, { req, previousValue }) => {
    if (typeof value !== 'string' || !value.trim()) return 'Bitte einen Titel angeben.'
    if (!req.user || value === previousValue) return true
    const n = value.trim().length
    return n <= max
      ? true
      : `Titel ist ${n} Zeichen lang, höchstens ${max} passen ins Startseiten-Karussell. Details gehören in den Untertitel.`
  }

export const titleField = (max: number, label = 'Titel'): Field => ({
  name: 'title',
  type: 'text',
  label,
  required: true,
  admin: { description: `Höchstens ${max} Zeichen, sonst passt er nicht ins Startseiten-Karussell.` },
  validate: validate(max),
})
