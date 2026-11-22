import path from 'node:path'
import type { Payload } from 'payload'
import { EDITORIAL_SKIP } from '../plugins/editorial/types'
import { convertLayout, vereinIntroToBlocks } from './vereinLayout'

/**
 * The site's hand-authored core content: hero + site globals (menu, footer),
 * the three structural pages (Verein, Werkzeug, Mitmachen), and a couple of
 * editorial sample blog posts + events.
 *
 * Idempotent — media is matched by filename, pages/blog/events are upserted by
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

/** "Die kurze Geschichte" on /verein (text from Falk, 2026-11-20). */
export const VEREIN_TIMELINE = [
  { year: '2017', text: 'Der MakerSpace Bonn e.V. wird als gemeinnütziger Verein gegründet.' },
  {
    year: '2018',
    text: 'Eröffnung am 3. März auf 240 qm im ehemaligen Wählersaal der Telekom, mit großem Andrang. Der General-Anzeiger berichtet.',
  },
  {
    year: '2019',
    text: 'Ein Jahr nach der Eröffnung kommt der General-Anzeiger wieder und beschreibt den MakerSpace als „Ideenschmiede für Tüftler“.',
  },
  {
    year: '2022',
    text: 'Die Teckids stoßen dazu. Mit MakeCityBonn startet ein vom BMBF gefördertes MINT-Cluster, zusammen mit Telekom Stiftung, Stadt Bonn und Fraunhofer IAIS.',
  },
  {
    year: '2022',
    text: 'Der MakerSpace richtet den Projekt-Kickoff aus und betreut das Robotik-Angebot beim futurecamp.digital.',
  },
  {
    year: '2023',
    text: 'Die Stadt Bonn lädt zu IoT-Workshops in den MakerSpace ein. Bei der Digitalfabrik laufen die 3D-Drucker von MakeCity.',
  },
  { year: '2024', text: 'Erster Hackathon für 12- bis 16-Jährige, dazu Plotten beim futurecamp.digital.' },
  {
    year: '2025',
    text: '„Sachen Machen Hackathon“ mit 24 Jugendlichen. Bilanz von MakeCityBonn Phase 1: 237 Workshops, 1.279 Kinder und Jugendliche (41 % Mädchen) und 105 geschulte Fachkräfte.',
  },
  {
    year: 'Heute',
    text: 'Offene Werkstatt mit Workshops, Handarbeitstreff, Gast-Events und Community-Kunst wie „Collective Neurogenesis“.',
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

/**
 * The sections /verein gets after intro, columns and values, in order, by
 * blockType. `run-verein.ts` adds whichever of them an existing database is missing.
 */
export const VEREIN_BLOCKS: { type: string; make: (payload: Payload) => Promise<object> }[] = [
  { type: 'people', make: async () => VEREIN_PEOPLE_BLOCK },
  { type: 'press', make: vereinPressBlock },
]

const UP = path.resolve(process.cwd(), 'uploads')
const day = 24 * 60 * 60 * 1000
const at = (offsetDays: number, hour = 10) => {
  const d = new Date(Date.now() + offsetDays * day)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

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
  return (await payload.create({ collection: 'media', data: { alt }, filePath: path.resolve(UP, file) })).id
}

/**
 * Create a doc if its slug is missing, otherwise update it in place. Seeded
 * published content counts as reviewed: the public frontend only shows docs that
 * are published *and* approved (src/lib/publicData.ts).
 */
const upsertBySlug = async (payload: Payload, collection: 'pages' | 'blog' | 'events', slug: string, data: object) => {
  const approved = '_status' in data && data._status === 'published' ? { ...data, reviewStatus: 'approved' } : data
  const ex = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1 })
  if (ex.totalDocs) return payload.update({ collection, id: ex.docs[0].id, data: approved as never, ...PUB })
  return payload.create({ collection, data: approved as never, ...PUB })
}

export async function seedSiteContent(payload: Payload) {
  // 1 · media
  const werkstattImg = await mediaId(payload, 'hero-werkstatt.jpg', 'Maker bei der Arbeit in der Werkstatt')
  const blogImg = await mediaId(payload, 'hero-blog.jpg', 'CNC-Fräse im Einsatz')
  const eventImg = await mediaId(payload, 'hero-event.jpg', 'Offene Tür in der Werkstatt')

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

  // 3 · blog (newest drives hero face 1)
  await upsertBySlug(payload, 'blog', 'cnc-gezaehmt', {
    title: 'Wie wir die CNC gezähmt haben',
    slug: 'cnc-gezaehmt',
    author: 'Jonas K.',
    readingTime: '6 MIN',
    publishedAt: at(-2),
    subtitle: 'Three weekends, one big cut — a build log.',
    excerpt:
      'Von der ersten Fehlkalibrierung bis zum sauberen Finish: unser Team dokumentiert, wie die Yeti-Smartbench endlich lief — inklusive der Fehler.',
    badge: 'NEU IM BLOG',
    cover: blogImg,
    body: rt([
      'Drei Wochenenden, eine große Fräsung — und jede Menge Lehrgeld. Hier das komplette Logbuch.',
      'Am Anfang stand die Kalibrierung. Oder besser: die Fehlkalibrierung. Der erste Schnitt saß daneben, der zweite auch.',
      'Am Ende lief die Yeti-Smartbench sauber durch. Was wir gelernt haben, steht hier — Fehler inklusive.',
    ]),
    _status: 'published',
  })

  await upsertBySlug(payload, 'blog', 'loeten-einsteiger', {
    title: 'Löten für Einsteiger:innen',
    slug: 'loeten-einsteiger',
    author: 'Mira T.',
    readingTime: '4 MIN',
    publishedAt: at(-9),
    subtitle: 'From cold joints to clean solder.',
    excerpt:
      'Ein kurzer Leitfaden aus unserem Elektronik-Workshop — die häufigsten Anfängerfehler und wie du sie vermeidest.',
    cover: werkstattImg,
    body: rt([
      'Löten sieht schwer aus, ist aber schnell gelernt. Hier die Basics aus unserem Workshop.',
      'Saubere Spitze, richtige Temperatur, genug Flussmittel — der Rest ist Übung.',
    ]),
    _status: 'published',
  })

  // 4 · events (relative to today so "next upcoming" always resolves)
  const events = [
    {
      title: 'Offene Tür — Führung durch die Werkstätten',
      slug: 'offene-tuer',
      off: 2,
      hour: 10,
      timeLabel: 'ab 10',
      category: 'FÜR ALLE · KOSTENLOS',
      tagColor: 'green' as const,
      description:
        'Du willst wissen, was bei uns geht? Komm vorbei, lern uns kennen — kostenlose Führung durch alle sechs Werkstätten. Ab 10:00 Uhr, für alle.',
    },
    {
      title: 'Handarbeitstreff & Makerbrunch',
      slug: 'handarbeitstreff',
      off: 5,
      hour: 10,
      timeLabel: '10–14',
      category: 'HANDARBEIT',
      tagColor: 'orange' as const,
      description: 'Nähen, sticken, stricken, reparieren — plus gemeinsames Brunch. Jede:r bringt was mit.',
    },
    {
      title: 'Spieleabend',
      slug: 'spieleabend',
      off: 15,
      hour: 19,
      timeLabel: '19–21',
      category: 'FÜR ALLE',
      tagColor: 'green' as const,
      description: 'Jeden dritten Dienstag im Monat. Ein paar Spiele sind da — eigene gerne mitbringen.',
    },
    {
      title: 'Schmieden leicht gemacht — 101',
      slug: 'schmieden-101',
      off: 25,
      hour: 14,
      timeLabel: '14:00',
      category: 'WORKSHOP · TICKET',
      tagColor: 'orange' as const,
      description: 'Grundlagen & Schutzmaßnahmen, eigenes Werkstück. 10 € / Ticket.',
    },
    {
      title: 'FrOSCon 2026 — Sankt Augustin',
      slug: 'froscon-2026',
      off: 40,
      hour: 9,
      timeLabel: 'ganztägig',
      category: 'EXTERN',
      tagColor: 'neutral' as const,
      description: 'Wir sind dabei. Die große Open-Source-Konferenz der Region.',
    },
    {
      title: '132. Scrumtisch Bonn',
      slug: 'scrumtisch-132',
      off: -10,
      hour: 19,
      timeLabel: 'ab 19',
      category: 'GAST-EVENT',
      tagColor: 'neutral' as const,
      description: 'Offener Treff rund um Agile, Scrum, Kanban & Co. Get-Together ab 19:00.',
    },
  ]
  for (const e of events) {
    await upsertBySlug(payload, 'events', e.slug, {
      title: e.title,
      slug: e.slug,
      date: at(e.off, e.hour),
      timeLabel: e.timeLabel,
      location: 'Kennedyallee 18',
      category: e.category,
      tagColor: e.tagColor,
      image: eventImg,
      description: e.description,
      _status: 'published',
    })
  }

  // 5 · pages (block layouts)
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
            desc: '3 Lötstationen, Oszilloskope, Labornetzteile, Reflowofen, Breadboards. Hardware: Raspberry Pi, Arduino, Calliope, BOB3.',
          },
          {
            code: 'A2 · METALL',
            title: 'Metallwerkstatt',
            desc: 'Schweißgerät MIG/MAG Puls (AC/DC), Metallbandsäge, Abkantbank, Drehmaschine, Tischfräse.',
          },
          {
            code: 'A3 · HOLZ',
            title: 'Holzwerkstatt',
            desc: 'Formatkreissäge, Kreissäge und leistungsfähige Absauganlage für sauberes Arbeiten.',
          },
          {
            code: 'A4 · TEXTIL',
            title: 'Textil & Handarbeit',
            desc: 'Nähmaschinen, Stickmaschine, Strickmaschine, Folienplotter & Textilveredelung.',
          },
          {
            code: 'A5 · CNC / 3D',
            title: '3D-Druck & CNC',
            desc: '3D-Drucker und Yeti-Smartbench CNC-Fräse für Holz, Acryl u.v.m. Einweisung im CNC-Workshop inklusive.',
          },
          {
            code: 'A6 · DIGITAL',
            title: 'CAD & Digital',
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
