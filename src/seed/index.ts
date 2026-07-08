import { getPayload } from 'payload'
import config from '@payload-config'
import path from 'path'

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

const UP = path.resolve(process.cwd(), 'uploads')
const day = 24 * 60 * 60 * 1000
const at = (offsetDays: number, hour = 10) => {
  const d = new Date(Date.now() + offsetDays * day)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

const seed = async () => {
  const payload = await getPayload({ config })
  payload.logger.info('— Seeding MakerSpace Bonn —')

  // 1 · admin user (create only if none)
  const users = await payload.find({ collection: 'users', limit: 1 })
  if (users.totalDocs === 0) {
    await payload.create({
      collection: 'users',
      data: {
        name: 'Admin',
        email: process.env.PAYLOAD_SEED_EMAIL || 'admin@makerspacebonn.de',
        password: process.env.PAYLOAD_SEED_PASSWORD || 'changeme123',
      },
    })
    payload.logger.info(`admin user: ${process.env.PAYLOAD_SEED_EMAIL || 'admin@makerspacebonn.de'}`)
  }

  // 1b · Falk admin user (idempotent — create only if this email is missing)
  const falk = await payload.find({
    collection: 'users',
    where: { email: { equals: 'falk@kuehnel.eu' } },
    limit: 1,
  })
  if (falk.totalDocs === 0) {
    await payload.create({
      collection: 'users',
      data: { name: 'Falk Kühnel', email: 'falk@kuehnel.eu', password: 'test' },
    })
    payload.logger.info('admin user: falk@kuehnel.eu')
  }

  // wipe content collections so re-running is safe (keeps users)
  for (const collection of ['pages', 'blog', 'events', 'media'] as const) {
    await payload.delete({ collection, where: { id: { exists: true } } })
  }

  // 2 · media
  const media = async (file: string, alt: string) =>
    (await payload.create({ collection: 'media', data: { alt }, filePath: path.resolve(UP, file) })).id
  const werkstattImg = await media('hero-werkstatt.jpg', 'Maker bei der Arbeit in der Werkstatt')
  const blogImg = await media('hero-blog.jpg', 'CNC-Fräse im Einsatz')
  const eventImg = await media('hero-event.jpg', 'Offene Tür in der Werkstatt')

  // 3 · globals
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
        { label: 'Start', url: '/' },
        { label: 'Verein', url: '/verein' },
        { label: 'Werkzeug & Räume', url: '/werkzeug' },
        { label: 'Events', url: '/events' },
        { label: 'Mitmachen', url: '/mitmachen' },
      ],
      headerCta: { label: 'Mitglied werden', url: '/mitmachen' },
      footer: {
        tagline: 'Eine offene Werkstatt für Bonn. Für alle.',
        contact: 'Kennedyallee 18 · 53175 Bonn\nTel: +49 (228) 81 28 69 80',
        links: [
          { label: 'Der Verein', url: '/verein' },
          { label: 'Werkzeug & Räume', url: '/werkzeug' },
          { label: 'Events & Workshops', url: '/events' },
          { label: 'Mitmachen', url: '/mitmachen' },
        ],
      },
    },
  })

  // 4 · blog (newest drives hero face 1)
  await payload.create({
    collection: 'blog',
    data: {
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
      ]) as never,
      _status: 'published',
    },
  })

  await payload.create({
    collection: 'blog',
    data: {
      title: 'Löten für Einsteiger:innen',
      slug: 'loeten-einsteiger',
      author: 'Mira T.',
      readingTime: '4 MIN',
      publishedAt: at(-9),
      subtitle: 'From cold joints to clean solder.',
      excerpt: 'Ein kurzer Leitfaden aus unserem Elektronik-Workshop — die häufigsten Anfängerfehler und wie du sie vermeidest.',
      cover: werkstattImg,
      body: rt([
        'Löten sieht schwer aus, ist aber schnell gelernt. Hier die Basics aus unserem Workshop.',
        'Saubere Spitze, richtige Temperatur, genug Flussmittel — der Rest ist Übung.',
      ]) as never,
      _status: 'published',
    },
  })

  // 5 · events (relative to today so "next upcoming" always resolves)
  const events = [
    { title: 'Offene Tür — Führung durch die Werkstätten', slug: 'offene-tuer', off: 2, hour: 10, timeLabel: 'ab 10', category: 'FÜR ALLE · KOSTENLOS', tagColor: 'green', description: 'Du willst wissen, was bei uns geht? Komm vorbei, lern uns kennen — kostenlose Führung durch alle sechs Werkstätten. Ab 10:00 Uhr, für alle.' },
    { title: 'Handarbeitstreff & Makerbrunch', slug: 'handarbeitstreff', off: 5, hour: 10, timeLabel: '10–14', category: 'HANDARBEIT', tagColor: 'orange', description: 'Nähen, sticken, stricken, reparieren — plus gemeinsames Brunch. Jede:r bringt was mit.' },
    { title: 'Spieleabend', slug: 'spieleabend', off: 15, hour: 19, timeLabel: '19–21', category: 'FÜR ALLE', tagColor: 'green', description: 'Jeden dritten Dienstag im Monat. Ein paar Spiele sind da — eigene gerne mitbringen.' },
    { title: 'Schmieden leicht gemacht — 101', slug: 'schmieden-101', off: 25, hour: 14, timeLabel: '14:00', category: 'WORKSHOP · TICKET', tagColor: 'orange', description: 'Grundlagen & Schutzmaßnahmen, eigenes Werkstück. 10 € / Ticket.' },
    { title: 'FrOSCon 2026 — Sankt Augustin', slug: 'froscon-2026', off: 40, hour: 9, timeLabel: 'ganztägig', category: 'EXTERN', tagColor: 'neutral', description: 'Wir sind dabei. Die große Open-Source-Konferenz der Region.' },
    { title: '132. Scrumtisch Bonn', slug: 'scrumtisch-132', off: -10, hour: 19, timeLabel: 'ab 19', category: 'GAST-EVENT', tagColor: 'neutral', description: 'Offener Treff rund um Agile, Scrum, Kanban & Co. Get-Together ab 19:00.' },
  ]
  for (const e of events) {
    await payload.create({
      collection: 'events',
      data: {
        title: e.title,
        slug: e.slug,
        date: at(e.off, e.hour),
        timeLabel: e.timeLabel,
        location: 'Kennedyallee 18',
        category: e.category,
        tagColor: e.tagColor as 'green' | 'orange' | 'neutral',
        image: eventImg,
        description: e.description,
        _status: 'published',
      },
    })
  }

  // 6 · pages (block layouts)
  await payload.create({
    collection: 'pages',
    data: {
      title: 'Der Verein',
      slug: 'verein',
      _status: 'published',
      layout: [
        {
          blockType: 'pageIntro',
          tag: 'DER VEREIN',
          tagColor: 'green',
          meta: 'seit 03.03.2018 · gemeinnützig',
          headline: 'Eine offene Werkstatt für Bonn. Für alle.',
          lede: 'An open workshop where a curious community creates, gets inspired and learns from one another.',
        },
        {
          blockType: 'vereinIntro',
          body: rt([
            'Bei uns findet eine Community von engagierten, neugierigen Menschen zusammen, die kreativ Neues erschaffen. Wenn wir geöffnet haben, kann jede:r kommen und am eigenen Projekt arbeiten.',
            'Brauchst du Hilfe, unterstützen wir gern mit Rat und Denkanstößen — nach dem Motto Hilfe zur Selbsthilfe. Am meisten freuen wir uns, wenn du dein Wissen weitergibst.',
          ]) as never,
          quote:
            '„Bonn hat mit uns eine offene Werkstatt, in der Menschen kreativ und neugierig Neues erschaffen — und voneinander lernen."',
          timelineTitle: 'DIE KURZE GESCHICHTE',
          timeline: [
            { year: '2018', text: 'Vereinsgründung, Gemeinnützigkeit & Eröffnung am 3. März — mit vielen Gästen.' },
            { year: '2019', text: 'Öffnungszeiten ausgeweitet, Kernteam wächst, erste Workshop-Reihen.' },
            { year: 'heute', text: '6 Werkstätten, über 40 Maschinen, regelmäßige offene Türen & Kurse.' },
          ],
          values: [
            { title: 'Für alle', text: 'Anfänger:innen bis Profis, jung bis alt — jede:r ist willkommen.' },
            { title: 'Hilfe zur Selbsthilfe', text: 'Wir helfen ein Stück weiter — bauen tust du selbst.' },
            { title: 'Wissen teilen', text: 'Workshops, Themenabende & gegenseitiges Lernen.' },
          ],
        },
      ],
    },
  })

  await payload.create({
    collection: 'pages',
    data: {
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
            { code: 'A1 · ELEKTRONIK', title: 'Elektronik & Löten', desc: '3 Lötstationen, Oszilloskope, Labornetzteile, Reflowofen, Breadboards. Hardware: Raspberry Pi, Arduino, Calliope, BOB3.' },
            { code: 'A2 · METALL', title: 'Metallwerkstatt', desc: 'Schweißgerät MIG/MAG Puls (AC/DC), Metallbandsäge, Abkantbank, Drehmaschine, Tischfräse.' },
            { code: 'A3 · HOLZ', title: 'Holzwerkstatt', desc: 'Formatkreissäge, Kreissäge und leistungsfähige Absauganlage für sauberes Arbeiten.' },
            { code: 'A4 · TEXTIL', title: 'Textil & Handarbeit', desc: 'Nähmaschinen, Stickmaschine, Strickmaschine, Folienplotter & Textilveredelung.' },
            { code: 'A5 · CNC / 3D', title: '3D-Druck & CNC', desc: '3D-Drucker und Yeti-Smartbench CNC-Fräse für Holz, Acryl u.v.m. Einweisung im CNC-Workshop inklusive.' },
            { code: 'A6 · DIGITAL', title: 'CAD & Digital', desc: 'Konstruieren mit FreeCAD, Fusion 360 & EstlCAM — regelmäßige Einführungs-Workshops.' },
          ],
        },
      ],
    },
  })

  await payload.create({
    collection: 'pages',
    data: {
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
            { number: '01', eyebrow: 'AKTIV', tint: 'green', title: 'Mitglied werden', text: 'Nutze Werkstatt & Maschinen zu allen Öffnungszeiten, arbeite an eigenen Projekten und bring dich in die Community ein.', link: { label: 'Antrag stellen →', url: '#' } },
            { number: '02', eyebrow: 'FÖRDERN', tint: 'light', title: 'Fördermitglied', text: 'Du willst uns unterstützen, ohne selbst zu basteln? Als Fördermitglied hältst du den MakerSpace am Laufen.', link: { label: 'Fördern →', url: '#' } },
            { number: '03', eyebrow: 'SPENDEN', tint: 'light', title: 'Geld- & Sachspende', text: 'Über Geld- und Sachspenden freuen wir uns immer. Ab 100 € gern auch gegen Spendenquittung.', link: { label: 'Spenden →', url: '#' } },
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
    },
  })

  payload.logger.info('✓ Seed complete.')
}

// top-level await so `payload run` waits for the async work to finish
try {
  await seed()
  process.exit(0)
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
}
