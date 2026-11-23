/**
 * S1.3: the old Joomla menu, list and feed URLs that still get visits open a
 * useful page, in the proxy and in both static adapters.
 */
import { describe, expect, it } from 'vitest'
import { legacyMenuPaths } from '@/lib/legacyMenu'
import { resolveLegacyPath } from '@/lib/legacyRedirects'
import { htaccess, nginxConf } from '../../scripts/publish-static'

const resolve = (pathAndQuery: string) => resolveLegacyPath(new URL(pathAndQuery, 'https://makerspacebonn.de'))

describe('old Joomla menu and list URLs', () => {
  it.each([
    // front page, pagination, search
    ['/index.php', '/'],
    ['/index.php/', '/'],
    ['/index.php?start=7', '/'],
    ['/index.php/component/search', '/'],
    // list views and feeds
    ['/index.php?view=archive&year=2023&month=10', '/events/archiv'],
    ['/?view=archive&year=2024&month=1', '/events/archiv'],
    ['/index.php?format=feed&type=rss', '/blog'],
    ['/index.php?format=feed&type=atom', '/blog'],
    // menu
    ['/index.php/der-verein', '/verein'],
    ['/index.php/der-verein/', '/verein'],
    ['/index.php/der-verein/ueber-uns', '/verein'],
    ['/index.php/der-verein/uns-kennenlernen', '/verein'],
    ['/index.php/der-verein/uns-kennenlernen/ansprechpartner', '/verein'],
    ['/index.php/der-verein/was-ist-ein-makerspace', '/verein'],
    ['/index.php/der-verein/wir-sind-da-fuer-bei-uns-machen', '/verein'],
    ['/index.php/sponsoren', '/verein'],
    ['/index.php/presse', '/verein'],
    ['/index.php/downloads', '/verein'],
    ['/index.php/der-verein/mitglied-werden', '/mitmachen'],
    ['/index.php/der-verein/offener-handarbeitstreff', '/mitmachen'],
    ['/index.php/uns-unterstuetzen', '/mitmachen'],
    ['/index.php/werkeug-und-raeume', '/werkzeug'],
    ['/index.php/werkeug-und-raeume/geraete-maschinen-werkzeug', '/werkzeug'],
    ['/index.php/werkeug-und-raeume/zu-uns-raeumlichkeiten', '/werkzeug'],
    ['/index.php/impressum', '/impressum'],
    ['/index.php/haftung', '/haftung'],
    ['/index.php/datenschutz', '/datenschutz'],
  ])('%s → %s', (from, to) => {
    expect(resolve(from)).toBe(to)
  })

  it('lets an article id win over the list view and the front page', () => {
    expect(resolve('/index.php?view=article&id=374:x&catid=10&format=feed')).toMatch(/^\/(blog|events)\//)
  })

  it.each([
    '/index.php/gibt-es-nicht', // unknown old path → the 404 page
    '/verein', // new pages are never redirected (no loop)
    '/impressum',
    '/blog?view=archive', // list views only on the old front page
    '/?start=7', // the home page already answers this
  ])('leaves %s alone', (path) => {
    expect(resolve(path)).toBeNull()
  })

  it('emits every menu path for nginx and Apache', () => {
    const nginx = nginxConf([])
    const apache = htaccess([])
    for (const [alias, target] of Object.entries(legacyMenuPaths)) {
      const p = alias ? `/index.php/${alias}` : '/index.php'
      expect(nginx).toContain(`    "${p}"  ${target};`)
      expect(nginx).toContain(`    "${p}/"  ${target};`)
      expect(apache).toContain(`RewriteRule ^index\\.php${alias ? `/${alias}` : ''}/?$ ${target}? [R=301,L]`)
    }
    expect(nginx).toContain('"~^/(index\\.php)?:archive:"  /events/archiv;')
    expect(apache).toContain('(^|&)format=feed(&|$)')
  })

  it('puts the bare /index.php rule after the list views in Apache', () => {
    const apache = htaccess([])
    expect(apache.indexOf('RewriteRule ^index\\.php/?$ /?')).toBeGreaterThan(apache.indexOf('format=feed'))
  })
})
