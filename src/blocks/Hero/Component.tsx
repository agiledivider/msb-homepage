'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Media, type MediaResource } from '../../components/Media'
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

const EYEBROW = {
  green: { color: '#cfe9ad', border: 'rgba(207,233,173,.45)' },
  orange: { color: '#f4d7ae', border: 'rgba(244,215,174,.5)' },
}

function Cta({ link, primary, style }: { link?: LinkValue | null; primary: boolean; style?: 'white' | 'orange' }) {
  if (!link?.label) return null
  const base =
    'msb-cta-btn cursor-pointer rounded-[10px] px-6 py-3.5 text-[15px] no-underline transition'
  const cls = primary
    ? style === 'orange'
      ? 'bg-orange text-orange-ink font-bold shadow-[0_8px_20px_-10px_rgba(0,0,0,.4)]'
      : 'bg-white text-green-deep font-bold shadow-[0_8px_20px_-10px_rgba(0,0,0,.4)]'
    : 'border-[1.5px] border-white/[.55] text-white font-semibold'
  return (
    <Link href={link.url || '#'} className={`${base} ${cls}`}>
      {link.label}
    </Link>
  )
}

function TapeStrip({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute z-[3] bg-[rgba(251,247,236,.72)] shadow-[0_2px_6px_-3px_rgba(0,0,0,.3)]"
      style={style}
    />
  )
}

function FaceContent({ face }: { face: Face }) {
  const eb = EYEBROW[face.accent ?? 'green']
  const isEvent = face.variant === 'event'
  return (
    <div className="msb-mat">
      {/* ruler edges */}
      <div className="absolute inset-x-0 top-0 h-4 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.5)_0_1px,transparent_1px_17px)]" />
      <div className="absolute inset-y-0 left-0 w-4 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,.5)_0_1px,transparent_1px_17px)]" />
      {face.cornerLabel ? (
        <div className="absolute bottom-4 right-5 font-mono text-[11px] text-white/50">{face.cornerLabel}</div>
      ) : null}

      <div className="msb-grid">
        {/* text column */}
        <div className="msb-face__text">
          {face.eyebrow ? (
            <div
              className="msb-eyebrow mb-[22px] inline-flex items-center gap-2 self-start rounded-[20px] border px-[11px] py-[5px] font-mono text-[12.5px] tracking-[.06em]"
              style={{ color: eb.color, borderColor: eb.border }}
            >
              {face.eyebrow}
            </div>
          ) : null}

          {isEvent && face.eventDay ? (
            <div className="mb-3 flex items-end gap-4">
              <div className="msb-eventdate font-display text-[74px] font-black leading-[.85] text-white">
                {face.eventDay}
              </div>
              <div className="pb-2 font-mono text-[14px] leading-[1.5] text-green-soft">
                {face.eventMonth}
                <br />
                {face.eventWeekday}
              </div>
            </div>
          ) : null}

          <h1
            className="msb-headline mb-3.5 font-display font-black leading-[.98] tracking-[-.02em] text-white"
            style={{ fontSize: isEvent ? 38 : 56 }}
          >
            {face.headline.split('\n').map((line, i) => (
              <Fragment key={i}>
                {i > 0 ? <br /> : null}
                {line}
              </Fragment>
            ))}
          </h1>

          {face.lede ? (
            <p className="msb-lede mb-5 font-serif text-[21px] italic text-white/80">{face.lede}</p>
          ) : null}
          {face.description ? (
            <p className="msb-desc mb-6 max-w-[470px] text-[16.5px] leading-[1.6] text-white/90">
              {face.description}
            </p>
          ) : null}
          {face.meta?.length ? (
            <div className="msb-desc mb-6 flex items-center gap-3.5 font-mono text-[12px] text-green-soft">
              {face.meta.map((m, i) => (
                <Fragment key={i}>
                  {i > 0 ? <span className="opacity-50">·</span> : null}
                  <span>{m.value}</span>
                </Fragment>
              ))}
            </div>
          ) : null}

          <div className="msb-cta flex flex-wrap gap-3">
            <Cta link={face.primary} primary style={face.primaryStyle ?? 'white'} />
            <Cta link={face.secondary} primary={false} />
          </div>
        </div>

        {/* photo column (taped polaroid) */}
        <div className="msb-face__photo relative" style={{ transform: `rotate(${isEvent ? 1.8 : 2.2}deg)` }}>
          <TapeStrip style={{ top: -13, left: 24, width: 78, height: 26, transform: 'rotate(-5deg)' }} />
          <TapeStrip style={{ bottom: -11, right: 30, width: 70, height: 24, transform: 'rotate(-4deg)' }} />
          <div className="msb-photo-frame relative bg-cream p-2.5 pb-[42px] shadow-[0_18px_40px_-18px_rgba(0,0,0,.5)]">
            <Media
              resource={face.image}
              placeholder={face.imagePlaceholder ?? 'Foto'}
              className="msb-photo-img block h-[320px] w-full"
              sizes="(max-width:900px) 100vw, 460px"
            />
            {face.caption ? (
              <div className="msb-photo-caption absolute inset-x-0 bottom-3 text-center font-hand text-[20px] font-semibold text-[#3c4a42]">
                {face.caption}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export function HeroComponent({ faces }: { faces?: Face[] | null }) {
  const list = (faces ?? []).slice(0, 3)
  const carousel = list.length === 3

  const [step, setStep] = useState(0)
  const [spin, setSpin] = useState(0)
  const [trans, setTrans] = useState('none')
  const [sw, setSw] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  const sceneRef = useRef<HTMLDivElement>(null)
  const dotsRef = useRef<HTMLDivElement>(null)
  const flipping = useRef(false)
  const paused = useRef(false)
  const elapsed = useRef(0)
  const stepRef = useRef(0)
  const spinRef = useRef(0)
  stepRef.current = step
  spinRef.current = spin

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
    setIsMobile((typeof window !== 'undefined' ? window.innerWidth : 1000) <= 900)
  }, [])

  // rAF: drives auto-flip and the countdown bar together
  useEffect(() => {
    if (!carousel) return
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
      if (!paused.current) {
        elapsed.current += dt
        if (elapsed.current >= DUR) doFlip(1)
      }
      dotsRef.current?.style.setProperty('--msb-p', Math.min(1, elapsed.current / DUR).toFixed(4))
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [carousel, doFlip])

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
  const tz = (sw > 0 ? Math.round(sw * 0.2887) : 322) + 'px'
  const tilt = isMobile ? 'rotateX(4deg) rotateY(0deg)' : 'rotateX(4.5deg) rotateY(8deg)'
  const flipTf = `${tilt} translateZ(calc(var(--tz) * -1)) rotateY(${spin}deg)`

  const badgeRot = ['-8deg', '-7deg', '-7deg']

  return (
    <>
      <div className="msb-scene" ref={sceneRef}>
        <div
          className="msb-flip"
          style={
            carousel
              ? ({ '--tz': tz, transform: flipTf, transition: trans } as React.CSSProperties)
              : undefined
          }
        >
          {list.map((face, i) => (
            <div key={i} className={`msb-face f${i} ${carousel && i === cur ? 'msb-show' : ''}`}>
              {face.badge ? (
                <div className="msb-badge" style={{ top: -20, left: -16, transform: `rotate(${badgeRot[i]})` }}>
                  {face.badge}
                </div>
              ) : null}
              {face.note ? (
                <div className="msb-note" style={{ top: -16, right: 44, transform: 'rotate(6deg)' }}>
                  {face.note}
                </div>
              ) : null}
              <FaceContent face={face} />
            </div>
          ))}
        </div>
      </div>

      {carousel ? (
        <div className="msb-dots" ref={dotsRef}>
          {list.map((face, i) => {
            const on = i === cur
            return (
              <span
                key={i}
                onClick={() => goHero(i)}
                className={`msb-pill ${on ? 'active' : ''}`}
                style={{
                  borderColor: on ? '#238811' : '#d9d2c1',
                  color: on ? '#238811' : '#7c766a',
                  background: on ? '#eaf3dd' : '#fbf7ec',
                }}
              >
                <b>{String(i + 1).padStart(2, '0')}</b>{' '}
                {(face.pillLabel || face.eyebrow || face.badge || `Slide ${i + 1}`)
                  .replace(/^[^A-Za-z0-9ÄÖÜäöü]+/, '')
                  .split('·')[0]
                  .trim()
                  .toUpperCase()}
              </span>
            )
          })}
        </div>
      ) : null}
    </>
  )
}
