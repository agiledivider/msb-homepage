import type { ReactNode } from 'react'

/**
 * The dark-green cutting-mat surface behind each hero face: a fine grid texture
 * over a solid green, ruled edges along the top and left, an inner hairline +
 * soft drop shadow, and an optional mono corner label.
 *
 * Mobile-first: a compact 28px (p-7) pad on small screens, roomier 40px (p-10)
 * from the md breakpoint (768px) up; 16px (rounded-2xl) corners throughout.
 */
export function CuttingMat({ cornerLabel, children }: { cornerLabel?: string | null; children: ReactNode }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-green-deep p-7 shadow-[0_42px_82px_-40px_rgba(20,60,42,.78),inset_0_0_0_2px_rgba(255,255,255,.16)] bg-[repeating-linear-gradient(0deg,rgba(255,255,255,.11)_0_1px,transparent_1px_34px),repeating-linear-gradient(90deg,rgba(255,255,255,.11)_0_1px,transparent_1px_34px)] md:p-10">
      {/* ruled edges */}
      <div className="absolute inset-x-0 top-0 h-4 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.5)_0_1px,transparent_1px_17px)]" />
      <div className="absolute inset-y-0 left-0 w-4 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,.5)_0_1px,transparent_1px_17px)]" />
      {cornerLabel ? (
        <div className="absolute bottom-4 right-5 font-mono text-[11px] text-white/50">{cornerLabel}</div>
      ) : null}
      {children}
    </div>
  )
}
