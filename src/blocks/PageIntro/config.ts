import type { Block } from 'payload'

/** PageIntro — the eyebrow tag + big headline + italic lede used to open the
 *  Verein / Tools / Events / Mitmachen pages. */
export const PageIntro: Block = {
  slug: 'pageIntro',
  interfaceName: 'PageIntroBlock',
  labels: { singular: 'Page Intro', plural: 'Page Intros' },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'tag', type: 'text', admin: { width: '40%' }, label: 'Tape tag' },
        {
          name: 'tagColor',
          type: 'select',
          defaultValue: 'green',
          options: [
            { label: 'Green', value: 'green' },
            { label: 'Orange', value: 'orange' },
          ],
          admin: { width: '20%' },
        },
        { name: 'meta', type: 'text', admin: { width: '40%' }, label: 'Meta line' },
      ],
    },
    { name: 'headline', type: 'text', required: true },
    { name: 'lede', type: 'textarea', label: 'Lede (italic)' },
  ],
}
