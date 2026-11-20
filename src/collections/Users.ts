import type { CollectionConfig } from 'payload'
import { adminOnly, adminOrSelf, adminOrSelfField, hideForNonAdmins, loggedIn } from '../access/admin'

export const Users: CollectionConfig = {
  slug: 'users',
  // Stateless-JWT auth (no server-side sessions). Required for OIDC: the
  // payload-oauth2 session step feeds the whole populated user (incl. the `roles`
  // relationship) to a low-level db.updateOne, which can't bind relationship
  // objects on SQLite. Disabling sessions makes that step a no-op; the plugin
  // still issues the JWT cookie. See src/plugins/oidc.
  auth: { useSessions: false },
  access: {
    // Any logged-in user can read names (lock dialog, "Geprüft von"); email and
    // the Kanidm subject stay admin-or-self via field access below.
    read: loggedIn,
    create: adminOnly,
    update: adminOrSelf, // self may edit own name/email/password (role fields stay admin-locked)
    delete: adminOnly,
  },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'email'], hidden: hideForNonAdmins },
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
