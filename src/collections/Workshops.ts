import type { CollectionConfig } from 'payload'
import { checkPermission } from 'payload-rbac-plugin'
import { publicRead } from '../access/publicRead'
import { TOOL_ICON_LABELS, TOOL_ICONS } from '../blocks/Workshops/icons'
import { slugField } from '../fields/slug'
import { generatePreviewPath } from '../lib/preview'

/** How a visitor gets to use a machine (S10.1). Order = from open to restricted. */
export const MACHINE_ACCESS = [
  { value: 'free', label: 'Frei nutzbar' },
  { value: 'briefing', label: 'Nach Einweisung' },
  { value: 'training', label: 'Nach Ausbildung' },
  { value: 'supervised', label: 'Nur mit Werkstattpat:in' },
] as const
export type MachineAccess = (typeof MACHINE_ACCESS)[number]['value']

/**
 * One workshop (Werkstatt) of the MakerSpace, with its own page at
 * /werkzeug/<slug> (S10.1). The workshop wall on the start page and on
 * /werkzeug lists these, so a card always leads to an existing page.
 * A fixed template rather than free blocks: six pages that must stay alike.
 */
export const Workshops: CollectionConfig = {
  slug: 'workshops',
  labels: { singular: 'Werkstatt', plural: 'Werkstätten' },
  admin: {
    group: 'Inhalte',
    useAsTitle: 'title',
    defaultColumns: ['title', 'order', '_status'],
    livePreview: { url: ({ data }) => generatePreviewPath({ path: `/werkzeug/${data?.slug}` }) },
    preview: (data) => generatePreviewPath({ path: `/werkzeug/${data?.slug}` }),
  },
  access: {
    read: publicRead, // public frontend; drafts hidden from anonymous callers
    create: checkPermission('workshops:create'),
    update: checkPermission('workshops:update'),
    delete: checkPermission('workshops:delete'),
  },
  defaultSort: 'order',
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 40 },
    slugField(),
    {
      name: 'order',
      type: 'number',
      defaultValue: 100,
      admin: { position: 'sidebar', description: 'Reihenfolge auf der Werkstatt-Wand (klein = zuerst).' },
    },
    {
      name: 'icon',
      type: 'select',
      label: 'Werkzeug-Zeichnung',
      options: TOOL_ICONS.map((value) => ({ value, label: TOOL_ICON_LABELS[value] })),
      admin: { position: 'sidebar' },
    },
    {
      name: 'verbs',
      type: 'text',
      label: 'Was man hier tut',
      maxLength: 60,
      admin: { description: 'Kurz, mit Verben: „Löten, messen, reparieren“. Auf der Karte unter dem Titel.' },
    },
    {
      name: 'summary',
      type: 'textarea',
      label: 'Kartentext',
      admin: { description: 'Zwei, drei Maschinen für die Karte, z. B. „Lötstationen · Oszilloskope · Reflowofen“.' },
    },
    {
      name: 'promise',
      type: 'textarea',
      label: 'Einleitung der Seite',
      admin: { description: 'Ein, zwei Sätze: was du hier machen kannst. Steht groß oben auf der Werkstatt-Seite.' },
    },
    {
      type: 'row',
      fields: [
        { name: 'cover', type: 'upload', relationTo: 'media', label: 'Foto', admin: { width: '50%' } },
        {
          name: 'coverCaption',
          type: 'text',
          label: 'Bildunterschrift',
          admin: { width: '50%', placeholder: 'Spielzeug-Reparatur · 2021' },
        },
      ],
    },
    {
      name: 'facts',
      type: 'group',
      label: 'Kurzinfos',
      admin: { description: 'Der Streifen unter dem Kopf. Leere Felder werden ausgelassen.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'where', type: 'text', label: 'Wo', admin: { width: '33%', placeholder: 'Raum, Etage' } },
            { name: 'hours', type: 'text', label: 'Offen', admin: { width: '33%', placeholder: 'Di & Do 18–21 Uhr' } },
            { name: 'cost', type: 'text', label: 'Kosten', admin: { width: '34%' } },
          ],
        },
      ],
    },
    {
      name: 'makes',
      type: 'array',
      label: 'Was du hier machen kannst',
      labels: { singular: 'Tätigkeit', plural: 'Tätigkeiten' },
      admin: { description: '3–6 Tätigkeiten mit Verb, z. B. „Schaltungen löten“ und ein Satz dazu.' },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'text', type: 'textarea' },
      ],
    },
    {
      name: 'machines',
      type: 'array',
      label: 'Maschinen & Ausstattung',
      labels: { singular: 'Maschine', plural: 'Maschinen' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', required: true, admin: { width: '50%' } },
            {
              name: 'access',
              type: 'select',
              label: 'Zugang',
              required: true,
              defaultValue: 'briefing',
              options: MACHINE_ACCESS.map((o) => ({ ...o })),
              admin: { width: '50%' },
            },
          ],
        },
        { name: 'note', type: 'text', label: 'Hinweis', admin: { description: 'optional, z. B. „max. 3 mm Stahl“' } },
      ],
    },
    {
      name: 'safety',
      type: 'array',
      label: 'Sicherheit',
      labels: { singular: 'Regel', plural: 'Regeln' },
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    { name: 'materials', type: 'textarea', label: 'Material & Kosten' },
    {
      name: 'contact',
      type: 'group',
      label: 'Frag nach (Werkstattpat:in)',
      admin: {
        description:
          'Nur was die Person veröffentlichen möchte. Kontakt über einen Link (Formular, Discord), keine E-Mail-Adresse im Klartext.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', admin: { width: '50%' } },
            { name: 'role', type: 'text', label: 'Rolle', admin: { width: '50%', placeholder: 'Werkstattpat:in' } },
          ],
        },
        { name: 'photo', type: 'upload', relationTo: 'media', label: 'Foto (optional)' },
        {
          type: 'row',
          fields: [
            { name: 'linkLabel', type: 'text', label: 'Button-Text', admin: { width: '50%' } },
            { name: 'linkUrl', type: 'text', label: 'Link', admin: { width: '50%' } },
          ],
        },
        { name: 'note', type: 'text', label: 'Zusatz', admin: { placeholder: 'oder im Discord-Kanal #elektronik' } },
      ],
    },
    {
      name: 'cta',
      type: 'group',
      label: 'Abschluss-Band',
      fields: [
        { name: 'heading', type: 'text', label: 'Überschrift', admin: { placeholder: 'Lust aufs Löten?' } },
        { name: 'text', type: 'text', label: 'Text' },
      ],
    },
  ],
}
