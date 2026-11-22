import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faDiscord,
  faGithub,
  faInstagram,
  faMastodon,
  faSignalMessenger,
  faTelegram,
  faTiktok,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { type SocialPlatform, socialLabel } from '@/lib/socialPlatforms'

// Matrix isn't in Font Awesome; logo from Simple Icons 13.21.0 (CC0-1.0).
const MATRIX_LOGO =
  'M.632.55v22.9H2.28V24H0V0h2.28v.55zm7.043 7.26v1.157h.033c.309-.443.683-.784 1.117-1.024.433-.245.936-.365 1.5-.365.54 0 1.033.107 1.481.314.448.208.785.582 1.02 1.108.254-.374.6-.706 1.034-.992.434-.287.95-.43 1.546-.43.453 0 .872.056 1.26.167.388.11.716.286.993.53.276.245.489.559.646.951.152.392.23.863.23 1.417v5.728h-2.349V11.52c0-.286-.01-.559-.032-.812a1.755 1.755 0 0 0-.18-.66 1.106 1.106 0 0 0-.438-.448c-.194-.11-.457-.166-.785-.166-.332 0-.6.064-.803.189a1.38 1.38 0 0 0-.48.499 1.946 1.946 0 0 0-.231.696 5.56 5.56 0 0 0-.06.785v4.768h-2.35v-4.8c0-.254-.004-.503-.018-.752a2.074 2.074 0 0 0-.143-.688 1.052 1.052 0 0 0-.415-.503c-.194-.125-.476-.19-.854-.19-.111 0-.259.024-.439.074-.18.051-.36.143-.53.282-.171.138-.319.337-.439.595-.12.259-.18.6-.18 1.02v4.966H5.46V7.81zm15.693 15.64V.55H21.72V0H24v24h-2.28v-.55z'

const FA: Record<Exclude<SocialPlatform, 'matrix'>, IconDefinition> = {
  discord: faDiscord,
  signal: faSignalMessenger,
  telegram: faTelegram,
  mastodon: faMastodon,
  instagram: faInstagram,
  tiktok: faTiktok,
  youtube: faYoutube,
  github: faGithub,
}

export type SocialLink = { platform: SocialPlatform; url: string }

/** Community channels as 44px icon links on the dark footer. Renders nothing when empty. */
export function SocialLinks({ items }: { items: SocialLink[] }) {
  if (!items.length) return null
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
      {items.map((s) => (
        <li key={`${s.platform}:${s.url}`}>
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer me"
            aria-label={`${socialLabel(s.platform)} (öffnet in neuem Tab)`}
            title={socialLabel(s.platform)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-kreide ring-1 ring-kreide hover:bg-brand hover:text-ink transition-colors hover:ring-brand"
          >
            {s.platform === 'matrix' ? (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                <path d={MATRIX_LOGO} />
              </svg>
            ) : (
              <FontAwesomeIcon icon={FA[s.platform]} className="h-6 w-6 text-[24px]" aria-hidden />
            )}
          </a>
        </li>
      ))}
    </ul>
  )
}
