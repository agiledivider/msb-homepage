/**
 * Common phone viewports (CSS px), small to large. One list for the hero
 * preview page (/preview/hero) and `pnpm hero:shots`, so both check the same sizes.
 */
export const PHONES = [
  { name: 'Kleines Android', w: 360, h: 640 },
  { name: 'iPhone SE', w: 375, h: 667 },
  { name: 'Galaxy S8', w: 360, h: 740 },
  { name: 'iPhone 13 mini', w: 375, h: 812 },
  { name: 'iPhone 15', w: 393, h: 852 },
  { name: 'Pixel 7', w: 412, h: 915 },
  { name: 'iPhone 15 Pro Max', w: 430, h: 932 },
] as const
