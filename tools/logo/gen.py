# "moyo" yazısı (kullanıcı kararı 18 Kasım 2026, logo seçeneği 6: her yerde yalnız yazı; m ve y köşeleri yuvarlak, y'nin topu yok)
# → çizgi SVG'ler ve ürün kilitleri. Yazının çizimi Marketing setinden gelir (amy60946/marketing marka/moyo-set-2026-11-18,
# kopyası kaynak/moyo-yazi.svg; burada yeniden çizilmez). Harf yerleri ve genişlik 12 Kasım yazısıyla aynı (2853,1 birim).
# Kilit kuralı değişmedi: ince ek (Mercek / Ebeveyn / Oyun / Uzman) Poppins 300, harf aralığı −0,03 em, son "o"dan 0,5 x yüksekliği
# uzakta, "o"nun taban çizgisinde. Renk kuralı: açık zeminde lacivert, koyu zeminde beyaz; yazıda yeşil yok.
# İşaret (1E) yalnız uygulama simgesinde ve profil resminde kullanılır, yazıyla yan yana konmaz (simge.py).
# Yazı tipi okuyucusu Moyo kitinden (parent-app brand/geom.py, salt okunur).
import sys, json, os, re
H = os.path.dirname(os.path.abspath(__file__))
BRAND = os.environ.get('MOYO_BRAND', os.path.join(H, '../../../amy60946/parent-app/brand'))   # parent-app brand/ (salt okunur)
sys.path.insert(0, BRAND)
from geom import Face, move, bounds, num, path_d
B = os.path.join(BRAND, 'fonts') + '/'
HEAVY = Face(B + 'poppins-latin-800-normal.woff2'); LIGHT = Face(B + 'poppins-latin-300-normal.woff2')
X = -bounds(HEAVY.glyph(HEAVY.name('x')))[1]                     # mürekkep x yüksekliği (561)
MER = {"gap": 0.5, "track": -0.03}
src = open(os.path.join(H, 'kaynak', 'moyo-yazi.svg')).read()
VX, VY, VW, VH = [float(v) for v in re.search(r'viewBox="([^"]+)"', src).group(1).split()]
YAZI = ''.join(re.findall(r'<path d="([^"]+)"', src))             # taban çizgisi y = 0, sol kenar x = 0
WB = (VX, VY, VX + VW, VY + VH)                                   # yazının sıkı kutusu
word_right = VX + VW
def ince(ek):
    t, _ = LIGHT.text(ek, tracking=MER['track'] * LIGHT.upm)
    return move(t, word_right + MER['gap'] * X - bounds(t)[0])
def kutu(shapes):
    bs = [WB] + [bounds(s) for s in shapes]
    return min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)
def govde(shapes): return YAZI + ''.join(path_d(s) for s in shapes)
def doc(shapes, fg, title, pad=0.14):
    x0, y0, x1, y1 = kutu(shapes); p = pad * X
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s %s %s %s" role="img" aria-label="%s"><title>%s</title><path fill="%s" d="%s"/></svg>\n'
            % (num(x0 - p), num(y0 - p), num(x1 - x0 + 2 * p), num(y1 - y0 + 2 * p), title, title, fg, govde(shapes)))
# temaya uyan satır içi sürüm: harf currentColor (rengi sayfanın CSS'i verir: açıkta lacivert, koyuda beyaz)
def inline(shapes, title, cls='logo-svg'):
    x0, y0, x1, y1 = kutu(shapes); p = 0.06 * X
    return ('<svg class="%s" xmlns="http://www.w3.org/2000/svg" viewBox="%s %s %s %s" role="img" aria-label="%s"><path fill="currentColor" d="%s"/></svg>'
            % (cls, num(x0 - p), num(y0 - p), num(x1 - x0 + 2 * p), num(y1 - y0 + 2 * p), title, govde(shapes)))
INKS = {'lacivert': '#16113A', 'beyaz': '#FFFFFF'}
OUT = sys.argv[1] if len(sys.argv) > 1 else 'out'
os.makedirs(OUT, exist_ok=True)
mercek = ince('Mercek')
for k, fg in INKS.items():
    open(OUT + '/moyo-%s.svg' % k, 'w').write(doc([], fg, 'moyo'))
    open(OUT + '/moyo-mercek-%s.svg' % k, 'w').write(doc([mercek], fg, 'moyo Mercek'))
open(OUT + '/inline-moyo-mercek.svg', 'w').write(inline([mercek], 'Moyo Mercek'))
open(OUT + '/inline-moyo.svg', 'w').write(inline([], 'Moyo'))
# Ürün kilitleri (kullanıcı isteği 17 Kasım 2026): tanıtım sayfalarında "moyo Ebeveyn / Oyun / Uzman", Mercek kilidiyle aynı kural.
# Aileye dönük yerlerde uzman ürününün adı "Moyo Uzman"; "Mercek" adı yalnız uzman platformunda (ortak durumlar.md 5B).
for ek in ('Ebeveyn', 'Oyun', 'Uzman'):
    open(OUT + '/inline-moyo-%s.svg' % ek.lower(), 'w').write(inline([ince(ek)], 'Moyo ' + ek))
print(json.dumps({'X': X, 'word_w_xh': word_right / X, 'top': WB[1] / X, 'bottom': WB[3] / X}))
