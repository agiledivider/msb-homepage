/**
 * Security headers for every response (S2.3), one source for both deployments:
 * `next.config.mjs` sends them from the app (CMS + site), and
 * `scripts/publish-static.ts` writes the same list into nginx.conf and
 * .htaccess for the static site. Plain `.mjs` so the Next config can import it.
 *
 * The CSP is a baseline, not a nonce-based one: Next and the Payload admin emit
 * inline scripts and styles without nonces, so `'unsafe-inline'` stays. What it
 * does stop: framing by other sites, plugins, `<base>` hijacking, form posts and
 * fetches to other origins, scripts from other origins. Images may come from
 * any https origin (old posts, avatars); nothing embeds third-party frames.
 */

/**
 * @param {{ dev?: boolean }} [opts] dev: allow eval and the HMR websocket
 * @returns {string}
 */
export function contentSecurityPolicy({ dev = false } = {}) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    // the top strip's open/closed state comes from the SpaceAPI (src/lib/spaceState.ts)
    `connect-src 'self' https://status.makerspacebonn.de${dev ? ' ws: wss:' : ''}`,
    "media-src 'self'",
    "worker-src 'self' blob:",
    // the CMS live preview and the hero preview frame the site itself
    "frame-src 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

/**
 * @param {{ dev?: boolean }} [opts] dev: no HSTS (localhost is plain http), relaxed CSP
 * @returns {{ key: string, value: string }[]}
 */
export function securityHeaders({ dev = false } = {}) {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy({ dev }) },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
    // Browsers ignore HSTS over plain http, but a dev server has no business pinning it.
    // No includeSubDomains: other makerspacebonn.de hosts are not ours to pin.
    ...(dev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }]),
  ]
}
