import type { Block } from 'payload'
import { isValidIban } from '../../lib/epcQr'

const httpsOrEmpty = (v: unknown) =>
  !v || (typeof v === 'string' && /^https:\/\/\S+$/.test(v.trim())) ? true : 'Bitte einen https://-Link angeben.'

/**
 * Spenden (S5.14): the ways to give money. Bank transfer with a GiroCode
 * (QR for banking apps, built from these fields), PayPal and betterplace, each
 * shown only once its link is filled in, and the note on donation receipts.
 */
export const Donate: Block = {
  slug: 'donate',
  interfaceName: 'DonateBlock',
  labels: { singular: 'Spenden', plural: 'Spenden' },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'tag', type: 'text', label: 'Tape-Label', defaultValue: 'GELDSPENDE', admin: { width: '40%' } },
        {
          name: 'heading',
          type: 'text',
          label: 'Überschrift',
          defaultValue: 'So kannst du spenden',
          admin: { width: '60%' },
        },
      ],
    },
    { name: 'intro', type: 'textarea', label: 'Einleitung' },
    {
      name: 'bank',
      type: 'group',
      label: 'Überweisung',
      admin: {
        description:
          'Daraus entsteht der QR-Code für Banking-Apps (GiroCode). Den Betrag wählen Spender:innen selbst. Nach jeder Änderung einmal mit einer Banking-App testen.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'holder',
              type: 'text',
              label: 'Kontoinhaber',
              required: true,
              defaultValue: 'MakerSpace Bonn e.V.',
              admin: { width: '50%' },
            },
            {
              name: 'bankName',
              type: 'text',
              label: 'Bank',
              defaultValue: 'Sparkasse KölnBonn',
              admin: { width: '50%' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'iban',
              type: 'text',
              label: 'IBAN',
              required: true,
              admin: { width: '60%' },
              validate: (v: unknown) =>
                typeof v === 'string' && isValidIban(v) ? true : 'Diese IBAN stimmt nicht (Prüfziffer). Bitte prüfen.',
            },
            { name: 'bic', type: 'text', label: 'BIC', admin: { width: '40%' } },
          ],
        },
        {
          name: 'reference',
          type: 'text',
          label: 'Verwendungszweck',
          defaultValue: 'Spende MakerSpace Bonn',
          maxLength: 140,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'paypalUrl',
          type: 'text',
          label: 'PayPal-Link',
          validate: httpsOrEmpty,
          admin: {
            width: '50%',
            description: 'z. B. https://www.paypal.com/donate/?hosted_button_id=… Leer = ausgeblendet.',
          },
        },
        {
          name: 'betterplaceUrl',
          type: 'text',
          label: 'betterplace-Link',
          validate: httpsOrEmpty,
          admin: { width: '50%', description: 'Projektseite auf betterplace.org. Leer = ausgeblendet.' },
        },
      ],
    },
    {
      name: 'receipt',
      type: 'textarea',
      label: 'Spendenquittung',
      defaultValue:
        'Bis 300 € reicht dem Finanzamt dein Kontoauszug als Nachweis. Für höhere Beträge stellen wir dir gern eine Zuwendungsbestätigung aus: Schreib uns mit Name und Anschrift an office@makerspacebonn.de.',
    },
  ],
}
