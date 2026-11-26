'use client'

import Link from 'next/link'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { CuttingMat } from '../../components/CuttingMat'
import { MembersOnlyBadge } from '../../components/events/MembersOnlyBadge'
import type { MediaResource } from '../../components/Media'
import { Polaroid } from '../../components/Polaroid'
import { BTN_ON_DARK_HOVER, BTN_ON_DARK_SECONDARY } from '../../components/ui'
import type { LinkValue } from '../fields'

export type Face = {
  badge?: string | null
  note?: string | null
  accent?: 'green' | 'orange' | null
  variant?: 'standard' | 'event' | null
  eyebrow?: string | null
  pillLabel?: string | null
  cornerLabel?: string | null
  eventDay?: string | null
  eventMonth?: string | null
  eventWeekday?: string | null
  headline: string
  lede?: string | null
  description?: string | null
  meta?: { value?: string | null }[] | null
  primaryStyle?: 'white' | 'orange' | 'yellow' | null
  primary?: LinkValue | null
  secondary?: LinkValue | null
  image?: MediaResource
  imagePlaceholder?: string | null
  caption?: string | null
  /** Phones: the photo may take more of the height (the Werkstatt face, which has little text). */
  largePhoto?: boolean
  /** S5.15: members-only event — Mitglieder-Gelb accents and the members flag. */
  membersOnly?: boolean
}

export type HeroBlock = { blockType: 'hero'; faces?: Face[] | null }

const DUR = 5400 // ms per face before auto-flip

// Eyebrow pill on the Grün 800 mat: Grün 300 or Kreide, text and border in one solid colour.
const EYEBROW = {
  green: 'text-green-300 border-green-300',
  orange: 'text-kreide border-kreide',
}

// Each prism face: rotate into place, then push out by the apothem (--tz, set
// inline on the flip element). Arbitrary transform keeps the exact
// rotateY→translateZ order (v4's rotate-y/translate-z would reorder it).
const FACE_TF = [
  'transform-[rotateY(0deg)_translateZ(var(--tz,322px))]',
  'transform-[rotateY(120deg)_translateZ(var(--tz,322px))]',
  'transform-[rotateY(240deg)_translateZ(var(--tz,322px))]',
]

// pill / nav-dot base (the countdown bar is an ::after on the active one)
const PILL_BASE =
  'relative inline-flex cursor-pointer items-center gap-[7px] overflow-hidden rounded-[20px] border px-2 py-[5px] font-mono text-[14px] tracking-normal transition-[border-color,color,background] duration-[250ms] md:px-[13px] md:py-[7px] md:tracking-[.06em] [&_b]:font-semibold'

function Cta({
  link,
  primary,
  style,
}: {
  link?: LinkValue | null
  primary: boolean
  style?: 'white' | 'orange' | 'yellow'
}) {
  if (!link?.label) return null
  const base =
    'cursor-pointer rounded-[10px] no-underline flex min-h-11 flex-1 items-center justify-center px-2 py-2 text-center text-[13px] leading-tight md:block md:min-h-0 md:flex-none md:w-auto md:px-6 md:py-3.5 md:text-left md:text-[15px]'
  const cls = primary
    ? style === 'orange'
      ? `bg-orange text-tinte font-bold shadow-none md:shadow-[0_8px_20px_-10px_rgba(0,0,0,.4)] ${BTN_ON_DARK_HOVER}` // Maker-Orange: actions/events
      : style === 'yellow'
        ? `bg-yellow text-tinte font-bold shadow-none md:shadow-[0_8px_20px_-10px_rgba(0,0,0,.4)] ${BTN_ON_DARK_HOVER}` // Mitglieder-Gelb: members-only (S5.15)
        : `bg-kreide text-green-deep font-bold shadow-none md:shadow-[0_8px_20px_-10px_rgba(0,0,0,.4)] ${BTN_ON_DARK_HOVER}` // on the mat: Kreide, Grün 800 text
    : `${BTN_ON_DARK_SECONDARY} font-semibold`
  return (
    <Link href={link.url || '#'} className={`${base} ${cls}`}>
      {link.label}
    </Link>
  )
}

/**
 * Desktop headline size from its length, so a long title shrinks instead of
 * pushing lede and buttons off the mat (the mat has a fixed height).
 */
export function headlineSize(headline: string, isEvent: boolean): string {
  const n = headline.replace(/\s+/g, ' ').trim().length
  // Styleguide §9: Archivo titles 40–56px, headings 24–32px; nothing in between.
  if (isEvent) return n <= 30 ? 'md:text-[40px]' : 'md:text-[32px]'
  if (n <= 22) return 'md:text-[56px]'
  if (n <= 40) return 'md:text-[46px]'
  return 'md:text-[40px]'
}

function FaceContent({ face, priority = false }: { face: Face; priority?: boolean }) {
  const eb = EYEBROW[face.accent ?? 'green']
  const isEvent = face.variant === 'event'
  return (
    <CuttingMat cornerLabel={face.cornerLabel}>
      <div className="relative z-[2] flex h-full flex-col items-stretch gap-[9px] max-md:pl-3 md:grid md:grid-cols-[1.06fr_.94fr] md:items-stretch md:gap-10 md:pl-2.5 md:pt-1.5">
        {/* On phones the eyebrow pill goes on top, above the photo. */}
        {face.eyebrow ? (
          <div className="-order-1 mb-2 flex flex-wrap items-center gap-2 self-start md:hidden">
            <div
              className={`inline-flex items-center gap-1.5 rounded-[20px] border px-1.5 py-px font-mono text-[11px] tracking-normal ${eb}`}
            >
              {face.eyebrow}
            </div>
            {face.membersOnly ? <MembersOnlyBadge /> : null}
          </div>
        ) : null}
        {/* text column (mobile: stacked below the photo, order-2). Desktop: the
            copy takes the free height and clips its long tail; the buttons sit
            on the bottom edge of the mat whatever the copy's length. */}
        <div className="flex min-h-0 min-w-0 flex-col max-md:order-2 max-md:flex-1">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:block">
            {face.eyebrow ? (
              // Desktop only: on phones the pill sits above the photo (see above).
              <div className="flex items-center gap-3 max-md:hidden md:mb-[22px]">
                <div
                  className={`inline-flex items-center gap-2 self-start rounded-[20px] border font-mono tracking-normal md:px-[11px] md:py-[5px] md:text-[14px] md:tracking-[.06em] ${eb}`}
                >
                  {face.eyebrow}
                </div>
                {face.membersOnly ? <MembersOnlyBadge /> : null}
              </div>
            ) : null}

            {isEvent && face.eventDay ? (
              // On phones the date sits next to the polaroid instead, see the photo column.
              <div className="mb-1 flex items-end gap-2 max-md:hidden md:mb-3 md:gap-4">
                <div className="font-display text-[26px] font-black leading-[.85] text-kreide md:text-[56px]">
                  {face.eventDay}
                </div>
                <div className="font-mono text-[12px] leading-none text-green-300 md:pb-2 md:text-[14px] md:leading-[1.5]">
                  {face.eventMonth}
                  <span className="md:hidden"> · </span>
                  <br className="max-md:hidden" />
                  {face.eventWeekday}
                </div>
              </div>
            ) : null}

            <h1
              className={`mt-3 mb-2.5 font-display text-[21px] font-black leading-[1.02] tracking-[-.02em] text-kreide max-md:[@media(min-height:720px)]:text-[24px] md:mt-0 md:mb-3.5 md:leading-[.98] ${headlineSize(face.headline, isEvent)}`}
            >
              {face.headline.split('\n').map((line, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: headline lines may repeat, position is identity
                <Fragment key={i}>
                  {i > 0 ? <br /> : null}
                  {line}
                </Fragment>
              ))}
            </h1>

            {face.lede ? (
              <p className="m-0 line-clamp-2 font-serif text-[16px] font-medium italic leading-[1.35] text-kreide md:mb-4 md:text-[21px] md:leading-snug">
                {face.lede}
              </p>
            ) : null}
            {face.description ? (
              <p className="m-0 mt-3 min-h-0 max-w-[470px] flex-1 overflow-hidden text-[14px] leading-[1.45] text-kreide [mask-image:linear-gradient(to_bottom,black_calc(100%_-_1.6em),transparent)] md:mt-1.5 md:mb-4 md:line-clamp-3 md:flex-none md:text-[16.5px] md:leading-[1.6] md:[mask-image:none]">
                {face.description}
              </p>
            ) : null}
            {face.meta?.length ? (
              <div className="mb-2 hidden items-center gap-3.5 font-mono text-[14px] text-green-300 md:flex">
                {face.meta.map((m, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: meta values may repeat, position is identity
                  <Fragment key={i}>
                    {i > 0 ? <span className="opacity-50">·</span> : null}
                    <span>{m.value}</span>
                  </Fragment>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-auto flex shrink-0 flex-row gap-2 pt-2 md:flex-wrap md:gap-3 md:pt-4">
            <Cta link={face.primary} primary style={face.primaryStyle ?? 'white'} />
            <Cta link={face.secondary} primary={false} />
          </div>
        </div>

        {/* photo column (taped polaroid), centred against the full-height text column.
            Event face on phones: the date goes beside the polaroid (on the left); the polaroid leaves it ~96 px. */}
        <div
          className={`md:self-center ${face.largePhoto ? '[--pl-max:calc(min(100svh_-_176px,540px)_/_1.6_+_14px)] [@media(max-height:700px)]:[--pl-max:calc((100svh_-_176px)_/_2.8_+_14px)] [@media(min-height:840px)]:[--pl-max:calc(540px_/_2.2_+_14px)]' : '[--pl-max:calc(min(100svh_-_176px,540px)_/_2.3_+_14px)] [@media(max-height:700px)]:[--pl-max:calc((100svh_-_176px)_/_3.1_+_14px)] [@media(min-height:840px)]:[--pl-max:calc(540px_/_3_+_14px)]'} ${isEvent && face.eventDay ? 'max-md:flex max-md:items-center max-md:gap-4' : ''}`}
        >
          <div
            className={
              isEvent && face.eventDay ? 'max-md:w-[min(var(--pl-max),calc(100%_-_96px))] max-md:shrink-0' : undefined
            }
          >
            <Polaroid
              rotate={isEvent ? 1.8 : 2.2}
              mobileRotate={1.5}
              image={face.image}
              placeholder={face.imagePlaceholder ?? 'Foto'}
              caption={face.caption}
              sizes="(max-width:767.98px) 100vw, 460px"
              priority={priority}
              yellowTape={face.membersOnly}
            />
          </div>
          {isEvent && face.eventDay ? (
            <div className="-order-1 md:hidden">
              <div className="font-display text-[40px] font-black leading-[.85] text-kreide">{face.eventDay}</div>
              <div className="mt-2 font-mono text-[12px] leading-[1.4] text-green-300">
                {face.eventMonth}
                <br />
                {face.eventWeekday}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </CuttingMat>
  )
}

export function HeroComponent({
  faces,
  initialFace = 0,
  autoPlay = true,
}: {
  faces?: Face[] | null
  initialFace?: number
  autoPlay?: boolean
}) {
  const list = (faces ?? []).slice(0, 3)
  const carousel = list.length === 3

  const [step, setStep] = useState(initialFace)
  // start rotated to the initial face (each face is 120° apart)
  const [spin, setSpin] = useState(-initialFace * 120)
  const [trans, setTrans] = useState('none')
  const [sw, setSw] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [userPaused, setUserPaused] = useState(false)

  const sceneRef = useRef<HTMLDivElement>(null)
  const dotsRef = useRef<HTMLDivElement>(null)
  const flipping = useRef(false)
  const paused = useRef(false)
  const userPausedRef = useRef(false)
  const elapsed = useRef(0)
  const stepRef = useRef(0)
  const spinRef = useRef(0)
  stepRef.current = step
  spinRef.current = spin
  userPausedRef.current = userPaused

  const cur = ((step % 3) + 3) % 3

  const doFlip = useCallback(
    (delta: number) => {
      if (!carousel || flipping.current || delta === 0) return
      flipping.current = true
      elapsed.current = 0
      dotsRef.current?.style.setProperty('--msb-p', '0')
      const nextStep = stepRef.current + delta
      const target = -nextStep * 120
      // 1 · anticipation wind-up the other way
      setSpin(spinRef.current + 13)
      setTrans('transform .34s cubic-bezier(.3,.7,.35,1)')
      // 2 · swing to the target face with an ease-out overshoot
      window.setTimeout(() => {
        setStep(nextStep)
        setSpin(target)
        setTrans('transform 1.5s cubic-bezier(.32,1.28,.48,1)')
      }, 340)
      window.setTimeout(() => {
        flipping.current = false
      }, 1950)
    },
    [carousel],
  )

  const goHero = useCallback(
    (i: number) => {
      const delta = (((i - (((stepRef.current % 3) + 3) % 3)) % 3) + 3) % 3
      if (delta !== 0) doFlip(delta)
    },
    [doFlip],
  )

  // width measure → prism apothem, plus mobile viewport flag
  const measure = useCallback(() => {
    const sc = sceneRef.current
    if (!sc) return
    const w = Math.round(sc.clientWidth)
    setSw((prev) => (Math.abs(w - prev) > 1 ? w : prev))
    setIsMobile((typeof window !== 'undefined' ? window.innerWidth : 1000) < 768)
  }, [])

  // rAF: drives auto-flip and the countdown bar together
  useEffect(() => {
    if (!carousel || !autoPlay) return
    let raf = 0
    let last: number | null = null
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop)
      if (last == null) {
        last = ts
        return
      }
      const dt = Math.min(100, ts - last)
      last = ts
      // freeze on hover (paused) or when the user explicitly paused
      if (!paused.current && !userPausedRef.current) {
        elapsed.current += dt
        if (elapsed.current >= DUR) doFlip(1)
      }
      dotsRef.current?.style.setProperty('--msb-p', Math.min(1, elapsed.current / DUR).toFixed(4))
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [carousel, doFlip, autoPlay])

  // measure + hover pause + resize
  useEffect(() => {
    measure()
    const t = window.setTimeout(measure, 420)
    const sc = sceneRef.current
    const onEnter = () => (paused.current = true)
    const onLeave = () => (paused.current = false)
    sc?.addEventListener('mouseenter', onEnter)
    sc?.addEventListener('mouseleave', onLeave)
    window.addEventListener('resize', measure)
    return () => {
      window.clearTimeout(t)
      sc?.removeEventListener('mouseenter', onEnter)
      sc?.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  if (!list.length) return null

  // apothem of an equilateral-triangle prism = (width/2)/tan(60°) = width·0.2887
  const tz = `${sw > 0 ? Math.round(sw * 0.2887) : 322}px`
  const tilt = isMobile ? 'rotateX(4deg) rotateY(0deg)' : 'rotateX(4.5deg) rotateY(8deg)'
  const flipTf = `${tilt} translateZ(calc(var(--tz) * -1)) rotateY(${spin}deg)`

  const badgeRot = ['-8deg', '-7deg', '-7deg']

  return (
    <>
      <div
        className="relative mx-2.5 mt-2.5 mb-3 h-[min(calc(100svh-176px),540px)] perspective-[2000px] [perspective-origin:50%_48%] md:mx-0 md:mt-14 md:mb-[22px] md:h-[500px] md:perspective-[2400px] md:[perspective-origin:50%_42%]"
        ref={sceneRef}
      >
        <div
          className="relative h-full w-full transform-3d"
          style={carousel ? ({ '--tz': tz, transform: flipTf, transition: trans } as React.CSSProperties) : undefined}
        >
          {list.map((face, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: exactly 3 faces, the position is the prism side
            <div key={i} className={`absolute inset-0 backface-hidden ${FACE_TF[i]}`}>
              {face.badge ? (
                <div
                  className={`absolute z-[6] rounded-[22px] border-2 border-white ${face.membersOnly ? 'bg-yellow' : 'bg-orange'} px-[15px] py-[9px] font-sans text-[14px] font-bold tracking-[.03em] text-tinte shadow-[0_6px_16px_-6px_rgba(60,52,30,.5)] max-md:hidden`}
                  style={{ top: -20, left: -16, transform: `rotate(${badgeRot[i]})` }}
                >
                  {face.badge}
                </div>
              ) : null}
              {face.note ? (
                <div
                  className="absolute z-[6] rounded-md border border-dashed border-brand-text bg-fond px-4 py-1.5 font-hand text-[22px] font-bold text-brand-text shadow-[0_6px_16px_-8px_rgba(60,52,30,.5)] max-md:hidden"
                  style={{ top: -16, right: 44, transform: 'rotate(6deg)' }}
                >
                  {face.note}
                </div>
              ) : null}
              {/* eager-load the visible face's photo — 3D transforms confuse native
                  lazy loading, so the front face's image otherwise waits for a flip */}
              <FaceContent face={face} priority={i === cur} />
            </div>
          ))}
        </div>
      </div>

      {carousel ? (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5 md:mb-[38px] md:gap-2.5" ref={dotsRef}>
          {list.map((face, i) => {
            const on = i === cur
            return (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: one dot per prism side, the position is the side
                key={i}
                type="button"
                onClick={() => goHero(i)}
                aria-current={on}
                className={`${PILL_BASE} after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-0 after:rounded-[2px] after:bg-brand-text ${
                  on ? 'after:w-[calc(var(--msb-p,0)*100%)]' : ''
                }`}
                style={{
                  borderColor: on ? 'var(--color-brand-text)' : 'var(--color-line)',
                  color: on ? 'var(--color-brand-text)' : 'var(--color-muted)',
                  background: on ? 'var(--color-green-pale)' : 'var(--color-card)',
                }}
              >
                <b>{String(i + 1).padStart(2, '0')}</b>{' '}
                {(face.pillLabel || face.eyebrow || face.badge || `Slide ${i + 1}`)
                  .replace(/^[^A-Za-z0-9ÄÖÜäöü]+/, '')
                  .split('·')[0]
                  .trim()
                  .toUpperCase()}
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setUserPaused((v) => !v)}
            aria-label={userPaused ? 'Automatisches Wechseln fortsetzen' : 'Automatisches Wechseln pausieren'}
            aria-pressed={userPaused}
            title={userPaused ? 'Fortsetzen' : 'Pausieren'}
            className={`${PILL_BASE} h-[26px] w-[26px] justify-center !px-0 !py-0 md:h-[30px] md:w-[30px]`}
            style={{
              borderColor: 'var(--color-line)',
              color: 'var(--color-brand-text)',
              background: 'var(--color-card)',
            }}
          >
            {userPaused ? (
              <svg width="11" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2.5 1.5v9l7.5-4.5z" fill="currentColor" />
              </svg>
            ) : (
              <svg width="11" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <rect x="2.5" y="1.5" width="2.6" height="9" fill="currentColor" />
                <rect x="6.9" y="1.5" width="2.6" height="9" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
      ) : null}
    </>
  )
}
