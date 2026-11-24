/** Sizes in the backups view (table and storage line), German number format, MB up to TB. */
const NUM = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })
const UNITS = ['MB', 'GB', 'TB'] as const

export const fmtSize = (bytes: number | null) => {
  if (bytes === null) return 'unbekannt'
  let value = bytes / 1024 / 1024
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  return `${NUM.format(value)} ${UNITS[unit]}`
}
