// Quotation marks an editor may type around a quote: German, English, French, straight.
const MARKS = '„“”"«»‚‘’\'‹›'
const EDGES = new RegExp(`^[\\s${MARKS}]+|[\\s${MARKS}]+$`, 'g')

/**
 * Wraps a standalone quote in German quotation marks „…“ (styleguide 2026-11 §9),
 * whatever marks the editor typed around it. Marks inside the text are kept.
 */
export function germanQuote(text: string): string {
  const inner = text.replace(EDGES, '')
  return inner ? `„${inner}“` : ''
}
