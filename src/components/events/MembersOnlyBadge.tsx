import { faLock } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { MEMBERS_ONLY_LABEL } from '@/lib/membersOnly'

export { MEMBERS_ONLY_LABEL }

/**
 * The members-only marker (S5.15, design B "Mitglieder-Gelb", Falk 2026-11-26):
 * a Mitglieder-Gelb flag with a notched end, Tinte text and a lock. Yellow is
 * the palette's member colour, so it means "for members" wherever it appears.
 * 12 px on purpose (Falk 2026-11-26): bold Tinte on yellow is a label, not
 * running text; styleguide entry "Mitglieder-Fahne".
 * `compact` is the lock alone for tight spots (calendar chips, which turn
 * yellow themselves); it still carries the words for screen readers.
 */
export function MembersOnlyBadge({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  if (compact)
    return (
      <span className={`inline-flex ${className}`} title={MEMBERS_ONLY_LABEL}>
        <FontAwesomeIcon icon={faLock} className="h-[0.8em] w-[0.8em]" aria-hidden />
        <span className="sr-only">{MEMBERS_ONLY_LABEL}</span>
      </span>
    )
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-l-[2px] bg-yellow py-[3px] pr-[16px] pl-[7px] font-sans text-[12px] font-bold leading-[1.2] text-tinte [clip-path:polygon(0_0,100%_0,calc(100%_-_8px)_50%,100%_100%,0_100%)] ${className}`}
    >
      <FontAwesomeIcon icon={faLock} className="h-[0.85em] w-[0.85em]" aria-hidden />
      {MEMBERS_ONLY_LABEL}
    </span>
  )
}
