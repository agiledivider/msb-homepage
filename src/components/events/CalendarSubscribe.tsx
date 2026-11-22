'use client'

import { faCalendarPlus, faCheck, faLink } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'

const FEED_PATH = '/events/calendar.ics'

/**
 * "Kalender abonnieren" control. The webcal:// link hands the feed to the OS
 * calendar app (Apple/Google/Outlook), which re-polls it for updates. Apple
 * Calendar upgrades webcal:// to https://, so on a plain-http dev host it can't
 * reach the feed — hence the copyable URL alongside it for manual subscription
 * ("Ablage → Neues Kalenderabo…"). URLs derive from the live origin, so this
 * works on any host without config.
 */
export function CalendarSubscribe() {
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => setOrigin(window.location.origin), [])

  const httpUrl = `${origin}${FEED_PATH}`
  const webcalUrl = origin ? httpUrl.replace(/^https?:/, 'webcal:') : FEED_PATH

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(httpUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked (e.g. insecure context): fall back to selection prompt.
      window.prompt('Kalender-Adresse kopieren:', httpUrl)
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <a
        href={webcalUrl}
        className="inline-flex items-center gap-1.5 rounded-[10px] border border-line bg-card px-3.5 py-2 font-mono text-[14px] text-muted no-underline transition-colors hover:text-ink"
        title="Termine im eigenen Kalender abonnieren (Apple, Google, Outlook …)"
      >
        <FontAwesomeIcon icon={faCalendarPlus} className="h-3.5 w-3.5" aria-hidden />
        Kalender abonnieren
      </a>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center rounded-[10px] border border-line bg-card px-3 py-2 font-mono text-[14px] text-muted transition-colors hover:text-ink"
        title="Kalender-Adresse zum manuellen Abonnieren kopieren"
      >
        <FontAwesomeIcon icon={copied ? faCheck : faLink} className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        {copied ? 'kopiert' : 'Adresse kopieren'}
      </button>
    </div>
  )
}
