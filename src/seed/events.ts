import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * Seeds 200 events spread evenly across roughly one year in the past to one year
 * in the future. Idempotent: re-running first removes previously auto-seeded
 * events (slug prefix `auto-`), so the hand-made events are left untouched.
 *
 *   pnpm payload run src/seed/events.ts
 */
const N = 200

const TITLES = [
  'Offene Werkstatt',
  '3D-Druck-Sprechstunde',
  'Lötworkshop',
  'Nähcafé',
  'Repair Café',
  'CNC-Einführung',
  'Lasercutter-Basics',
  'Elektronik-Stammtisch',
  'Holzwerkstatt offen',
  'Schmiede-Schnupperkurs',
  'Siebdruck-Abend',
  'Makerbrunch',
  'Spieleabend',
  'Vortrag: Open Source',
  'Kids Coding',
  'Textilwerkstatt',
  'Keramik & Ton',
  'Foto-Workshop',
]

const CATS = [
  { category: 'FÜR ALLE · KOSTENLOS', tagColor: 'green' as const },
  { category: 'WORKSHOP · ANMELDUNG', tagColor: 'orange' as const },
  { category: 'MITGLIEDER', tagColor: 'neutral' as const },
]

const TIMES = ['ab 10', '18–21', '14–17', 'ab 19', '10–16']

const run = async () => {
  const payload = await getPayload({ config })

  // idempotency: drop any previous auto-seeded events
  const del = await payload.delete({ collection: 'events', where: { slug: { like: 'auto-' } } })
  payload.logger.info(`removed ${Array.isArray(del.docs) ? del.docs.length : 0} previous auto-events`)

  const day = 24 * 60 * 60 * 1000
  const start = Date.now() - 365 * day
  const stepDays = 730 / N // even spread across ~2 years

  for (let i = 0; i < N; i++) {
    const d = new Date(start + Math.round(i * stepDays * day))
    d.setHours(9 + (i % 10), (i % 2) * 30, 0, 0)
    const cat = CATS[i % CATS.length]
    const title = TITLES[i % TITLES.length]

    await payload.create({
      collection: 'events',
      data: {
        title: `${title} #${i + 1}`,
        slug: `auto-${i + 1}`,
        date: d.toISOString(),
        timeLabel: TIMES[i % TIMES.length],
        location: 'Kennedyallee 18',
        category: cat.category,
        tagColor: cat.tagColor,
        image: (i % 3) + 1, // cycle the seeded media (ids 1–3)
        description: 'Automatisch generierter Beispieltermin für die Events-Übersicht (Liste, Kalender & Kacheln).',
        _status: 'published',
      },
    })

    if ((i + 1) % 50 === 0) payload.logger.info(`seeded ${i + 1}/${N}`)
  }

  payload.logger.info(`✓ ${N} events seeded (past + future).`)
}

// top-level await so `payload run` waits for the async work to finish
try {
  await run()
  process.exit(0)
} catch (err) {
  console.error(err)
  process.exit(1)
}
