'use client'

import Link from 'next/link'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { CuttingMat } from '../../components/CuttingMat'
import type { MediaResource } from '../../components/Media'
import { Polaroid } from '../../components/Polaroid'
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
  primaryStyle?: 'white' | 'orange' | null
  primary?: LinkValue | null
  secondary?: LinkValue | null
  image?: MediaResource
  imagePlaceholder?: string | null
  caption?: string | null
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
  'relative inline-flex cursor-pointer items-center gap-[7px] overflow-hidden rounded-[20px] border px-[10px] py-[7px] font-mono text-[14px] tracking-normal transition-[border-color,color,background] duration-[250ms] md:px-[13px] md:tracking-[.06em] [&_b]:font-semibold'

function Cta({ link, primary, style }: { link?: LinkValue | null; primary: boolean; style?: 'white' | 'orange' }) {
  if (!link?.label) return null
  const base =
    'cursor-pointer rounded-[10px] no-underline transition w-full px-2.5 py-[11px] text-center text-[14px] md:w-auto md:px-6 md:py-3.5 md:text-left md:text-[15px]'
  const cls = primary
    ? style === 'orange'
      ? 'bg-orange text-ink font-bold shadow-none md:shadow-[0_8px_20px_-10px_rgba(0,0,0,.4)]' // Maker-Orange: actions/events
      : 'bg-kreide text-green-deep font-bold shadow-none md:shadow-[0_8px_20px_-10px_rgba(0,0,0,.4)]' // on the mat: Kreide, Grün 800 text
    : 'border-[1.5px] border-kreide text-kreide font-semibold'
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
  if (isEvent) return n <= 30 ? 'md:text-[38px]' : 'md:text-[32px]'
  if (n <= 22) return 'md:text-[56px]'
  if (n <= 40) return 'md:text-[46px]'
  return 'md:text-[38px]'
}

function FaceContent({ face, priority = false }: { face: Face; priority?: boolean }) {
  const eb = EYEBROW[face.accent ?? 'green']
  const isEvent = face.variant === 'event'
  return (
    <CuttingMat cornerLabel={face.cornerLabel}>
      <div className="relative z-[2] flex h-full flex-col items-stretch gap-[9px] md:grid md:grid-cols-[1.06fr_.94fr] md:items-stretch md:gap-10 md:pl-2.5 md:pt-1.5">
        {/* text column (mobile: stacked below the photo, order-2). Desktop: the
            copy takes the free height and clips its long tail; the buttons sit
            on the bottom edge of the mat whatever the copy's length. */}
        <div className="flex min-h-0 min-w-0 flex-col max-md:order-2 max-md:flex-1">
          <div className="min-h-0 md:flex-1 md:overflow-hidden">
            {face.eyebrow ? (
              <div
                className={`mb-[9px] inline-flex items-center gap-2 self-start rounded-[20px] border px-[9px] py-1 font-mono text-[14px] tracking-normal md:mb-[22px] md:px-[11px] md:py-[5px] md:tracking-[.06em] ${eb}`}
              >
                {face.eyebrow}
              </div>
            ) : null}

            {isEvent && face.eventDay ? (
              <div className="mb-3 flex items-end gap-4">
                <div className="font-display text-[46px] font-black leading-[.85] text-kreide md:text-[74px]">
                  {face.eventDay}
                </div>
                <div className="pb-2 font-mono text-[14px] leading-[1.5] text-green-300">
                  {face.eventMonth}
                  <br />
                  {face.eventWeekday}
                </div>
              </div>
            ) : null}

            <h1
              className={`mb-[7px] font-display font-black leading-[1.02] tracking-[-.02em] text-kreide text-[30px] md:mb-3.5 md:leading-[.98] ${headlineSize(face.headline, isEvent)}`}
            >
              {face.headline.split('\n').map((line, i) => (
                <Fragment key={i}>
                  {i > 0 ? <br /> : null}
                  {line}
                </Fragment>
              ))}
            </h1>

            {face.lede ? (
              <p className="m-0 font-serif text-[17px] italic leading-[1.26] text-kreide md:mb-4 md:line-clamp-2 md:text-[21px] md:leading-snug">
                {face.lede}
              </p>
            ) : null}
            {face.description ? (
              <p className="mb-4 hidden max-w-[470px] text-[16.5px] leading-[1.6] text-kreide md:line-clamp-3">
                {face.description}
              </p>
            ) : null}
            {face.meta?.length ? (
              <div className="mb-2 hidden items-center gap-3.5 font-mono text-[14px] text-green-300 md:flex">
                {face.meta.map((m, i) => (
                  <Fragment key={i}>
                    {i > 0 ? <span className="opacity-50">·</span> : null}
                    <span>{m.value}</span>
                  </Fragment>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-auto flex shrink-0 flex-col gap-[7px] pt-2 md:flex-row md:flex-wrap md:gap-3 md:pt-4">
            <Cta link={face.primary} primary style={face.primaryStyle ?? 'white'} />
            <Cta link={face.secondary} primary={false} />
          </div>
        </div>

        {/* photo column (taped polaroid), centred against the full-height text column */}
        <div className="md:self-center">
          <Polaroid
            rotate={isEvent ? 1.8 : 2.2}
            image={face.image}
            placeholder={face.imagePlaceholder ?? 'Foto'}
            caption={face.caption}
            sizes="(max-width:767.98px) 100vw, 460px"
            priority={priority}
          />
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
        className="relative mx-5 mt-2.5 mb-3 h-[calc(100svh-176px)] perspective-[2000px] [perspective-origin:50%_48%] md:mx-0 md:mt-14 md:mb-[22px] md:h-[500px] md:perspective-[2400px] md:[perspective-origin:50%_42%]"
        ref={sceneRef}
      >
        <div
          className="relative h-full w-full transform-3d"
          style={carousel ? ({ '--tz': tz, transform: flipTf, transition: trans } as React.CSSProperties) : undefined}
        >
          {list.map((face, i) => (
            <div key={i} className={`absolute inset-0 backface-hidden ${FACE_TF[i]}`}>
              {face.badge ? (
                <div
                  className="absolute z-[6] rounded-[22px] border-2 border-white bg-orange px-[15px] py-[9px] font-display text-[14px] font-extrabold tracking-[.03em] text-ink shadow-[0_6px_16px_-6px_rgba(60,52,30,.5)] max-md:hidden"
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
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2.5 md:mb-[38px]" ref={dotsRef}>
          {list.map((face, i) => {
            const on = i === cur
            return (
              <button
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
            className={`${PILL_BASE} h-[30px] w-[30px] justify-center !px-0 !py-0`}
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
