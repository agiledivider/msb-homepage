import type { CollectionConfig } from 'payload'
import { adminOnly, adminOrSelf, hideForNonAdmins } from '../access/admin'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  access: {
    read: adminOrSelf, // admins see everyone; others only themselves (for auth)
    create: adminOnly,
    update: adminOrSelf, // self may edit own name/email/password (role fields stay admin-locked)
    delete: adminOnly,
  },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'email'], hidden: hideForNonAdmins },
  fields: [{ name: 'name', type: 'text' }],
}
