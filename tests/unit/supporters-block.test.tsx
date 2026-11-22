/**
 * S3.2: /verein shows current supporters and, separately, former ones; logos
 * link to the supporter; an empty current group is hidden, not empty.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { type SupportersBlock, SupportersComponent } from '@/blocks/Supporters/Component'

const render = (overrides: Partial<SupportersBlock> = {}) =>
  renderToStaticMarkup(
    createElement(SupportersComponent, {
      blockType: 'supporters',
      heading: 'Unsere Förderer',
      formerHeading: 'Frühere Förderer',
      supporters: [
        {
          name: 'Deutsche Telekom',
          url: 'https://www.telekom.com/de',
          logo: { url: '/api/media/file/logo-telekom.svg' },
          current: true,
        },
        { name: 'Bonner Spendenparlament', url: 'https://www.bonner-spendenparlament.de/', current: false },
      ],
      ...overrides,
    }),
  )

describe('Supporters block', () => {
  it('lists current supporters before the former ones, under their own heading', () => {
    const html = render()
    const telekom = html.indexOf('Deutsche Telekom')
    const former = html.indexOf('Frühere Förderer')
    const spendenparlament = html.indexOf('Bonner Spendenparlament')
    expect(telekom).toBeGreaterThan(0)
    expect(former).toBeGreaterThan(telekom)
    expect(spendenparlament).toBeGreaterThan(former)
  })

  it('links each supporter in a new tab', () => {
    const html = render()
    expect(html).toContain('href="https://www.telekom.com/de" target="_blank" rel="noopener noreferrer"')
    expect(html).toContain('href="https://www.bonner-spendenparlament.de/"')
  })

  it('shows a current supporter’s logo in its own colours, named for screen readers', () => {
    const html = render()
    expect(html).toContain('src="/api/media/file/logo-telekom.svg" alt="Deutsche Telekom"')
    expect(html).not.toContain('--logo:url(/api/media/file/logo-telekom.svg)')
  })

  it('shows a former supporter’s logo in one colour (mask) plus its coloured original for hover', () => {
    const html = render({
      supporters: [{ name: 'Stadt Bonn', logo: { url: '/api/media/file/logo-stadt-bonn.svg' }, current: false }],
    })
    expect(html).toContain('--logo:url(/api/media/file/logo-stadt-bonn.svg)')
    expect(html).toContain('src="/api/media/file/logo-stadt-bonn.svg" alt="Stadt Bonn"')
  })

  it("shows a supporter's text next to its logo", () => {
    const html = render({
      supporters: [{ name: 'Deutsche Telekom', description: 'Stellt uns die Räume zur Verfügung.', current: true }],
    })
    expect(html).toContain('Stellt uns die Räume zur Verfügung.')
  })

  it('shows the name when there is no logo', () => {
    expect(render()).toMatch(/>Bonner Spendenparlament</)
  })

  it('hides the current group when nobody supports the Verein right now', () => {
    const html = render({ supporters: [{ name: 'Stadt Bonn', current: false }] })
    expect(html).not.toContain('Deutsche Telekom')
    expect(html.match(/<ul/g)).toHaveLength(1)
    expect(html).toContain('Frühere Förderer')
  })

  it('treats a supporter without the flag as current', () => {
    const html = render({ supporters: [{ name: 'Neu', current: null }] })
    expect(html).not.toContain('Frühere Förderer')
  })

  it('renders nothing without supporters', () => {
    expect(render({ supporters: [] })).toBe('')
  })
})
