/** Members-only events (S5.15): the shared wording for badge, event page and calendar export. */
export const MEMBERS_ONLY_LABEL = 'Nur für Mitglieder'

/**
 * The event's own label without the parts that only repeat the members-only
 * marker ("WORKSHOP · NUR FÜR MITGLIEDER" → "WORKSHOP"), so the badge and the
 * label don't say the same thing twice. Null when nothing is left.
 */
export function labelBesideMarker(category: string | null | undefined): string | null {
  const rest = (category ?? '')
    .split(/\s*·\s*/)
    .filter((part) => part.trim() && !/mitglied/i.test(part))
    .join(' · ')
  return rest || null
}
