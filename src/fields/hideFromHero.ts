import type { CheckboxField } from 'payload'

/**
 * Keeps a blog post or event out of the start-page hero (it still shows in
 * lists, feeds and on its own page). For recurring things like the weekly
 * Offene Tür, which would otherwise take the event face every week.
 * The hero query lives in src/lib/heroContent.ts.
 */
export const hideFromHeroField = (): CheckboxField => ({
  name: 'hideFromHero',
  type: 'checkbox',
  label: 'Nicht im Startseiten-Hero zeigen',
  defaultValue: false,
  admin: {
    position: 'sidebar',
    description: 'Erscheint weiter in Listen und auf der eigenen Seite, aber nicht im großen Karussell oben.',
  },
})
