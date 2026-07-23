import type React from 'react'
import { kanidmEnabled } from '@/plugins/oidc'

/**
 * Rendered below the admin login form (`admin.components.afterLogin`). Links to
 * the plugin's authorize endpoint, which 302s to Kanidm — so it must be a plain
 * anchor, never `next/link`/`router.push` (those expect an RSC payload, not a
 * cross-origin redirect). Renders nothing when SSO isn't configured, leaving the
 * password form as the only option.
 */
export const KanidmLoginButton: React.FC = () => {
  if (!kanidmEnabled) return null

  const label = process.env.KANIDM_BUTTON_LABEL || 'Mit MakerSpace-Konto anmelden'

  return (
    <div style={{ marginTop: 'var(--base)' }}>
      <div
        aria-hidden
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'calc(var(--base) / 2)',
          margin: 'var(--base) 0',
          color: 'var(--theme-elevation-400)',
          fontSize: 'small',
        }}
      >
        <span style={{ flex: 1, height: 1, background: 'var(--theme-elevation-150)' }} />
        oder
        <span style={{ flex: 1, height: 1, background: 'var(--theme-elevation-150)' }} />
      </div>
      <a
        href="/api/users/oauth/kanidm"
        className="btn btn--style-primary btn--size-medium"
        style={{ display: 'block', width: '100%', textAlign: 'center', textDecoration: 'none' }}
      >
        {label}
      </a>
    </div>
  )
}
