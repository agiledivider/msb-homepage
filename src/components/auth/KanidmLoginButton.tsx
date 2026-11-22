import type React from 'react'
import { passwordLoginEnabled } from '@/lib/passwordLogin'
import { kanidmEnabled } from '@/plugins/oidc'

/**
 * Rendered below the admin login form (`admin.components.afterLogin`). Links to
 * the plugin's authorize endpoint, which 302s to Kanidm — so it must be a plain
 * anchor, never `next/link`/`router.push` (those expect an RSC payload, not a
 * cross-origin redirect). Renders nothing when SSO isn't configured, leaving the
 * password form as the only option. With password login off (PASSWORD_LOGIN,
 * the server default) it is the only way in: no "oder" divider, main button.
 */
export const KanidmLoginButton: React.FC = () => {
  if (!kanidmEnabled) return null

  const label = process.env.KANIDM_BUTTON_LABEL || 'Mit MakerSpace-Konto anmelden'
  const alone = !passwordLoginEnabled(process.env)

  return (
    <div style={{ marginTop: 'var(--base)' }}>
      {alone ? null : (
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
      )}
      <a
        href="/api/users/oauth/kanidm"
        // One main button per view (styleguide): the login submit if there is a form, else this.
        className={`btn ${alone ? 'btn--style-primary' : 'btn--style-secondary'} btn--size-medium`}
        style={{ display: 'block', width: '100%', textAlign: 'center', textDecoration: 'none' }}
      >
        {label}
      </a>
    </div>
  )
}
