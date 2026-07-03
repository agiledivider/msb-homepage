# MakerSpace Bonn Homepage — Development Learnings

Hard-won notes from building the animated hero, generated assets, and the mobile-friendly
pass on `MakerSpace Bonn Redesign.dc.html`. Read this before touching the hero, the inline-style
layout, or the asset pipeline — several things here are non-obvious and cost real time to discover.

---

## 1. The "DC" component framework

The page is **not** a plain HTML file. It's a single Design Component:

- `MakerSpace Bonn Redesign.dc.html` — the editable **source**. Contains one `<x-dc>` block,
  a `<helmet>` (head injection), and a `<script type="text/x-dc" data-dc-script>` with a
  `class Component extends DCLogic`.
- `support.js` — the framework runtime. **React-based under the hood** (`h()`, `React.Component`,
  lifecycle methods). It parses the `<x-dc>` markup, resolves `{{ … }}` placeholders against
  `Component.renderVals()`, handles `<sc-if>`, and re-renders on `setState`.
- `image-slot.js` — the `<image-slot>` custom element.
- `MakerSpace Bonn Redesign (standalone).html` — a large pre-bundled/rendered artifact. **Don't
  hand-edit it**; edit the `.dc.html` source.

### Framework mechanics that matter
- **State + lifecycle** work like React: `this.state`, `this.setState({…})`, `componentWillUnmount()`.
  `renderVals()` returns the flat object the template renders against (merged over props).
- `{{ name }}` placeholders are substituted inside attribute values too (e.g. `style="color: {{ c }}"`,
  `class="msb-face {{ showN }}"`). Handlers are passed as functions: `onClick="{{ goStart }}"`.
- `<sc-if value="{{ flag }}">` conditionally renders a subtree; the five "pages" (start/verein/
  tools/events/join) are `sc-if` blocks toggled by `state.page`, **not** separate documents.
- Starting a timer: do it lazily in `renderVals()` guarded by a flag, and/or `componentDidMount`.
  Clear it in `componentWillUnmount`. (We arm the hero auto-flip this way.)

### ⚠️ The single biggest gotcha: React re-serialises inline styles
Because rendering goes through React's `h()` with a style **object**, every inline `style`
attribute in the live DOM is **reformatted**, not preserved verbatim:

| Authored in source            | What's in the live DOM            |
|-------------------------------|-----------------------------------|
| `grid-template-columns:1fr 340px` | `grid-template-columns: 1fr 340px` (space after colon) |
| `repeat(3,1fr)`               | `repeat(3, 1fr)` (space after comma too) |
| `padding:16px 32px`           | `padding: 16px 32px`              |

**Consequence:** any CSS `[style*="…"]` attribute-substring selector must match the **normalised**
form, or (better) match on a stable *value token* that survives reformatting (`340px`, `repeat(3`,
`1.15fr`). We learned this the hard way — the first responsive attempt silently didn't collapse the
grids because the selectors assumed the authored (no-space) form.

Bonus: setting `grid-template-columns` on an element that turns out **not** to be a grid is a
harmless no-op, so broad value-token matches are safe.

---

## 2. Overriding inline styles (the responsive strategy)

The whole design uses **inline styles**. A media query in a stylesheet normally *loses* to an
inline style — **except** an author `!important` declaration beats a non-important inline style.
So the entire mobile layout is built as `@media` blocks full of `!important` overrides:

- Element selectors where possible: `main{…!important}`, `aside{…!important}`, `h1{…!important}`.
- Value-token attribute selectors for the inline grids:
  `[style*="1fr 340px"], [style*="repeat(3", [style*="1.15fr"] { grid-template-columns:1fr!important }`.
- Classes added to the few elements that need precise targeting (`.msb-addr`, `.msb-desc`,
  `.msb-cta`, `.msb-nav`, `.msb-burger`, `.msb-headcta`, `.msb-menu-cta`).

Breakpoints: **≤900px** (full mobile layout) and **≤560px** (tighten event rows / paddings).

---

## 3. The hero — 3D triangular-prism flip (desktop)

The green cutting-mat hero is one face of a **rotating triangular prism** with three faces
(Werkstatt `01`, Blog `02`, Event `03`). Auto-advances every 5.4 s; manual pills below; pauses on
hover. Design decisions the user explicitly asked for (don't undo without asking):

- Prefers the **prism** over a flat hinge/coin flip ("the 3d triangle thingy").
- Tilt leans a specific way: `rotateX(4.5deg) rotateY(8deg)` (positive Y).
- The flip needs **anticipation** (a small wind-up the opposite way — "Anlauf") then an **ease-out
  overshoot** on landing, and a deliberately **long** duration (~1.5 s main phase). Implemented as a
  two-stage `setState` in `doFlip()`.

### 3D rendering gotchas (each one cost time)
1. **One `preserve-3d` level only.** The tilt and the carousel spin must live on the *same*
   element (`.msb-flip`). Nesting two `preserve-3d` elements (a separate `.msb-tilt` wrapper around
   `.msb-flip`) breaks `backface-visibility` culling → the rear faces show through **mirrored**.
2. **`will-change: transform` breaks backface culling** in WebKit — removed it.
3. **Absolutely-positioned prism flattened in WKWebView.** Making `.msb-flip`
   `position: relative; width/height:100%` (with the scene at a fixed `height`) instead of
   `position:absolute; inset:0` fixed the flattening.
4. **Transitions don't interpolate a transform driven by a CSS variable in WebKit.** We first drove
   the spin via `rotateY(var(--spin))`; the angle **snapped** instead of animating. Fix: build the
   **full transform as a literal string** in `renderVals` (`flipTf`) and set it inline, so
   `transition: transform` interpolates a real value change. (`--tz` for the prism apothem can stay
   a variable — it isn't animated.)
5. **Prism apothem** (distance to pull the prism back so the front face sits on z=0):
   `tz = sceneWidth / (2·tan60°) = sceneWidth × 0.2887`. Measured from the scene width and fed in as
   `--tz`; faces are `rotateY(k·120deg) translateZ(var(--tz))`, and the prism is pulled back by
   `translateZ(calc(var(--tz) × -1))`.

### ⚠️ WebKit flattens this prism at small sizes
Verified in cmux's WKWebView: the prism renders correctly in **Chrome/Blink**, but flattens (all
three faces overlap, mirrored) in WebKit — which means **iOS Safari would break it too**. This is
why the mobile hero uses a completely different mechanism (below). A simple 2-face card culls fine
in the same WebKit; it's specifically the 3-face + `translateZ` prism that WebKit won't sort.

---

## 4. The hero on mobile (≤900px) — a WebKit-safe flip

Because the prism flattens in WebKit, mobile does **not** use it. Instead:

- **Show one face at a time**: `.msb-face{display:none}` / `.msb-face.msb-show{display:block}`,
  where `showN` in `renderVals` marks the current face.
- **Flip it in** with a CSS `@keyframes msb-flipin` (`rotateY(-90deg → 0)` + overshoot). Staying
  within ±90° means the face is **never** turned past edge-on, so it's never mirrored — safe in
  every engine. The animation replays automatically each time a different face gains `.msb-show`.
- Neutralise the prism: `.msb-flip{transform:none;transition:none}`.
- Same three-hero cadence, still driven by the existing `step` timer — **no JS branching needed**.

### Fit-the-first-screen requirement
The user required the mobile hero (including buttons) to fit above the fold without scrolling:

- `.msb-scene{ height: calc(100svh - 178px); min-height:318px; max-height:540px }`
  (`svh` accounts for mobile browser chrome; a `100vh` line precedes it as a fallback).
- Hidden on mobile to save vertical space: the taped **photo** (`.msb-grid > div:last-child`),
  the long **paragraph/meta** (`.msb-desc`), and the corner **badges/notes** (`.msb-badge/.msb-note`).
- `.msb-grid` becomes a flex column; the text block fills the height; **`.msb-cta` (buttons) gets
  `margin-top:auto`** so they pin to the bottom of the mat, with the pills right below.

Verified fitting at 375×667 (tight) and 390×844 (roomy).

---

## 5. Mobile navigation — hamburger

- `.msb-burger` (three `<span>` bars) animates to an ✕ via an `.open` class; hidden on desktop,
  `display:flex` under ≤900px.
- State: `menuOpen`; `toggleMenu()` flips it; **`go(page)` sets `menuOpen:false`** so navigating
  closes the menu. `renderVals` exposes `menuCls` (`'open'`/`''`) applied to both the burger and nav.
- The nav becomes an absolute full-width dropdown (`.msb-nav.open`) anchored under the sticky
  header, containing the five links plus a `.msb-menu-cta` "Mitglied werden →" button. The desktop
  inline CTA (`.msb-headcta`) is hidden on mobile; the top-strip address (`.msb-addr`) is hidden too.

---

## 6. Generated assets

Images live in `uploads/`; originals under `~/Documents/Media Gen/2026-07-02-msb-*`.

### Hero photos (via the `media-gen` skill → Fal.ai `nano-banana-pro`)
- `hero-werkstatt.jpg` (soldering), `hero-blog.jpg` (CNC/router on plywood),
  `hero-event.jpg` (open-house tour). 3:2, resized to 1200w JPEG q82 with `sips`.
- Wired via the `<image-slot src="./uploads/…">` attribute (image-slot's optional
  initial/fallback image; a user drag-drop would override it). **The `<img>` lives in the element's
  shadow DOM** — a light-DOM `#id img` query returns nothing; that's expected.

### Pencil-sketch background overlays
- `sketch-3dprinter.png`, `sketch-gears.png`, `sketch-tools.png`.
- Generated as graphite sketchbook drawings, then converted to **transparent warm-dark line-art**
  with ImageMagick (luminance → alpha), so there's no visible paper rectangle when overlaid:
  ```
  magick crop.png -resize 820x \
    \( +clone -colorspace Gray -negate -level 8%,72% \) \
    -alpha off -compose CopyOpacity -composite \
    -fill "#2f2a1c" -colorize 100  uploads/sketch-*.png
  ```
- Placed in a `position:fixed; z-index:-1; pointer-events:none` `.msb-bg` layer as gutter
  watermarks (opacity ~.13–.16), **hidden below 1420px** so they never overlap content once the
  page gutters disappear.

---

## 7. The "Werkzeug & Räume" pegboard (SKÅDIS)

The original muddy-tan pegboard (flat brown dots) clashed with the cream/green palette. Replaced
with a light-birch **IKEA SKÅDIS** look: a warm board with **drilled, beveled holes** built from
three stacked radial-gradients per hole (dark hole + offset shadow crescent + offset highlight
crescent) on a 38px grid. Applied to both the start-page preview and the Tools page.

---

## 8. Verifying in the browser (workflow)

- **Always use the cmux browser** for preview/verification in this project (not Playwright or
  claude-in-chrome) — the user's explicit choice. `cmux browser open/navigate/screenshot/eval …`.
- cmux runs **WKWebView**, which flattens the complex nested 3D prism. So a broken-looking prism in
  cmux does **not** necessarily mean it's broken in the user's Chrome. Cross-check reasoning against
  the engine, and note WebKit caveats.
- **The pane can be hard to resize** to arbitrary widths. To preview at a specific viewport width
  (mobile or desktop), load the page inside a fixed-size **iframe** and screenshot that — media
  queries and `vh`/`svh` evaluate against the *iframe's* box, so a `375×667` iframe faithfully
  simulates a phone (and a `1200×900` iframe simulates desktop) regardless of the cmux pane size.
  Remember to delete the temporary preview file afterward.
- For close-ups, screenshot then crop/zoom with `sips` or ImageMagick (no browser zoom tool needed).

---

## 9. Quick reference — key classes & state

| Class / state        | Purpose |
|----------------------|---------|
| `.msb-scene`         | Hero stage; holds perspective (desktop) / fixed fit-height (mobile) |
| `.msb-flip`          | The rotating prism element (desktop); neutralised on mobile |
| `.msb-face .fN`      | The three hero faces; `translateZ` prism placement on desktop |
| `.msb-mat`/`.msb-grid` | Green mat panel and its 2-col (desktop) / flex-col (mobile) content |
| `.msb-cta`           | Hero button row; `margin-top:auto` on mobile pins to bottom |
| `.msb-desc`          | Long paragraph / meta; hidden on mobile |
| `.msb-badge/.msb-note` | Corner stickers; hidden on mobile |
| `.msb-dots`/`.msb-pill` | The 01/02/03 face selector pills |
| `.msb-nav/.msb-burger/.msb-menu-cta/.msb-headcta` | Desktop nav vs. mobile hamburger + dropdown |
| `.msb-addr`          | Top-strip address; hidden on mobile |
| `.msb-bg`            | Fixed pencil-sketch watermark layer (≥1420px) |
| `state.step`/`spin`/`trans` | Prism flip position + easing |
| `state.menuOpen` / `menuCls` | Hamburger open state |
| `renderVals().flipTf`| **Literal** prism transform string (so `transition` interpolates) |
