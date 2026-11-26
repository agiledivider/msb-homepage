/**
 * Machine access on a workshop page. "Ausbildung nötig" (2026-11-26, Metallwerkstatt:
 * lathe and mill need more than one briefing) shows its chip but no hint yet,
 * because the Verein hasn't decided how that training works.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WorkshopPage } from '@/components/WorkshopPage'
import type { Workshop } from '@/payload-types'

const aWorkshop = (overrides: Partial<Workshop> = {}): Workshop =>
  ({
    id: 1,
    title: 'Metallwerkstatt',
    slug: 'metall',
    updatedAt: '2026-11-26T00:00:00.000Z',
    createdAt: '2026-11-26T00:00:00.000Z',
    ...overrides,
  }) as Workshop

const render = (w: Workshop) =>
  renderToStaticMarkup(createElement(WorkshopPage, { workshop: w, others: [], events: [], posts: [] }))

/** The legend under the machine list: one <dt>/<dd> pair per access level in use. */
const legend = (html: string) =>
  [...html.matchAll(/<dt class="[^"]*">([^<]*)<\/dt><dd class="m-0">([^<]*)<\/dd>/g)].map((m) => [m[1], m[2]])

describe('workshop machine access', () => {
  it('shows "Ausbildung nötig" with an empty hint', () => {
    const html = render(aWorkshop({ machines: [{ name: 'Drehmaschine', access: 'training' }] }))
    expect(html).toContain('Ausbildung nötig')
    expect(legend(html)).toEqual([['Ausbildung nötig', '']])
  })

  it('keeps the hints of the other levels', () => {
    const html = render(
      aWorkshop({
        machines: [
          { name: 'Bandsäge', access: 'briefing' },
          { name: 'Drehmaschine', access: 'training' },
        ],
      }),
    )
    expect(legend(html)).toEqual([
      ['Einweisung nötig', 'einmal pro Maschine'],
      ['Ausbildung nötig', ''],
    ])
  })
})
