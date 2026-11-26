import type { CollectionConfig } from 'payload'
import { loggedIn } from '@/access/admin'

/**
 * Per-day totals behind the Statistik view (S5.11, D-012). Each row is a sum,
 * never a visitor: one row per day and path, one per day and source. Written
 * only by `recordHit` (raw SQL upserts, so two hits at once can't lose a
 * count); nobody creates or edits them through the API. Hidden from the
 * sidebar, read by any CMS user (the view reads them with SQL as well).
 */
const noWrites = { create: () => false, update: () => false, delete: () => false }

export const StatPages: CollectionConfig = {
  slug: 'stat-pages',
  labels: { singular: 'Seitenaufruf (Tag)', plural: 'Seitenaufrufe (Tag)' },
  admin: { hidden: true },
  access: { read: loggedIn, ...noWrites },
  indexes: [{ fields: ['day', 'path'], unique: true }],
  fields: [
    { name: 'day', type: 'text', required: true, index: true }, // Berlin day, YYYY-MM-DD
    { name: 'path', type: 'text', required: true },
    { name: 'views', type: 'number', required: true, defaultValue: 0 },
    { name: 'visits', type: 'number', required: true, defaultValue: 0 }, // views that arrived from outside
  ],
}

export const StatSources: CollectionConfig = {
  slug: 'stat-sources',
  labels: { singular: 'Herkunft (Tag)', plural: 'Herkünfte (Tag)' },
  admin: { hidden: true },
  access: { read: loggedIn, ...noWrites },
  indexes: [{ fields: ['day', 'source'], unique: true }],
  fields: [
    { name: 'day', type: 'text', required: true, index: true },
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'Suchmaschine', value: 'search' },
        { label: 'Soziales Netzwerk', value: 'social' },
        { label: 'Andere Website', value: 'site' },
        { label: 'Direkt / unbekannt', value: 'direct' },
      ],
    },
    { name: 'source', type: 'text', required: true }, // referrer host, or "direkt"
    { name: 'visits', type: 'number', required: true, defaultValue: 0 },
  ],
}
