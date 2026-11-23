// No path aliases here: scripts/publish-static.ts imports this file directly
// to emit the same rules for nginx and Apache.

/**
 * Old Joomla list views, served from / and /index.php and picked by one query
 * parameter. Checked after article ids, before the menu paths.
 */
export const legacyViews: ReadonlyArray<{ param: 'view' | 'format'; value: string; target: string }> = [
  { param: 'view', value: 'archive', target: '/events/archiv' }, // ?view=archive&year=2023&month=10
  { param: 'format', value: 'feed', target: '/blog' }, // ?format=feed&type=rss|atom
]

/**
 * Old Joomla menu paths (/index.php/<alias>, taken from the live site's menu on
 * 2026-11-23) → their new page. '' is /index.php itself, with any query the
 * rules above don't claim (?start=7 pagination, unknown views). Any other
 * /index.php/… gets the 404 page, which suggests where to go (S1.3).
 */
export const legacyMenuPaths: Readonly<Record<string, string>> = {
  '': '/',
  'component/search': '/',
  'der-verein': '/verein',
  'der-verein/ueber-uns': '/verein',
  'der-verein/uns-kennenlernen': '/verein',
  'der-verein/uns-kennenlernen/ansprechpartner': '/verein',
  'der-verein/was-ist-ein-makerspace': '/verein',
  'der-verein/wir-sind-da-fuer-bei-uns-machen': '/verein',
  sponsoren: '/verein',
  presse: '/verein',
  downloads: '/verein',
  'der-verein/mitglied-werden': '/mitmachen',
  'der-verein/offener-handarbeitstreff': '/mitmachen',
  'uns-unterstuetzen': '/mitmachen',
  'werkeug-und-raeume': '/werkzeug',
  'werkeug-und-raeume/geraete-maschinen-werkzeug': '/werkzeug',
  'werkeug-und-raeume/zu-uns-raeumlichkeiten': '/werkzeug',
  impressum: '/impressum',
  haftung: '/haftung',
  datenschutz: '/datenschutz',
}
