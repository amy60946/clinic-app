import os
# "Moyo c top adjusted" (logo atölyesi kaydı vn366exngfj72tiesjn7, 12 Kasım 2026) → çizgi SVG'ler.
# Moyo kitinin (parent-app brand/geom.py, kit.py; salt okunur kopya) yazı tipi okuyucusu ve şerit hesabıyla; aralıklar atölyedeki gibi
# mürekkep aralığı = x yüksekliğinin yüzdesi (x yüksekliği = "x" glifinin mürekkep yüksekliği).
import sys, json, math, os
BRAND = os.environ.get('MOYO_BRAND', os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../amy60946/parent-app/brand'))   # parent-app brand/ (salt okunur)
sys.path.insert(0, BRAND)
from geom import Face, move, bounds, num, path_d, circle, turtle, ribbon
B = os.path.join(BRAND, 'fonts') + '/'
HEAVY = Face(B + 'poppins-latin-800-normal.woff2'); LIGHT = Face(B + 'poppins-latin-300-normal.woff2')
A = {"gaps": [7.9, 8.1, 8.8], "tp": {"L1": 0.34, "a1": 118, "a2": 0, "bg": 1, "br": 0.205, "end": "round", "er": 0.84, "r1": 0.36, "r2": 0.3, "sep": True, "tf": 0.55, "tw": 1},
     "mer": {"gap": 0.5, "track": -0.03, "size": 100}}
g = lambda ch: HEAVY.glyph(HEAVY.name(ch))
X = -bounds(g('x'))[1]                          # mürekkep x yüksekliği
a, b = HEAVY.stem_right('u'); S = float(b - a); XC0 = (a + b) / 2.0
def tail(dx):
    tp = A['tp']
    pts = turtle((dx + XC0, -0.45 * X), 90, [('L', 0.45 * X + tp['L1'] * X), ('A', tp['r1'] * X, tp['a1'])] + ([('A', tp['r2'] * X, tp['a2'])] if tp['a2'] else []))
    rb = ribbon(pts, S * tp['tw'], taper_from=tp['tf'], end_ratio=tp['er'])
    x, y, h, _ = pts[-1]; r = tp['br'] * X; gap = (0.42 * S + 0.13 * X) * tp['bg'] + r
    return rb, circle(x + gap * math.cos(math.radians(h)), y + gap * math.sin(math.radians(h)), r)
ink, x = [], 0.0
ball = None
for i, ch in enumerate('mouo'):
    sh = g(ch); bx = bounds(sh)
    left = 0.0 if i == 0 else x + A['gaps'][i - 1] / 100 * X
    dx = left - bx[0]
    ink += move(sh, dx)
    if i == 2:
        t, ball = tail(dx); ink += t
    x = left + (bx[2] - bx[0])
word_right = x
thin, _ = LIGHT.text('Mercek', tracking=A['mer']['track'] * LIGHT.upm)
tb = bounds(thin); thin = move(thin, word_right + A['mer']['gap'] * X - tb[0])
def doc(shapes_fg, fg, acc, title, pad=0.14):
    x0, y0, x1, y1 = bounds(*([s for s in shapes_fg] + [ball]))
    p = pad * X
    body = ''.join('<path fill="%s" d="%s"/>' % (fg, path_d(s)) for s in shapes_fg) + '<path fill="%s" d="%s"/>' % (acc, path_d(ball))
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s %s %s %s" role="img" aria-label="%s"><title>%s</title>%s</svg>\n' % (num(x0 - p), num(y0 - p), num(x1 - x0 + 2 * p), num(y1 - y0 + 2 * p), title, title, body)
INKS = {'lacivert': ('#16113A', '#0FD354'), 'beyaz': ('#FFFFFF', '#51E56A'), 'yesil': ('#0FD354', '#FFFFFF'), 'yesil-zemin': ('#16113A', '#FFFFFF')}
OUT = sys.argv[1] if len(sys.argv) > 1 else 'out'
os.makedirs(OUT, exist_ok=True)
for k, (fg, acc) in INKS.items():
    open(OUT + '/moyo-%s.svg' % k, 'w').write(doc([ink], fg, acc, 'moyo'))
    open(OUT + '/moyo-mercek-%s.svg' % k, 'w').write(doc([ink, thin], fg, acc, 'moyo Mercek'))
# temaya uyan satır içi sürüm: harf currentColor, top --logo-dot
def inline(shapes, title, cls):
    x0, y0, x1, y1 = bounds(*(shapes + [ball])); p = 0.06 * X
    return ('<svg class="%s" xmlns="http://www.w3.org/2000/svg" viewBox="%s %s %s %s" role="img" aria-label="%s"><path fill="currentColor" d="%s"/><path class="logo-dot" d="%s"/></svg>'
            % (cls, num(x0 - p), num(y0 - p), num(x1 - x0 + 2 * p), num(y1 - y0 + 2 * p), title, ''.join(path_d(s) for s in shapes), path_d(ball)))
open(OUT + '/inline-moyo-mercek.svg', 'w').write(inline([ink, thin], 'Moyo Mercek', 'logo-svg'))
open(OUT + '/inline-moyo.svg', 'w').write(inline([ink], 'Moyo', 'logo-svg'))
# baseline oranı: viewBox içinde taban çizgisinin yeri (x yüksekliği ortalamak için)
x0, y0, x1, y1 = bounds(ink, ball)
print(json.dumps({'X': X, 'S': S, 'stem_xh': S / X, 'word_w_xh': (word_right) / X, 'top': y0 / X, 'bottom': y1 / X, 'ball_bottom': (bounds(ball)[3]) / X}))
