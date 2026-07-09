# MakerSpace Bonn — Payload block template

React/Next + Payload CMS components ported from `MakerSpace Bonn Redesign.dc.html`.
Every section of the design is a Payload **block** (a `config.ts` schema + a
`Component.tsx` renderer). Pages are composed by adding blocks to a `blocks`
layout field.

## File map

```
src/
  blocks/
    index.ts              # msbBlocks[] — register in your Pages collection
    fields.ts             # shared link sub-field
    Hero/                 # 3D prism carousel  (config + 'use client' Component)
    PageIntro/            # eyebrow + big headline + lede (Verein/Tools/Events/Join)
    EventFeed/            # Start "Was läuft" feed + sticky sidebar
    Workshops/            # pegboard, variant preview (3-col) | detailed (2-col)
    CtaBand/              # green "Mach mit" band
    VereinIntro/          # about prose (richText) + history timeline + values
    EventsList/           # Events page list + sidebar
    JoinOptions/          # Mitmachen option cards + location/map
  components/
    RenderBlocks.tsx      # maps block.blockType -> Component
    Header/               # 'use client' sticky nav + mobile hamburger
    Footer/  TopStrip.tsx # site chrome
    Media.tsx  ui.tsx     # upload renderer + shared bits
  styles/globals.css      # fonts, prism 3D CSS, pegboard, mobile fit rules
tailwind.config.ts        # design tokens (colours + font families)
```

> **Heads-up on editor errors:** this repo has no `package.json`, so your IDE
> flags every `react` / `next` / `payload` import as "module not found". That
> clears the moment these files live inside a real Payload+Next project. Nothing
> in the code needs changing.

## 1 · Dependencies

Built for the standard Payload website stack:
`next` (App Router) · `react` 18/19 · `payload` 3 · `@payloadcms/richtext-lexical`
· `tailwindcss`. VereinIntro uses `RichText` from `@payloadcms/richtext-lexical/react`.

## 2 · Tailwind

Point `content` at your source and merge `tailwind.config.ts`'s `colors` /
`fontFamily` extensions. On **Tailwind v4**, mirror those maps into an
`@theme` block in `globals.css` instead of a JS config. Import `globals.css`
once in your root layout.

## 3 · Fonts & assets

`globals.css` pulls the five fonts (Archivo, IBM Plex Sans/Mono, Newsreader,
Caveat) via Google Fonts `@import`. Prefer `next/font`? Load them there and set
the `--font-*` CSS vars the config references.

Move `makerspacebonn_logo.png` and the `uploads/` sketches/photos into `public/`
(the Header/Footer expect `/makerspacebonn_logo.png`).

## 3a · Icons

Use **Font Awesome** for UI icons — the SVG React components, not the webfont
(`<i class="fa-…">`) and not emoji / one-off inline `<svg>`:

```tsx
import { faCalendarPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

<FontAwesomeIcon icon={faCalendarPlus} className="h-3.5 w-3.5" aria-hidden />
```

Import each icon by name so it tree-shakes; size with Tailwind classes. The root
layout already imports `@fortawesome/fontawesome-svg-core/styles.css` once and
sets `config.autoAddCss = false` (prevents the oversized-icon flash) — don't
repeat that per component.

## 4 · Payload wiring

Register the blocks on a `Pages` collection and a `media` upload collection:

```ts
import { msbBlocks } from '@/blocks'

export const Pages: CollectionConfig = {
  slug: 'pages',
  fields: [
    { name: 'title', type: 'text' },
    { name: 'slug', type: 'text', unique: true },
    { name: 'layout', type: 'blocks', blocks: msbBlocks },
  ],
}
// plus a `media` collection with slug 'media' (upload: true) for image/upload fields
```

Then render a page:

```tsx
import { RenderBlocks } from '@/components/RenderBlocks'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TopStrip } from '@/components/TopStrip'

export default async function Page({ params }) {
  const page = await payload.find({ collection: 'pages', where: { slug: { equals: params.slug } }, depth: 2 })
  const doc = page.docs[0]
  return (
    <>
      <TopStrip />
      <Header />
      <RenderBlocks blocks={doc.layout} />
      <Footer />
    </>
  )
}
```

Use `depth: 2` so `upload` fields (Hero photos, map) come back populated.

## Page → block recipe (matches the original design)

- **Start**: `hero` (3 faces) → `eventFeed` → `workshops` (preview) → `ctaBand`
- **Verein**: `pageIntro` → `vereinIntro`
- **Werkzeug**: `pageIntro` → `workshops` (detailed, with footnote)
- **Events**: `pageIntro` → `eventsList`
- **Mitmachen**: `pageIntro` → `joinOptions`

## Notes on the Hero prism

- `'use client'` — ports the original state machine: auto-flip every 5.4 s with
  an anticipation wind-up + overshoot, a rAF-driven countdown bar on the pills,
  hover-to-pause, and the mobile width/height/scale measurement.
- The 3D `preserve-3d` prism renders in **Blink** (Chrome/Edge/Android). WebKit
  flattens `preserve-3d`, so there it degrades to a stacked single face — same
  as the original design.
- Needs **exactly 3 faces** for the carousel; with 1 face it renders static.
