import path from 'node:path'
import type { Payload } from 'payload'
import { EDITORIAL_SKIP } from '../plugins/editorial/types'
import { convertLayout, vereinIntroToBlocks } from './vereinLayout'

/**
 * The site's hand-authored core content: hero + site globals (menu, footer),
 * and the three structural pages (Verein, Werkzeug, Mitmachen). No blog posts or
 * events: those are the real migrated "Aktuelles" articles (upsertLegacyArticles);
 * the made-up samples were removed on 2026-11-22.
 *
 * Idempotent — media is matched by filename, pages are upserted by
 * slug, and globals are naturally single-value. Safe to call against a populated
 * DB (it updates in place), but callers that must not clobber editor changes
 * should guard on an empty DB first (see prod.ts). Legal pages and the migrated
 * "Aktuelles" articles are seeded separately via upsertLegalPages() and
 * upsertLegacyArticles().
 *
 * Reads its images from uploads/ (bundled into the runtime image), so the media
 * files land on the `media` volume on the first production boot.
 */

// Seed content bypasses the editorial publish gate so `_status: 'published'`
// stays published instead of being routed into review.
const PUB = { context: { [EDITORIAL_SKIP]: true } } as const

/** "Die kurze Geschichte" on /verein (text from Falk, 2026-11-20; one line per entry since 2026-11-22). */
export const VEREIN_TIMELINE = [
  { year: '2017', text: 'Der MakerSpace Bonn e.V. wird als gemeinnütziger Verein gegründet.' },
  { year: '2018', text: 'Eröffnung am 3. März auf 240 qm im ehemaligen Wählersaal der Telekom.' },
  { year: '2019', text: 'Der General-Anzeiger nennt den MakerSpace eine „Ideenschmiede für Tüftler“.' },
  {
    year: '2022',
    text: 'Die Teckids stoßen dazu, und mit MakeCityBonn startet ein vom BMBF gefördertes MINT-Cluster.',
  },
  { year: '2023', text: 'Die Stadt Bonn lädt zu IoT-Workshops in den MakerSpace ein.' },
  { year: '2024', text: 'Erster Hackathon für 12- bis 16-Jährige, dazu Plotten beim futurecamp.digital.' },
  { year: '2025', text: 'Bilanz von MakeCityBonn Phase 1: 237 Workshops mit 1.279 Kindern und Jugendlichen.' },
  {
    year: 'Heute',
    text: 'Offene Werkstatt mit Workshops, Handarbeitstreff, Gast-Events und Community-Kunst.',
  },
]

/** "Menschen & Ansprechpartner" on /verein (S3.1, from Falk 2026-11-22). Names as
 *  in the Impressum (Vorstand nach § 26 BGB, src/seed/impressum.ts). */
export const VEREIN_PEOPLE_BLOCK = {
  blockType: 'people' as const,
  tag: 'VEREIN',
  heading: 'Menschen & Ansprechpartner',
  people: [
    { name: 'Salim Deeb', role: 'Vorstand', email: 'vorstand@makerspacebonn.de' },
    { name: 'Jan Benzenberg', role: 'Vorstand', email: 'vorstand@makerspacebonn.de' },
  ],
}

/** The press release PDF, rescued from the old site (it lived under makerspacebonn.de/images/, which the new site replaces). */
export const PRESS_RELEASE_2018 = 'pressemitteilung-2018-02-13-eroeffnung.pdf'

/**
 * "Wir in den Medien" on /verein (S3.4; items from the old site's press page,
 * 2026-11-22). Async: it puts the press release PDF into the media library first.
 */
export async function vereinPressBlock(payload: Payload) {
  const pressRelease = await mediaId(
    payload,
    PRESS_RELEASE_2018,
    'Pressemitteilung des MakerSpace Bonn e.V. zur Eröffnung, 13.02.2018',
  )
  return {
    blockType: 'press' as const,
    tag: 'PRESSE',
    heading: 'Wir in den Medien',
    items: [
      {
        outlet: 'General-Anzeiger Bonn',
        date: '2021-02-04T12:00:00.000Z',
        title: 'Die kreativen Macher kommen gut durch die Krise',
        url: 'https://ga.de/bonn/bad-godesberg/verein-makerspace-in-bonn-kommt-gut-durch-die-pandemie_aid-56053561',
      },
      {
        outlet: 'General-Anzeiger Bonn',
        date: '2019-02-04T12:00:00.000Z',
        title: 'MakerSpace-Treffpunkt ist eine Ideenschmiede für Tüftler',
        url: 'https://ga.de/bonn/bad-godesberg/makerspace-treffpunkt-ist-eine-ideenschmiede-fuer-tueftler_aid-44014351',
      },
      {
        outlet: 'General-Anzeiger Bonn',
        date: '2018-03-05T12:00:00.000Z',
        title: 'Eröffnung der Makerspace-Werkstatt-Etage in Bad Godesberg',
        url: 'https://ga.de/bonn/bad-godesberg/eroeffnung-der-makerspace-werkstatt-etage-in-bad-godesberg_aid-43679923',
      },
      {
        outlet: 'MakerSpace Bonn e.V.',
        date: '2018-02-13T12:00:00.000Z',
        title: 'Pressemitteilung zur Eröffnung am 3. März 2018',
        document: pressRelease,
      },
    ],
    // Press address from Falk, 2026-11-22.
    contactEmail: 'presse@makerspacebonn.de',
  }
}

/** The one Satzung document: /verein lists it and the Impressum links to
 *  /api/media/file/satzung.pdf. Keep the filename when swapping the PDF in the
 *  admin (replace the file of this media doc) so both keep working. */
export const SATZUNG_FILENAME = 'satzung.pdf'

/**
 * "Satzung & Ordnungen" on /verein (S3.3). The PDFs are the old site's
 * (makerspacebonn.de/images/MSB-Files/, fetched 2026-11-22) until the Vorstand
 * sends current ones; the Gemeinnützigkeit proof was never online, an editor
 * adds it in the CMS. This is the only seed of the Satzung (SATZUNG_FILENAME),
 * the same media doc the Impressum links to.
 * Versions: Satzung from the PDF's creation date, Hausordnung from the old
 * site's upload date (the PDF states none), Beitragsordnung from its text.
 */
export async function vereinDocumentsBlock(payload: Payload) {
  const doc = (file: string, alt: string) => mediaId(payload, file, alt)
  return {
    blockType: 'documents' as const,
    tag: 'DOKUMENTE',
    heading: 'Satzung & Ordnungen',
    items: [
      {
        title: 'Satzung',
        version: 'Stand: Oktober 2017',
        document: await doc(SATZUNG_FILENAME, 'Satzung des MakerSpace Bonn e. V.'),
      },
      {
        title: 'Hausordnung',
        version: 'Stand: August 2020',
        document: await doc('hausordnung.pdf', 'Hausordnung des MakerSpace Bonn e. V.'),
      },
      {
        title: 'Beitragsordnung',
        version: 'beschlossen am 17.06.2023',
        document: await doc('beitragsordnung.pdf', 'Beitragsordnung des MakerSpace Bonn e. V.'),
      },
    ],
  }
}

/**
 * "Unsere Förderer" on /verein (S3.2). Current: Deutsche Telekom, which has provided
 * the space since the opening in 2018 (Falk 2026-11-22). Former: the old site's sponsor list (2020);
 * Conrad's Bonn store has closed, so it links to the company. Logos from
 * Wikimedia Commons (viewBox added so they scale); the Bonner Spendenparlament
 * has no usable logo file, so its name stands in.
 */
export async function vereinSupportersBlock(payload: Payload) {
  const logo = (file: string, name: string) => mediaId(payload, file, `Logo ${name}`)
  return {
    blockType: 'supporters' as const,
    tag: 'DANKE',
    heading: 'Unsere Förderer',
    formerHeading: 'Frühere Förderer',
    supporters: [
      {
        name: 'Deutsche Telekom',
        url: 'https://www.telekom.com/de',
        description:
          'Die Deutsche Telekom stellt uns unsere Werkstatt-Räume zur Verfügung – den ehemaligen Wählersaal in Bad Godesberg – und das seit dem Start des MakerSpace im März 2018. Ohne sie gäbe es den MakerSpace Bonn nicht.',
        logo: await logo('logo-telekom.svg', 'Deutsche Telekom'),
        current: true,
      },
      {
        name: 'Deutsche Telekom Stiftung',
        url: 'https://www.telekom-stiftung.de/',
        logo: await logo('logo-telekom-stiftung.svg', 'Deutsche Telekom Stiftung'),
        current: false,
      },
      { name: 'Bonner Spendenparlament', url: 'https://www.bonner-spendenparlament.de/', current: false },
      {
        name: 'Conrad Electronic',
        url: 'https://www.conrad.de/',
        logo: await logo('logo-conrad.svg', 'Conrad Electronic'),
        current: false,
      },
      {
        name: 'Stadt Bonn',
        url: 'https://www.bonn.de/',
        logo: await logo('logo-stadt-bonn.svg', 'Stadt Bonn'),
        current: false,
      },
    ],
  }
}

/**
 * The sections /verein gets after intro, columns and values, in order, by
 * blockType. `run-verein.ts` adds whichever of them an existing database is missing.
 */
export const VEREIN_BLOCKS: { type: string; make: (payload: Payload) => Promise<object> }[] = [
  { type: 'people', make: async () => VEREIN_PEOPLE_BLOCK },
  { type: 'press', make: vereinPressBlock },
  { type: 'documents', make: vereinDocumentsBlock },
  { type: 'supporters', make: vereinSupportersBlock },
]

const UP = path.resolve(process.cwd(), 'uploads')
/** Minimal Lexical richText from plain paragraphs. */
const rt = (paragraphs: string[]) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      textFormat: 0,
      children: [{ type: 'text', text, format: 0, style: '', mode: 'normal', detail: 0, version: 1 }],
    })),
  },
})

/** Ensure an image from uploads/ exists in the media library (idempotent by filename). */
const mediaId = async (payload: Payload, file: string, alt: string) => {
  const ex = await payload.find({ collection: 'media', where: { filename: { equals: file } }, limit: 1 })
  if (ex.totalDocs) return ex.docs[0].id
  // overwriteExistingFiles: a leftover file of the same name would otherwise make
  // Payload rename the upload, and the filename lookup would never match again.
  return (
    await payload.create({
      collection: 'media',
      data: { alt },
      filePath: path.resolve(UP, file),
      overwriteExistingFiles: true,
    })
  ).id
}

/**
 * Create a doc if its slug is missing, otherwise update it in place. Seeded
 * published content counts as reviewed: the public frontend only shows docs that
 * are published *and* approved (src/lib/publicData.ts).
 */
const upsertBySlug = async (payload: Payload, collection: 'pages', slug: string, data: object) => {
  const approved = '_status' in data && data._status === 'published' ? { ...data, reviewStatus: 'approved' } : data
  const ex = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1 })
  if (ex.totalDocs) return payload.update({ collection, id: ex.docs[0].id, data: approved as never, ...PUB })
  return payload.create({ collection, data: approved as never, ...PUB })
}

export async function seedSiteContent(payload: Payload) {
  // 1 · media
  const werkstattImg = await mediaId(payload, 'hero-werkstatt.jpg', 'Maker bei der Arbeit in der Werkstatt')

  // 2 · globals (hero drives the front-page hero; site settings drive nav + footer)
  await payload.updateGlobal({
    slug: 'heroSettings',
    data: {
      badge: 'SEIT 2018',
      note: 'Hilfe zur Selbsthilfe ✦',
      eyebrow: '◆ OFFENE WERKSTATT · BONN',
      pillLabel: 'WERKSTATT',
      accent: 'green',
      cornerLabel: '45°',
      headline: 'Bau, was du dir\nvorstellst.',
      lede: 'A place to make things — for everyone in Bonn.',
      description:
        'Löten, schweißen, fräsen, nähen, 3D-drucken. Sechs Werkstätten, über 40 Maschinen und eine Community, die mit anpackt.',
      primaryStyle: 'white',
      primary: { label: 'Offene Tür besuchen →', url: '/events' },
      secondary: { label: 'Werkstätten ansehen', url: '/werkzeug' },
      image: werkstattImg,
      imagePlaceholder: 'Foto: Maker bei der Arbeit',
      caption: 'Werkstatt · Kennedyallee 18',
    },
  })

  await payload.updateGlobal({
    slug: 'siteSettings',
    data: {
      topStrip: {
        status: '● GEÖFFNET · HEUTE 18:00–21:00 UHR',
        address: 'Kennedyallee 18 · 53175 Bonn · Tel 0228 81286980',
      },
      nav: [
        { label: 'Verein', url: '/verein' },
        { label: 'Werkzeug & Räume', url: '/werkzeug' },
        { label: 'Events', url: '/events' },
        { label: 'Blog', url: '/blog' },
        { label: 'Mitmachen', url: '/mitmachen' },
      ],
      headerCta: { label: 'Mitglied werden', url: '/mitmachen' },
      footer: {
        tagline: 'Eine offene Werkstatt für Bonn. Für alle.',
        phone: '+49 228 81 28 69 80',
        email: 'office@makerspacebonn.de',
        social: [
          { platform: 'discord', url: 'https://discord.gg/example' },
          { platform: 'github', url: 'https://github.com/makerspacebonn' },
          { platform: 'instagram', url: 'https://www.instagram.com/makerspacebonn' },
        ],
        links: [
          { label: 'Der Verein', url: '/verein' },
          { label: 'Werkzeug & Räume', url: '/werkzeug' },
          { label: 'Events & Workshops', url: '/events' },
          { label: 'Blog', url: '/blog' },
          { label: 'Mitmachen', url: '/mitmachen' },
        ],
      },
    },
  })

  // 3 · pages (block layouts)
  await upsertBySlug(payload, 'pages', 'verein', {
    title: 'Der Verein',
    slug: 'verein',
    _status: 'published',
    // convertLayout: same final shape as converted pages (Menschen in the left column).
    layout: convertLayout([
      {
        blockType: 'pageIntro',
        tag: 'DER VEREIN',
        tagColor: 'green',
        meta: 'seit 03.03.2018 · gemeinnützig',
        headline: 'Eine offene Werkstatt für Bonn. Für alle.',
        lede: 'An open workshop where a curious community creates, gets inspired and learns from one another.',
      },
      ...vereinIntroToBlocks({
        body: rt([
          'Bei uns findet eine Community von engagierten, neugierigen Menschen zusammen, die kreativ Neues erschaffen. Wenn wir geöffnet haben, kann jede:r kommen und am eigenen Projekt arbeiten.',
          'Brauchst du Hilfe, unterstützen wir gern mit Rat und Denkanstößen — nach dem Motto Hilfe zur Selbsthilfe. Am meisten freuen wir uns, wenn du dein Wissen weitergibst.',
        ]),
        quote:
          '„Bonn hat mit uns eine offene Werkstatt, in der Menschen kreativ und neugierig Neues erschaffen — und voneinander lernen."',
        timelineTitle: 'DIE KURZE GESCHICHTE',
        timeline: VEREIN_TIMELINE,
        values: [
          { title: 'Für alle', text: 'Anfänger:innen bis Profis, jung bis alt — jede:r ist willkommen.' },
          { title: 'Hilfe zur Selbsthilfe', text: 'Wir helfen ein Stück weiter — bauen tust du selbst.' },
          { title: 'Wissen teilen', text: 'Workshops, Themenabende & gegenseitiges Lernen.' },
        ],
      }),
      VEREIN_PEOPLE_BLOCK,
      await vereinPressBlock(payload),
      await vereinDocumentsBlock(payload),
      await vereinSupportersBlock(payload),
    ]).layout,
  })

  await upsertBySlug(payload, 'pages', 'werkzeug', {
    title: 'Werkzeug & Räume',
    slug: 'werkzeug',
    _status: 'published',
    layout: [
      {
        blockType: 'pageIntro',
        tag: 'AUSSTATTUNG',
        tagColor: 'orange',
        meta: '6 Werkstätten · 40+ Maschinen',
        headline: 'Werkzeug & Räume',
        lede: "Everything you need to build — you may use all tools once you've been briefed.",
      },
      {
        blockType: 'workshops',
        variant: 'detailed',
        footnote: '⚠ Maschinen dürfen nach einer Einweisung selbstständig genutzt werden. Sicherheit geht vor.',
        items: [
          {
            code: 'A1 · ELEKTRONIK',
            title: 'Elektronik & Löten',
            verbs: 'Löten, messen, reparieren',
            icon: 'loetkolben',
            desc: '3 Lötstationen, Oszilloskope, Labornetzteile, Reflowofen, Breadboards. Hardware: Raspberry Pi, Arduino, Calliope, BOB3.',
          },
          {
            code: 'A2 · METALL',
            title: 'Metallwerkstatt',
            verbs: 'Schweißen, drehen, biegen',
            icon: 'schluessel',
            desc: 'Schweißgerät MIG/MAG Puls (AC/DC), Metallbandsäge, Abkantbank, Drehmaschine, Tischfräse.',
          },
          {
            code: 'A3 · HOLZ',
            title: 'Holzwerkstatt',
            verbs: 'Zuschneiden, Möbel bauen',
            icon: 'saege',
            desc: 'Formatkreissäge, Kreissäge und leistungsfähige Absauganlage für sauberes Arbeiten.',
          },
          {
            code: 'A4 · TEXTIL',
            title: 'Textil & Handarbeit',
            verbs: 'Nähen, sticken, plotten',
            icon: 'schere',
            desc: 'Nähmaschinen, Stickmaschine, Strickmaschine, Folienplotter & Textilveredelung.',
          },
          {
            code: 'A5 · CNC / 3D',
            title: '3D-Druck & CNC',
            verbs: 'Drucken und fräsen nach eigener Datei',
            icon: 'spule',
            desc: '3D-Drucker und Yeti-Smartbench CNC-Fräse für Holz, Acryl u.v.m. Einweisung im CNC-Workshop inklusive.',
          },
          {
            code: 'A6 · DIGITAL',
            title: 'CAD & Digital',
            verbs: 'Konstruieren, bevor es an die Maschine geht',
            icon: 'geodreieck',
            desc: 'Konstruieren mit FreeCAD, Fusion 360 & EstlCAM — regelmäßige Einführungs-Workshops.',
          },
        ],
      },
    ],
  })

  await upsertBySlug(payload, 'pages', 'mitmachen', {
    title: 'Mitmachen',
    slug: 'mitmachen',
    _status: 'published',
    layout: [
      {
        blockType: 'pageIntro',
        tag: 'MITMACHEN',
        tagColor: 'orange',
        meta: 'Mitglied · Fördern · Spenden',
        headline: 'Mach mit. Bau mit.',
        lede: 'Join us, support us as a sustaining member, or donate — every bit helps.',
      },
      {
        blockType: 'joinOptions',
        options: [
          {
            number: '01',
            eyebrow: 'AKTIV',
            tint: 'green',
            title: 'Mitglied werden',
            text: 'Nutze Werkstatt & Maschinen zu allen Öffnungszeiten, arbeite an eigenen Projekten und bring dich in die Community ein.',
            link: { label: 'Antrag stellen →', url: '#' },
          },
          {
            number: '02',
            eyebrow: 'FÖRDERN',
            tint: 'light',
            title: 'Fördermitglied',
            text: 'Du willst uns unterstützen, ohne selbst zu basteln? Als Fördermitglied hältst du den MakerSpace am Laufen.',
            link: { label: 'Fördern →', url: '#' },
          },
          {
            number: '03',
            eyebrow: 'SPENDEN',
            tint: 'light',
            title: 'Geld- & Sachspende',
            text: 'Über Geld- und Sachspenden freuen wir uns immer. Ab 100 € gern auch gegen Spendenquittung.',
            link: { label: 'Spenden →', url: '#' },
          },
        ],
        location: {
          eyebrow: 'SO FINDEST DU UNS',
          title: 'Kennedyallee 18',
          line: '53175 Bonn · Tel +49 (228) 81 28 69 80',
          transit: 'Linie 16 / 63 → Hochkreuz / Deutsches Museum\nLinie 610 / 611 → Kennedyallee',
          mapPlaceholder: 'Karte / Foto vom Eingang',
        },
      },
    ],
  })

  payload.logger.info('✓ site content seeded (globals, pages, blog, events, media)')
}
