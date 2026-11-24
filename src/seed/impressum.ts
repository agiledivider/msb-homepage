import { a, br, doc, h2, h3, p, t } from './lexical'

/* Impressum page content. Modernised to § 5 DDG (the TMG was repealed and
   replaced by the Digitale-Dienste-Gesetz in May 2024). Folded into the main
   seed and upserted idempotently via ./legal (run-legal.ts). */

const impressumBody = doc([
  h2('MakerSpace Bonn e. V.'),
  p(t('Kennedyallee 18'), br(), t('53175 Bonn'), br(), t('Deutschland')),

  h2('Kontakt'),
  p(t('Telefon: 0228 81286980'), br(), t('E-Mail: '), a('office@makerspacebonn.de', 'mailto:office@makerspacebonn.de')),

  h2('Vertretungsberechtigter Vorstand'),
  p(t('Vorstand nach § 26 BGB:'), br(), t('Salim Deeb, Jan Benzenberg')),

  h2('Registereintrag'),
  p(
    t('Eingetragen im Vereinsregister.'),
    br(),
    t('Registergericht: Amtsgericht Bonn'),
    br(),
    t('Registernummer: VR 10222'),
  ),

  h2('Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV'),
  p(t('Salim Deeb'), br(), t('c/o MakerSpace Bonn e. V., Kennedyallee 18, 53175 Bonn')),

  h2('Verbraucherstreitbeilegung'),
  p(
    t(
      'Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
    ),
  ),

  h2('Satzung'),
  p(t('Unsere Satzung steht als PDF zum Download bereit: '), a('Satzung (PDF)', '/api/media/file/satzung.pdf'), t('.')),

  h2('Bankverbindung'),
  h3('Spenden — gern auch gegen Spendenquittung (ab 100 €)'),
  p(t('Sparkasse KölnBonn'), br(), t('IBAN: DE17 3705 0198 1934 0169 55'), br(), t('BIC: COLSDE33XXX')),
  h3('Mitgliedsbeiträge'),
  p(t('Sparkasse KölnBonn'), br(), t('IBAN: DE55 3705 0198 1935 3119 00'), br(), t('BIC: COLSDE33XXX')),
])

/** The Impressum page document (pageIntro header + prose body). */
export const impressumPage = {
  title: 'Impressum',
  slug: 'impressum',
  _status: 'published' as const,
  layout: [
    {
      blockType: 'pageIntro' as const,
      tag: 'IMPRESSUM',
      tagColor: 'green' as const,
      meta: 'Angaben gemäß § 5 DDG',
      headline: 'Impressum',
      lede: 'Anbieterkennzeichnung des MakerSpace Bonn e. V.',
    },
    { blockType: 'prose' as const, body: impressumBody as never },
  ],
}
