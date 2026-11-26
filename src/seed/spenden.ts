import { doc, h2, h3, p, t, ul } from './lexical'

/**
 * The /spenden page (S5.14). Account and receipt rules are real (Impressum,
 * old "Uns unterstützen" page; ≤ 300 € the bank statement is enough). PayPal
 * and betterplace links stay empty until the Vorstand has the accounts, so the
 * page hides them. The wish list items are EXAMPLES Falk asked for on
 * 2026-11-26; the Vorstand replaces them in the CMS.
 */
export const spendenPage = {
  title: 'Spenden',
  slug: 'spenden',
  _status: 'published' as const,
  reviewStatus: 'approved' as const,
  layout: [
    {
      blockType: 'pageIntro' as const,
      tag: 'SPENDEN',
      tagColor: 'orange' as const,
      meta: 'Geld · Maschinen · Material',
      headline: 'Hilf uns, die Werkstatt auszubauen.',
      lede: 'Unsere Räume stellt uns die Telekom. Was du gibst, fließt in Maschinen, Werkzeug und Material, die alle nutzen können.',
    },
    {
      blockType: 'prose' as const,
      body: doc([
        h2('Was deine Spende möglich macht'),
        ul([
          'Neue Maschinen und Ersatzteile, zum Beispiel für 3D-Drucker, Laser und Nähmaschinen',
          'Material für offene Workshops und die Offene Tür',
          'Werkzeug für alle, vom Akkuschrauber bis zur Lötstation',
        ]),
      ]) as never,
    },
    {
      blockType: 'donate' as const,
      tag: 'GELDSPENDE',
      heading: 'So kannst du spenden',
      intro:
        'Jeder Betrag hilft. Der MakerSpace Bonn e. V. ist gemeinnützig, deine Spende kannst du von der Steuer absetzen.',
      bank: {
        holder: 'MakerSpace Bonn e.V.',
        bankName: 'Sparkasse KölnBonn',
        iban: 'DE17 3705 0198 1934 0169 55',
        bic: 'COLSDE33XXX',
        reference: 'Spende MakerSpace Bonn',
      },
      paypalUrl: '',
      betterplaceUrl: '',
    },
    { blockType: 'sectionHeading' as const, tag: 'SACHSPENDE', tagColor: 'green' as const, heading: 'Das suchen wir' },
    {
      blockType: 'prose' as const,
      body: doc([
        p(
          t(
            'Gebrauchte Maschinen und Material sind herzlich willkommen, wenn sie funktionieren und in die Werkstatt passen:',
          ),
        ),
        ul([
          'Standbohrmaschine oder Bandsäge',
          'Akku-Werkzeug mit Ladegerät',
          'Lötstationen und Elektronik-Bauteile (Widerstände, Sensoren, Mikrocontroller)',
          'Filament für 3D-Drucker (PLA, PETG), auch angebrochene Rollen',
          'Holz- und Plattenreste (Multiplex, Sperrholz, MDF) ab etwa A4-Größe',
          'Stoffe, Garne und Nähzubehör',
        ]),
        h3('Bitte nicht'),
        ul(['Defekte Elektrogeräte zum Entsorgen', 'Möbel und Sperrmüll', 'Chemikalien, Lacke und Lösungsmittel']),
        p(
          t(
            'Bevor du etwas vorbeibringst, schreib uns kurz an office@makerspacebonn.de, was du hast. Dann sagen wir dir, ob wir es brauchen und wann jemand da ist.',
          ),
        ),
      ]) as never,
    },
  ],
}
