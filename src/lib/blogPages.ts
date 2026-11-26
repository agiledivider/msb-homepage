/**
 * Paging for the blog list (S5.10). Page 1 is /blog, older posts live on
 * /blog/seite/2, /blog/seite/3 … : plain paths, so the static publisher can
 * save each page as its own file (a ?page= query can't be).
 */
export const BLOG_PAGE_SIZE = 20

export const blogPageCount = (totalPosts: number) => Math.max(1, Math.ceil(totalPosts / BLOG_PAGE_SIZE))

export const blogPagePath = (page: number) => (page <= 1 ? '/blog' : `/blog/seite/${page}`)

/** "2" → 2; anything that isn't a whole page number from 2 up → null (404). */
export function parseBlogPage(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) return null
  const n = Number(raw)
  return n >= 2 ? n : null
}
