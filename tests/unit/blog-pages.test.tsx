import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Pager } from '@/components/blog/BlogIndex'
import { BLOG_PAGE_SIZE, blogPageCount, blogPagePath, parseBlogPage } from '@/lib/blogPages'

describe('blog paging (S5.10)', () => {
  it.each([
    [0, 1],
    [1, 1],
    [BLOG_PAGE_SIZE, 1],
    [BLOG_PAGE_SIZE + 1, 2],
    [77, 4], // the real archive on 2026-11-26
  ])('%i posts → %i pages', (posts, pages) => {
    expect(blogPageCount(posts)).toBe(pages)
  })

  it('keeps page 1 at /blog', () => {
    expect(blogPagePath(1)).toBe('/blog')
    expect(blogPagePath(3)).toBe('/blog/seite/3')
  })

  it.each([
    ['2', 2],
    ['14', 14],
    ['1', null], // that's /blog
    ['0', null],
    ['02', null],
    ['abc', null],
    ['-2', null],
  ])('parses /blog/seite/%s → %s', (raw, page) => {
    expect(parseBlogPage(raw)).toBe(page)
  })
})

describe('Pager', () => {
  it('links newer and older pages and marks the current one', () => {
    const out = renderToStaticMarkup(<Pager page={2} pages={4} />)
    expect(out).toMatch(/href="\/blog"[^>]*rel="prev"|rel="prev"[^>]*href="\/blog"/)
    expect(out).toMatch(/href="\/blog\/seite\/3"[^>]*rel="next"|rel="next"[^>]*href="\/blog\/seite\/3"/)
    expect(out).toContain('aria-current="page"')
    expect(out).toContain('Seite 2 von 4')
  })

  it('has no "Neuere" on the first page and no "Ältere" on the last', () => {
    expect(renderToStaticMarkup(<Pager page={1} pages={4} />)).not.toContain('Neuere')
    expect(renderToStaticMarkup(<Pager page={4} pages={4} />)).not.toContain('Ältere')
  })

  it('disappears when everything fits on one page', () => {
    expect(renderToStaticMarkup(<Pager page={1} pages={1} />)).toBe('')
  })
})
