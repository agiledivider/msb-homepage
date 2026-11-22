/**
 * Passwords for encrypted backup downloads (S8.2): 24 random characters in six
 * groups of four, from an alphabet without look-alikes (no i/l/1, o/0), so it
 * can be read off a screen or typed in. 24 × log2(31) ≈ 119 bits.
 * It starts with the backup's id ("Kennung"), which is also in the file name,
 * so file and password are easy to match; the id is no secret and adds no
 * strength, the random part carries it all.
 * Runs in the browser and on the server (Web Crypto in both).
 */
export const PASSPHRASE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const LENGTH = 24
const GROUP = 4

/** Same rule as the backup service: 20–200 printable ASCII characters, no spaces. */
export const isValidPassphrase = (v: unknown): v is string =>
  typeof v === 'string' && v.length >= 20 && v.length <= 200 && /^[\x21-\x7e]+$/.test(v)

export function generatePassphrase(
  backupId: string,
  random: (bytes: Uint8Array) => Uint8Array = (b) => crypto.getRandomValues(b),
) {
  const n = PASSPHRASE_ALPHABET.length
  // Rejection sampling: only bytes below the largest multiple of n, so every character is equally likely.
  const limit = 256 - (256 % n)
  const chars: string[] = []
  while (chars.length < LENGTH) {
    for (const byte of random(new Uint8Array(LENGTH * 2))) {
      if (byte < limit && chars.length < LENGTH) chars.push(PASSPHRASE_ALPHABET[byte % n])
    }
  }
  const groups: string[] = []
  for (let i = 0; i < LENGTH; i += GROUP) groups.push(chars.slice(i, i + GROUP).join(''))
  return [backupId, ...groups].join('-')
}

/** The backup id in a download's file name (`msb-backup-<time>Z-<id>.tar.gz.enc`), if it has one. */
// Tolerates the " (1)" browsers add to a second download of the same name.
export const idFromFileName = (name: string) => /-([0-9a-f]{8,64})\.tar\.gz(?: \(\d+\))?\.enc$/.exec(name)?.[1] ?? null
/** The backup id a generated password starts with, if it does. */
export const idFromPassphrase = (passphrase: string) => /^([0-9a-f]{8,64})-/.exec(passphrase.trim())?.[1] ?? null
