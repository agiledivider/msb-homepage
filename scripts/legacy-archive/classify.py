"""First-pass event/blog classification + event date extraction. Output TSV for review.

usage: python3 -I classify.py articles.json out.tsv
"""
import datetime as dt
import json
import re
import sys

SKIP = {5, 6, 7, 8, 9, 10, 150, 151, 152, 153, 154, 155, 163, 164, 166, 249}

EVENT_WORDS = r'workshop|vortrag|treff|kurs\b|abend|party|brunch|jam|session|einführung|caf[eé]|seminar|festival|faire|hackathon|camp|offene tür|führung|stammtisch|dorkbot|#makeup|zu gast|webinar|lan-|repair|sprechstunde|basteln|werkstatt am|nähen mit|gem-einsam|makerwochenende|scrumtisch|lesung|ferien|kids|einweisung|schnupper|tag der'
BLOG_WORDS = r'geschlossen|geöffnet|erfolg|bericht|rückblick|danke|frohe|fröhliche|weihnacht|neues jahr|birthday|geburtstag|spende|lockdown|corona|beendet|abgesagt|fällt aus|entfällt|gewonnen|preis|presse|neu im|neue maschine|neuer laser|wir suchen|gesucht|umzug|mitgliederversammlung|status|update|stand der dinge|ergebnis|fotos|bilder'

MONTHS = {m: i + 1 for i, m in enumerate(
    ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'])}
MONTHS.update({'jan': 1, 'feb': 2, 'mär': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'sept': 9, 'okt': 10, 'nov': 11, 'dez': 12})


def dates_in(text, pub):
    """All plausible dates in text, resolved against the publish date."""
    out = []
    for m in re.finditer(r'(\d{1,2})\.\s?(\d{1,2})\.(\d{2,4})?', text):
        d, mo, y = int(m.group(1)), int(m.group(2)), m.group(3)
        y = int(y) + (2000 if y and len(y) == 2 else 0) if y else None
        out.append((d, mo, y, m.start()))
    for m in re.finditer(r'(\d{1,2})\.\s*(' + '|'.join(sorted(MONTHS, key=len, reverse=True)) + r')[a-z]*\.?\s*(\d{4})?', text, re.I):
        out.append((int(m.group(1)), MONTHS[m.group(2).lower()], int(m.group(3)) if m.group(3) else None, m.start()))
    res = []
    for d, mo, y, pos in sorted(out, key=lambda x: x[3]):
        if not (1 <= mo <= 12 and 1 <= d <= 31):
            continue
        for yy in ([y] if y else [pub.year, pub.year + 1]):
            try:
                cand = dt.date(yy, mo, d)
            except ValueError:
                continue
            if y or cand >= pub - dt.timedelta(days=3):
                res.append(cand)
                break
    return res


def time_label(text):
    m = re.search(r'(\d{1,2})(?:[:.](\d{2}))?\s*(?:Uhr)?\s*(?:-|–|bis)\s*(\d{1,2})(?:[:.](\d{2}))?\s*Uhr', text)
    if m:
        a = m.group(1) + (f':{m.group(2)}' if m.group(2) and m.group(2) != '00' else '')
        b = m.group(3) + (f':{m.group(4)}' if m.group(4) and m.group(4) != '00' else '')
        return f'{a}–{b}'
    m = re.search(r'ab\s+(\d{1,2})(?:[:.](\d{2}))?\s*Uhr', text)
    if m:
        return 'ab ' + m.group(1) + (f':{m.group(2)}' if m.group(2) and m.group(2) != '00' else '')
    m = re.search(r'um\s+(\d{1,2})(?:[:.](\d{2}))?\s*Uhr', text)
    if m:
        return m.group(1) + ':' + (m.group(2) or '00')
    return ''


arts = json.load(open(sys.argv[1]))
rows = []
for a in arts:
    if a['id'] in SKIP:
        continue
    pub = dt.date.fromisoformat(a['published'][:10])
    title = a['title']
    text = ' '.join(v if isinstance(v, str) else ' '.join(v) for b in a['blocks'] for v in b.values())
    tl = title.lower()
    ev = bool(re.search(EVENT_WORDS, tl))
    bl = bool(re.search(BLOG_WORDS, tl))
    td = dates_in(title, pub)
    bd = dates_in(text[:600], pub)
    if a['catid'] in (31, 32):
        kind = 'blog'
    elif bl and not ev:
        kind = 'blog'
    elif ev or td:
        kind = 'event'
    else:
        kind = '?'
    date = (td or bd or [None])[0]
    rows.append([a['id'], kind, a['published'][:10], date.isoformat() if date else '', time_label(title + ' ' + text[:800]), title[:90], text[:140].replace('\t', ' ')])

with open(sys.argv[2], 'w') as f:
    for r in rows:
        f.write('\t'.join(str(x) for x in r) + '\n')
from collections import Counter
print(Counter(r[1] for r in rows), 'events without date:', sum(1 for r in rows if r[1] == 'event' and not r[3]))
