import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SectionHeadingComponent } from '@/blocks/SectionHeading/Component'

describe('Abschnitt-Überschrift block (S5.14)', () => {
  it('shows the tape label and the heading', () => {
    const out = renderToStaticMarkup(
      <SectionHeadingComponent blockType="sectionHeading" tag="SACHSPENDE" tagColor="green" heading="Das suchen wir" />,
    )
    expect(out).toContain('SACHSPENDE')
    expect(out).toMatch(/<h2[^>]*>Das suchen wir<\/h2>/)
  })

  it('works without a tape label', () => {
    const out = renderToStaticMarkup(
      <SectionHeadingComponent blockType="sectionHeading" heading="Nur eine Überschrift" />,
    )
    expect(out).toContain('Nur eine Überschrift')
  })
})
