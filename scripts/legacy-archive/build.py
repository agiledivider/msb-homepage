"""Build the archive data files for the repo from parsed articles + review decisions.

usage: python3 -I build.py SCRATCH REPO
writes: REPO/src/seed/legacy-archive.json, REPO/src/lib/legacy-paths.json,
        REPO/uploads/legacy/archive-*.{jpg,png,webp} (resized)
"""
import json
import os
import re
import subprocess
import sys

S, REPO = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.join(S, 'tools'))
from overrides import BLOG, EVENT, NOTICE  # noqa: E402

# Old static pages → their new home on the site.
STATIC = {
    5: '/verein', 6: '/verein', 7: '/mitmachen', 8: '/werkzeug', 9: '/werkzeug', 10: '/verein',
    150: '/impressum', 151: '/haftung', 152: '/datenschutz', 153: '/verein', 154: '/verein',
    155: '/verein', 163: '/', 164: '/mitmachen', 166: '/verein', 249: '/mitmachen',
}
DEAD = re.compile(r's\.w\.org|^data:|wp\.com/')

arts = {a['id']: a for a in json.load(open(os.path.join(S, 'articles.json')))}
cls = {int(r[0]): r for r in (l.rstrip('\n').split('\t') for l in open(os.path.join(S, 'class.tsv')))}
urls = json.load(open(os.path.join(S, 'img-urls.json')))
# id → intro image src, collected from the old list views (see docs/legacy-archive.md)
INTRO = json.load(open(os.path.join(S, 'tools', 'intro.json')))
idx = {src: i for i, src in enumerate(urls)}

# Slugs already used by the hand-migrated articles (legacy-articles.ts).
taken = set(re.findall(r"slug: '([^']+)'", open(os.path.join(REPO, 'src/seed/legacy-articles.ts')).read()))

out_dir = os.path.join(REPO, 'uploads', 'legacy')
files = {}  # src → filename


def image_file(src, aid):
    if src in files:
        return files[src]
    if DEAD.search(src) or src not in idx:
        return None
    raw = os.path.join(S, 'img', str(idx[src]))
    kind = subprocess.run(['file', '-b', raw], capture_output=True, text=True).stdout
    ext = 'jpg' if 'JPEG' in kind else 'png' if 'PNG' in kind else 'webp' if 'RIFF' in kind else None
    if not ext:
        return None
    name = f'archive-{aid}-{len([f for f in files.values() if f and f.startswith(f"archive-{aid}-")]) + 1}.{ext}'
    # Max 1600 px wide, sensible quality; strips metadata (EXIF GPS etc.).
    subprocess.run(['magick', raw + '[0]', '-auto-orient', '-strip', '-resize', '1600x1600>', '-quality', '82',
                    os.path.join(out_dir, name)], check=True)
    files[src] = name
    return name


def category(title):
    t = title.lower()
    if re.search(r'handarbeit|näh|stick|strick|häkel', t):
        return 'HANDARBEIT', 'orange'
    if re.search(r'vortrag|webinar|vortragsreihe', t):
        return 'VORTRAG', 'green'
    if re.search(r'workshop|kurs|einführung|jam session|einweisung', t):
        return 'WORKSHOP', 'orange'
    if re.search(r'gast|socialbar|scrumtisch|dorkbot|#makeup', t):
        return 'GAST-EVENT', 'neutral'
    if re.search(r' auf der | auf dem | beim |festival|faire|messe|maker day|camp', t):
        return 'EXTERN', 'neutral'
    return None, 'neutral'


archive, paths = [], {}
for aid in sorted(cls):
    a = arts[aid]
    r = cls[aid]
    kind = 'notice' if aid in NOTICE else 'blog' if aid in BLOG else 'event' if aid in EVENT else r[1]
    if kind == 'notice':
        paths[str(aid)] = '/blog'
        continue
    assert kind in ('blog', 'event'), (aid, kind)

    slug = a['alias'] or f'artikel-{aid}'
    if slug in taken:
        slug = f'{slug}-{aid}'
    taken.add(slug)

    body, cover = [], None
    for b in a['blocks']:
        if 'img' in b:
            f = image_file(b['img'], aid)
            if not f:
                continue
            if cover is None:
                cover = f  # first image becomes the cover, not repeated in the text
                continue
            body.append({'img': f, 'alt': b.get('alt') or ''})
        else:
            body.append(b)
    # Images placed before the body (Joomla intro/full-text image) win as cover.
    lead = [i for i in a['images'] if i not in [{'src': b.get('img'), 'alt': b.get('alt', '')} for b in a['blocks'] if 'img' in b]]
    for i in lead:
        f = image_file(i['src'], aid)
        if f:
            if cover and cover != f:
                body.insert(0, {'img': cover, 'alt': ''})
            cover = f
            break

    # Joomla "intro image": only shown in the old list views (home, category,
    # archive), never on the article page itself. Use it when nothing else is there.
    if cover is None and str(aid) in INTRO:
        cover = image_file(INTRO[str(aid)], aid)

    item = {'kind': kind, 'legacyId': aid, 'slug': slug, 'title': a['title']}
    if cover:
        item['image'] = cover
    if kind == 'blog':
        item['publishedAt'] = a['published']
    else:
        o = EVENT.get(aid, {})
        date = o.get('date') or r[3]
        assert date, aid
        item['date'] = f'{date}T12:00:00.000Z'
        if o.get('end'):
            item['endDate'] = f"{o['end']}T12:00:00.000Z"
        tl = o.get('time', r[4])
        if tl:
            item['timeLabel'] = tl
        cat, color = category(a['title'])
        if o.get('category'):
            cat = o['category']
        if cat:
            item['category'] = cat
        item['tagColor'] = color
    item['body'] = body
    archive.append(item)
    paths[str(aid)] = f"/{'blog' if kind == 'blog' else 'events'}/{slug}"

for aid, target in STATIC.items():
    paths[str(aid)] = target

# Links between old articles point at their new pages; other site-relative links
# go to the old host (they were files on it).
hand = {int(m[0]): f"/{'blog' if m[1] == 'blog' else 'events'}/{m[2]}" for m in re.findall(
    r"kind: '(event|blog)',\s*legacyId: (\d+),\s*slug: '([^']+)'", open(os.path.join(REPO, 'src/seed/legacy-articles.ts')).read())
    for m in [(m[1], m[0], m[2])]}


def relink(text):
    def sub(m):
        label, href = m.group(1), m.group(2)
        if href in ('/undefined',) or ' ' in href or '%20' in href and 'Spa' in href:
            return label  # broken link in the original: keep the text only
        art = re.search(r'view=article&(?:amp;)?id=(\d+)', href) or re.search(r'/index\.php/(?:[\w-]+/)+(\d+)-', href)
        if art and 'makerspacebonn.de' in href or (art and href.startswith('/')):
            target = paths.get(art.group(1)) or hand.get(int(art.group(1)))
            if target:
                return f'[{label}]({target})'
        if href.startswith('/'):
            return f'[{label}](https://makerspacebonn.de{href})'
        return m.group(0)
    return re.sub(r'\[([^\]]*)\]\(([^)]+)\)', sub, text)


for item in archive:
    for b in item['body']:
        if 'p' in b:
            b['p'] = relink(b['p'])
        elif 'h2' in b:
            b['h2'] = relink(b['h2'])
        elif 'ul' in b:
            b['ul'] = [relink(x) for x in b['ul']]

json.dump(archive, open(os.path.join(REPO, 'src/seed/legacy-archive.json'), 'w'), ensure_ascii=False, indent=1)
json.dump(dict(sorted(paths.items(), key=lambda kv: int(kv[0]))), open(os.path.join(REPO, 'src/lib/legacy-paths.json'), 'w'), indent=1)
from collections import Counter  # noqa: E402
print(Counter(x['kind'] for x in archive), 'paths', len(paths), 'images', len([f for f in files.values() if f]))
