#!/usr/bin/env python3
# Kullanıcının 17 Kasım 2026 taslaklarından iki logo denemesi (önizleme; kesin çizim değil).
#   Logo 1: mor kubbe; içindeki beyaz boşluk büyüteç gibi (yuvarlak baş + sap), iki tane -> kubbe "m" okunur.
#   Logo 2: kare ikon; alttaki çıkıntı üç, bacaklar daha derin.
# Çıktı: sekil.json (her biçimin SVG yolu; "v" = vurgu parçası, marka renkli sürümde yeşil) -> onizleme.py sayfayı kurar.
# Gerekli: pip install shapely
import json, math
from shapely.geometry import Point, Polygon, box, LineString
from shapely.ops import unary_union

Q = 48   # yay çözünürlüğü

def yol(g, nd=2):
    """Shapely geometrisi -> SVG path (evenodd)."""
    if g is None or g.is_empty: return ''
    parts = []
    for p in ([g] if g.geom_type == 'Polygon' else list(g.geoms)):
        for ring in [p.exterior] + list(p.interiors):
            c = list(ring.coords)
            parts.append('M' + ' L'.join('%s %s' % (round(x, nd), round(y, nd)) for x, y in c[:-1]) + 'Z')
    return ''.join(parts)

def yuvarlak_dik(x0, y0, x1, y1, r_ust=0, r_alt=0):
    """Üst ve alt köşeleri ayrı yarıçaplı dikdörtgen."""
    w = x1 - x0; r_ust = min(r_ust, w / 2); r_alt = min(r_alt, w / 2)
    g = [box(x0, y0 + r_ust, x1, y1 - r_alt)]
    if r_ust: g += [box(x0 + r_ust, y0, x1 - r_ust, y0 + r_ust), Point(x0 + r_ust, y0 + r_ust).buffer(r_ust, Q), Point(x1 - r_ust, y0 + r_ust).buffer(r_ust, Q)]
    if r_alt: g += [box(x0 + r_alt, y1 - r_alt, x1 - r_alt, y1), Point(x0 + r_alt, y1 - r_alt).buffer(r_alt, Q), Point(x1 - r_alt, y1 - r_alt).buffer(r_alt, Q)]
    return unary_union(g)

# ---------------- Logo 1: kubbe ----------------
def kubbe(W=200, H=172, sap=16, mercek=26, cy=82, halka=0, egim=0, acik=0.23):
    """W×H kubbe, üç bacak, iki beyaz boşluk. Boşluk = sap (genişlik) + yuvarlak baş (yarıçap mercek, merkez cy).
       halka > 0: başın içinde göbek (yarıçap) -> büyüteç halkası. egim: sapın dikeyden açısı (derece; altta içe yaklaşır).
       Dönüş: (gövde, vurgu) -> vurgu = göbekler."""
    R = W / 2
    kub = Point(R, R).buffer(R, Q * 2).intersection(box(0, 0, W, R))
    if egim == 0:
        L = (W - 2 * sap) / 3
        govde = unary_union([kub, box(0, R - 0.01, W, H - L / 2)] + [Point(i * (L + sap) + L / 2, H - L / 2).buffer(L / 2, Q) for i in range(3)])
        cxs = [L + sap / 2, 2 * L + sap * 1.5]
        for cx in cxs: govde = govde.difference(unary_union([Point(cx, cy).buffer(mercek, Q), box(cx - sap / 2, cy, cx + sap / 2, H + 1)]))
    else:
        govde = unary_union([kub, yuvarlak_dik(0, R - 0.01, W, H, 0, 30)])
        cxs = [R - W * acik, R + W * acik]
        dx = math.tan(math.radians(egim)) * (H - cy)
        for s, cx in zip((1, -1), cxs):
            alt = cx + s * dx
            sapg = LineString([(cx, cy), (alt + (alt - cx) * 0.3, H + (H - cy) * 0.3)]).buffer(sap / 2, cap_style=2)
            govde = govde.difference(unary_union([Point(cx, cy).buffer(mercek, Q), sapg]))
        govde = govde.buffer(-6, Q).buffer(6, Q)          # sapın çıktığı köşeler yumuşasın
    vurgu = unary_union([Point(cx, cy).buffer(halka, Q) for cx in cxs]) if halka else None
    return govde, vurgu

# ---------------- Logo 2: kare ikon ----------------
def ikon(W=210, H=160, ara=9, yd=0.42, bas=24, tur='elmas', r_ust=36, ic=0):
    """Beyaz biçim (0,0)-(W,H): üstte yuvarlak köşeli gövde, altta üç çıkıntı; aralarında sap, sapın ucunda baş.
       yd: başın merkezi (yüksekliğin oranı; küçük = daha derin bacak). ic > 0: başın içinde beyaz göbek.
       Dönüş: (beyaz biçim, vurgu) -> vurgu = başlar."""
    L = (W - 2 * ara) / 3
    Y = H * yd
    sekil = unary_union([yuvarlak_dik(0, 0, W, Y + 1, r_ust, 0)] + [yuvarlak_dik(i * (L + ara), Y, i * (L + ara) + L, H, 0, L / 2) for i in range(3)])
    baslar, gobek = [], []
    for i in range(2):
        cx = (i + 1) * L + i * ara + ara / 2
        k = Polygon([(cx, Y - bas), (cx + bas, Y), (cx, Y + bas), (cx - bas, Y)]).buffer(-7, Q).buffer(7, Q) if tur == 'elmas' else Point(cx, Y).buffer(bas, Q)
        sekil = sekil.difference(k); baslar.append(k)
        if ic: gobek.append(Point(cx, Y).buffer(ic, Q))
    sekil = sekil.buffer(2.2, Q).buffer(-2.2, Q)             # sapla başın birleştiği iç köşeler
    vurgu = unary_union(baslar)
    if gobek: sekil = unary_union([sekil] + gobek); vurgu = vurgu.difference(unary_union(gobek))
    return sekil, vurgu

def kayit(ad, aciklama, w, h, gv):
    return dict(ad=ad, aciklama=aciklama, w=w, h=h, d=yol(gv[0]), v=yol(gv[1]))

S = {
    '1a': kayit('Dolu yuvarlak baş', 'İsteğinizdeki hâli: boşluğun ucu beyaz yuvarlak, sap aşağı iner.', 200, 172, kubbe()),
    '1b': kayit('Halkalı baş', 'Yuvarlağın içinde göbek var: büyüteç daha net okunur.', 200, 172, kubbe(halka=13)),
    '1c': kayit('Derin bacak, küçük baş', 'Baş yukarıda ve küçük: bacaklar uzar, "m" öne çıkar.', 200, 180, kubbe(H=180, cy=66, mercek=21, halka=10, sap=18)),
    '1d': kayit('Eğik sap', 'Saplar altta birbirine yaklaşır: orta bacak daralır, büyük M izlenimi.', 200, 172, kubbe(egim=13, halka=13, cy=78)),
    '1e': kayit('Büyüteçsiz, üç derin bacak', 'Yalnız çıkıntı üçe iner, bacak derinleşir.', 200, 180, kubbe(H=180, cy=92, mercek=11, sap=22)),
    '2a': kayit('Üç çıkıntı, elmas baş', 'Taslağınızın üç çıkıntılı hâli; bacaklar daha derin.', 210, 160, ikon()),
    '2b': kayit('Daha da derin bacak', 'Baş yukarı çıktı, sap uzadı.', 210, 170, ikon(H=170, yd=0.30, bas=20)),
    '2c': kayit('Yuvarlak baş', 'Elmas yerine halka: iki küçük büyüteç.', 210, 165, ikon(H=165, yd=0.36, bas=22, tur='yuvarlak', ic=10)),
}
json.dump(S, open('sekil.json', 'w'), ensure_ascii=False)
print({k: (len(v['d']), len(v['v'])) for k, v in S.items()})
