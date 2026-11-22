"""Parse downloaded Joomla article pages into JSON (untrusted input, data only).

usage: python3 -I parse.py RAW_DIR OUT_JSON
"""
import html
import json
import os
import re
import sys
from html.parser import HTMLParser

BLOCK_TAGS = {'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'td', 'pre'}


class Body(HTMLParser):
    """Collect p/h/ul blocks with inline markdown links, plus image srcs."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks = []  # dicts: {p}|{h2}|{ul:[...]}
        self.images = []
        self.buf = []
        self.kind = 'p'
        self.list_items = None
        self.link = None  # [href, text-start-index]
        self.skip = 0

    def flush(self):
        text = re.sub(r'\s+', ' ', ''.join(self.buf)).strip()
        self.buf = []
        if not text or text in {'&nbsp;'}:
            return
        if self.list_items is not None and self.kind == 'li':
            self.list_items.append(text)
        elif self.kind == 'h':
            self.blocks.append({'h2': text})
        else:
            self.blocks.append({'p': text})

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('script', 'style'):
            self.skip += 1
            return
        if tag == 'img':
            if a.get('src'):
                img = {'src': a['src'], 'alt': a.get('alt') or ''}
                self.images.append(img)
                # Keep the image's place in the text (not inside a list item).
                if self.list_items is None:
                    self.flush()
                    self.blocks.append({'img': img['src'], 'alt': img['alt']})
            return
        if tag == 'br':
            self.buf.append('\n')
            return
        if tag in ('ul', 'ol'):
            self.flush()
            self.list_items = []
            return
        if tag == 'li':
            self.flush()
            self.kind = 'li'
            return
        if tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
            self.flush()
            self.kind = 'h'
            return
        if tag in BLOCK_TAGS:
            self.flush()
            self.kind = 'li' if self.list_items is not None else 'p'
            return
        if tag == 'a' and a.get('href'):
            self.link = [a['href'], len(self.buf)]

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip -= 1
            return
        if tag == 'a' and self.link:
            href, start = self.link
            self.link = None
            text = re.sub(r'\s+', ' ', ''.join(self.buf[start:])).strip()
            del self.buf[start:]
            if href.startswith('mailto:') or href.startswith('http') or href.startswith('/'):
                self.buf.append(f'[{text or href}]({href})' if text else '')
            else:
                self.buf.append(text)
            return
        if tag in ('ul', 'ol'):
            self.flush()
            if self.list_items:
                self.blocks.append({'ul': self.list_items})
            self.list_items = None
            self.kind = 'p'
            return
        if tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6') or tag in BLOCK_TAGS:
            self.flush()
            self.kind = 'li' if self.list_items is not None else 'p'

    def handle_data(self, data):
        if not self.skip:
            self.buf.append(data)

    def close(self):
        super().close()
        self.flush()
        if self.list_items:
            self.blocks.append({'ul': self.list_items})


def between(t, start_pat, end_pat):
    m = re.search(start_pat, t, re.S)
    if not m:
        return None
    e = re.search(end_pat, t[m.end():], re.S)
    return t[m.end(): m.end() + (e.start() if e else len(t))]


def parse(path, aid):
    t = open(path, encoding='utf-8', errors='replace').read()
    main = between(t, r'<main>', r'</main>') or ''
    cat = between(main, r'<h1>', r'</h1>')
    title = between(main, r'<div class="page-header">\s*<h2[^>]*>', r'</h2>')
    alias = re.search(r'id=%d:([a-z0-9-]+)' % aid, t)
    catid = re.search(r'id=%d:[a-z0-9-]+(?:&amp;|&)catid=(\d+)' % aid, t)
    pub = re.search(r'<dd class="published">.*?datetime="([^"]+)"', main, re.S)
    author = re.search(r'Geschrieben von:\s*<span>([^<]*)</span>', main)
    body_html = between(main, r'<div class="com-content-article__body">', r'<dl class="article-info|<nav class="pagenavigation"|</main>') or ''
    # Intro/full-text images sit in figure.item-image before the body.
    pre = main.split('com-content-article__body')[0]
    p = Body()
    p.feed(pre)
    lead_images = list(p.images)
    b = Body()
    b.feed(body_html)
    b.close()
    clean = lambda s: html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s or ''))).strip()
    return {
        'id': aid,
        'alias': alias.group(1) if alias else None,
        'catid': int(catid.group(1)) if catid else None,
        'category': clean(cat),
        'title': clean(title),
        'published': pub.group(1) if pub else None,
        'author': clean(author.group(1)) if author else None,
        'blocks': b.blocks,
        'images': lead_images + b.images,
        'bodyLength': len(' '.join(v if isinstance(v, str) else ' '.join(v) for blk in b.blocks for v in blk.values())),
    }


raw, out = sys.argv[1], sys.argv[2]
arts = []
for f in sorted(os.listdir(raw), key=lambda x: int(x.split('.')[0])):
    aid = int(f.split('.')[0])
    arts.append(parse(os.path.join(raw, f), aid))
json.dump(arts, open(out, 'w'), ensure_ascii=False, indent=1)
print(len(arts), 'articles')
