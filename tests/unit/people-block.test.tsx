/**
 * S3.1: /verein shows the people behind the Verein (full name + role), each
 * with the address to reach them.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { type PeopleBlock, PeopleComponent } from '@/blocks/People/Component'

const render = (overrides: Partial<PeopleBlock> = {}) =>
  renderToStaticMarkup(
    createElement(PeopleComponent, {
      blockType: 'people',
      heading: 'Menschen & Ansprechpartner',
      people: [
        { name: 'Erika Mustermann', role: 'Vorstand', email: 'vorstand@example.org' },
        { name: 'Max Beispiel', role: 'Kasse' },
      ],
      ...overrides,
    }),
  )

describe('People block', () => {
  it('shows every person with full name and role', () => {
    const html = render()
    for (const text of ['Erika Mustermann', 'Max Beispiel', 'Vorstand', 'Kasse']) expect(html).toContain(text)
  })

  it("links a person's email on their card", () => {
    const html = render()
    expect(html).toContain('href="mailto:vorstand@example.org"')
    expect(html).toContain('>vorstand@example.org<')
  })

  it('shows no email link for a person without one', () => {
    expect(render({ people: [{ name: 'Max Beispiel', role: 'Kasse' }] })).not.toContain('mailto:')
  })

  it('shows the heading', () => {
    expect(render()).toContain('Menschen &amp; Ansprechpartner')
  })

  it('renders nothing without people', () => {
    expect(render({ people: [] })).toBe('')
  })
})
