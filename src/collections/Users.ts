import type { CollectionConfig } from 'payload'
import { adminOnly, adminOrSelf, adminOrSelfField, hideForNonAdmins, loggedIn } from '../access/admin'
import { passwordLoginEnabled } from '../lib/passwordLogin'
import { authCookies, TOKEN_EXPIRATION_SECONDS } from '../lib/requestSecurity'

export const Users: CollectionConfig = {
  slug: 'users',
  // Stateless-JWT auth (no server-side sessions). Required for OIDC: the
  // payload-oauth2 session step feeds the whole populated user (incl. the `roles`
  // relationship) to a low-level db.updateOne, which can't bind relationship
  // objects on SQLite. Disabling sessions makes that step a no-op; the plugin
  // still issues the JWT cookie. See src/plugins/oidc.
  auth: {
    useSessions: false,
    // S2.5: HTTPS-only cookie on https deployments; logins end after 2 h idle.
    cookies: authCookies(process.env),
    tokenExpiration: TOKEN_EXPIRATION_SECONDS,
    // PASSWORD_LOGIN=off (default on servers): Kanidm only. Payload then refuses
    // login, forgot/reset password and first-user registration, and the login
    // page shows only the SSO button. enableFields keeps email/hash/salt in the
    // schema, so switching needs no migration. See src/lib/passwordLogin.ts.
    ...(passwordLoginEnabled(process.env)
      ? {}
      : { disableLocalStrategy: { enableFields: true, optionalPassword: true } }),
  },
  access: {
    // Any logged-in user can read names (lock dialog, "Geprüft von"); email and
    // the Kanidm subject stay admin-or-self via field access below.
    read: loggedIn,
    create: adminOnly,
    update: adminOrSelf, // self may edit own name/email/password (role fields stay admin-locked)
    delete: adminOnly,
  },
  labels: { singular: 'Benutzer', plural: 'Benutzer' },
  admin: { group: 'Verwaltung', useAsTitle: 'name', defaultColumns: ['name', 'email'], hidden: hideForNonAdmins },
  fields: [
    { name: 'name', type: 'text' },
    // Merged over Payload's built-in auth `email` field; only adds read access.
    { name: 'email', type: 'email', access: { read: adminOrSelfField } },
    // OIDC subject identifier (Kanidm). Defined here rather than left to the
    // payload-oauth2 plugin so the column exists whether or not SSO is enabled —
    // otherwise a seed run with KANIDM_* unset (OIDC off) drops it via `push` and
    // login breaks with "no such column: sub". The plugin reuses this field.
    {
      name: 'sub',
      type: 'text',
      index: true,
      admin: { readOnly: true, hidden: true },
      access: { read: adminOrSelfField, create: () => true, update: () => false },
    },
  ],
}
