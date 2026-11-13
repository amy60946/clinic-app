# İki satırlı, sağa hizalı ikon ("mo" üstte, "yo" altta), seçilen logo değerleriyle (tools/logo/gen.py ile aynı hesap).
import sys, math, os
BRAND = '/home/user/amy60946/parent-app/brand'; sys.path.insert(0, BRAND)
from geom import Face, move, bounds, num, path_d, circle, turtle, ribbon
HEAVY = Face(BRAND + '/fonts/poppins-latin-800-normal.woff2')
g = lambda ch: HEAVY.glyph(HEAVY.name(ch))
X = -bounds(g('x'))[1]; a, b = HEAVY.stem_right('u'); S = float(b - a); XC0 = (a + b) / 2.0
GAPS = [7.9, 8.1, 8.8]
def word(chars, gaps, dy=0.0):
    ink, x, ball = [], 0.0, None
    for i, ch in enumerate(chars):
        sh = g('u' if ch == 'y' else ch); bx = bounds(sh)
        left = 0.0 if i == 0 else x + gaps[i - 1] / 100 * X
        dx = left - bx[0]; ink += move(sh, dx, dy)
        if ch == 'y':
            pts = turtle((dx + XC0, dy - 0.45 * X), 90, [('L', 0.45 * X + 0.34 * X), ('A', 0.36 * X, 118)])
            ink += ribbon(pts, S, taper_from=0.55, end_ratio=0.84)
            x2, y2, h, _ = pts[-1]; r = 0.205 * X; gp = 0.42 * S + 0.13 * X + r
            ball = circle(x2 + gp * math.cos(math.radians(h)), y2 + gp * math.sin(math.radians(h)), r)
        x = left + (bx[2] - bx[0])
    return ink, ball, x
top, _, wt = word('mo', [GAPS[0]])
bot, ball, wb = word('yo', [GAPS[2]], dy=X + 0.22 * X)
dx = wt - wb                                  # sağa hizalı
bot = move(bot, dx); ball = move(ball, dx)
ink = top + bot
PAL = {'koyu-yesil': ('#16113A', '#51E56A', '#FFFFFF'), 'yesil-lacivert': ('#51E56A', '#16113A', '#FFFFFF'), 'acik-lacivert': ('#FFFFFF', '#16113A', '#0FD354')}
for k, (bg, fg, dot) in PAL.items():
    x0, y0, x1, y1 = bounds(ink, ball); w, h = x1 - x0, y1 - y0; size = 1024; s = size * 0.62 / max(w, h)
    tx = size / 2 - s * (x0 + w / 2); ty = size / 2 - s * (y0 + h / 2)
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="Moyo ikonu"><rect width="1024" height="1024" fill="%s"/>'
           '<g transform="translate(%s %s) scale(%.4f)"><path fill="%s" d="%s"/><path fill="%s" d="%s"/></g></svg>\n'
           % (bg, num(tx), num(ty), s, fg, path_d(ink), dot, path_d(ball)))
    open('ikon/ikon-%s.svg' % k, 'w').write(svg)
print('ok', os.listdir('ikon'))
