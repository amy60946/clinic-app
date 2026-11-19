# Çatı sayfa, 6. adım ("Sürer") görseli: "bu her hafta yeniden işleyen bir düzen" diyen halka çizimleri.
# 18 Kasım 2026: ilk üç şema. 19 Kasım 2026 (kullanıcı: "döngü çemberi fikri güzel", "üst üste binen görsel/yazılar var"):
# yalnız halka seçenekleri, hiçbir genişlikte yazı yazıya ya da çizgiye binmez.
#   a Döngü çemberi · b Yörünge · c Dört adımlı halka · d Üç renkli halka
# yap_c.py runpy ile yükler: sema(K, logo, duzen, onek) -> 'g' (geniş: masaüstü sahnesi, 640 × 400) ve 'd' (dar: telefon / tablet kartı)
# düzenleri için satır içi SVG. Yazılar c-metin.json "sema" anahtarından; yazı tipi sayfadan (Outfit). onek: sayfada her çizim kopyasının
# kimlikleri ayrı olsun (sahne ve kart; gizli kopyadaki clipPath'e başvurulmasın).
# Hareket: .s6-akis (halkada akan noktalar) ve .s6-yol (halkada dolaşan tek nokta), c-18.css; hareket azaltmada durur, nokta yerinde kalır.
# Kural (tur 2): çocuk adımı gerçek hayatta yapar, oyunda işaretler; ebeveyn planlar (kurmaz).
import math, html
L, Y2, YESIL, YESIL_K, LAV, CIZGI = '#16113A', '#5C5875', '#51E56A', '#0A8F3A', '#ECEBFA', '#E3E1EE'
RENK = {'uzman': '#D6D2F7', 'ebeveyn': '#C4F0CF', 'oyun': '#CBE0FB'}     # d: üç uygulamanın yumuşak renkleri (1-2-3 kartlarıyla aynı aile)
IKON = {'uzman': 'img/ikon-mercek.svg', 'ebeveyn': 'img/ikon-moyo.svg', 'oyun': 'img/ikon-oyun.png'}
LOGO_ORAN = 1113.5 / 2920.4                                             # inline-moyo.svg viewBox (-33.7 -601.7 2920.4 1113.5)
e = html.escape

def n(v): return ('%.1f' % v).rstrip('0').rstrip('.')
def yaz(x, y, s, boy, kalin=400, renk=L, hiza='middle', ek=''):
    return f'<text x="{n(x)}" y="{n(y)}" font-size="{n(boy)}" font-weight="{kalin}" fill="{renk}" text-anchor="{hiza}"{ek}>{e(s)}</text>'
def satirlar(x, y, sat, boy, aralik, hiza='middle', ilk_kalin=800):
    # ilk satır ad (kalın, lacivert), sonrakiler fiil (gri)
    return ''.join(yaz(x, y + i * aralik, s, boy[0] if i == 0 else boy[1], ilk_kalin if i == 0 else 400, L if i == 0 else Y2, hiza) for i, s in enumerate(sat))
def golge(u):
    return (f'<defs><filter id="{u}-g" x="-40%" y="-40%" width="180%" height="190%">'
            f'<feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="{L}" flood-opacity=".18"/></filter></defs>')
def karo(u, k, cx, cy, s, golgeli=True):
    # uygulama simgesi karosu: yuvarlak köşe, yumuşak gölge, ince çerçeve (beyaz Moyo Uzman simgesi beyaz zeminde kaybolmasın)
    x, y, r = cx - s / 2, cy - s / 2, s * .235
    kutu = f'x="{n(x)}" y="{n(y)}" width="{n(s)}" height="{n(s)}" rx="{n(r)}"'
    return (f'<rect {kutu} fill="#fff"{f" filter=\"url(#{u}-g)\"" if golgeli else ""}/><clipPath id="{u}-{k}"><rect {kutu}/></clipPath>'
            f'<image href="{IKON[k]}" x="{n(x)}" y="{n(y)}" width="{n(s)}" height="{n(s)}" clip-path="url(#{u}-{k})" preserveAspectRatio="xMidYMid slice"/>'
            f'<rect {kutu} fill="none" stroke="{L}" stroke-opacity=".14"/>')
def ucgen(x, y, aci, b, renk=YESIL_K):
    # dolu ok ucu, dar tepe açısı (~40°): küçük boyda da yönü okunur, "onay işareti" gibi görünmez
    return (f'<path d="M{n(b * 1.05)} 0L{n(-b * .8)} {n(-b * .66)}L{n(-b * .8)} {n(b * .66)}Z" transform="translate({n(x)} {n(y)}) rotate({n(aci)})" '
            f'fill="{renk}" stroke="{renk}" stroke-width="{n(b * .22)}" stroke-linejoin="round"/>')
def sevron(x, y, aci, b, renk=YESIL_K, kalin=2.4):
    # açık ok ucu (›): küçük boyda da yönü dolu üçgenden daha net okunur (dolu üçgen tarayıcıda "◀" gibi görünüyordu)
    return (f'<path d="M{n(-b * .55)} {n(-b)}L{n(b * .55)} 0L{n(-b * .55)} {n(b)}" transform="translate({n(x)} {n(y)}) rotate({n(aci)})" '
            f'fill="none" stroke="{renk}" stroke-width="{n(kalin)}" stroke-linecap="round" stroke-linejoin="round"/>')
def isaret(x, y, aci, r, b):
    # halkanın üstünde beyaz yuvarlak içinde yön oku (saat yönünde)
    return f'<circle cx="{n(x)}" cy="{n(y)}" r="{n(r)}" fill="#fff" stroke="{CIZGI}"/>' + sevron(x + b * .12 * math.cos(math.radians(aci + 90)), y + b * .12 * math.sin(math.radians(aci + 90)), aci + 90, b, YESIL_K, max(1.8, b * .42))
def kutup(cx, cy, r, aci): return cx + r * math.cos(math.radians(aci)), cy + r * math.sin(math.radians(aci))
def yay(cx, cy, r, a1, a2):
    (x1, y1), (x2, y2) = kutup(cx, cy, r, a1), kutup(cx, cy, r, a2)
    return f'M{n(x1)} {n(y1)}A{n(r)} {n(r)} 0 {1 if (a2 - a1) % 360 > 180 else 0} 1 {n(x2)} {n(y2)}'
def orta(cx, cy, T, boy, renk=L):
    return yaz(cx, cy - boy * .14, T['orta'][0], boy, 800, renk) + yaz(cx, cy + boy * 1.02, T['orta'][1], boy, 800, renk)
def akis(cx, cy, R, iz, renk=L, op=.45):
    # halkada akan noktalar: yol saat yönünde, üstten başlar
    return (f'<circle class="s6-akis" cx="{n(cx)}" cy="{n(cy)}" r="{n(R)}" fill="none" stroke="{renk}" stroke-opacity="{op}" stroke-width="{n(iz * .17)}" '
            f'stroke-dasharray="0.1 {n(iz * .68 - .1)}" stroke-linecap="round" style="--s6:{n(-iz * .68)}" transform="rotate(-90 {n(cx)} {n(cy)})"/>')
def svg(w, h, ic): return f'<svg viewBox="0 0 {w} {h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">{ic}</svg>'

# ---------- a) Döngü çemberi: üç uygulama simgesi halkada, yazılar halkanın DIŞINDA ----------
def cember(u, T, dar):
    if dar: W, H, cx, cy, R, ks, iz, b1, b2, ar = 260, 300, 130, 158, 62, 44, 12, 12.5, 11.5, 14.5
    else:   W, H, cx, cy, R, ks, iz, b1, b2, ar = 640, 400, 320, 222, 116, 64, 16, 16.5, 14.5, 19
    P = {k: kutup(cx, cy, R, a) for k, a in (('uzman', -90), ('ebeveyn', 30), ('oyun', 150))}
    s = golge(u) + f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="{LAV}" stroke-width="{iz}"/>' + akis(cx, cy, R, iz)
    for a in (-30, 90, 210): s += isaret(*kutup(cx, cy, R, a), a, iz * .78, iz * .4)
    for k in P: s += karo(u, k, P[k][0], P[k][1], ks)
    ux, uy = P['uzman']
    s += satirlar(ux, uy - ks / 2 - b2 - (12 if dar else 15), T['uzman'], (b1, b2), b2 + 4)            # üstte: ad + fiil, simgenin üstünde
    ex, ey = P['ebeveyn']; ox, oy = P['oyun']
    if dar:   # alttakiler: simgenin altında, ortalı; halkanın en alt noktası iki yazının arasında kalır
        y0 = cy + R + iz / 2 + b1 + 4
        s += satirlar(ex + 6, y0, T['ebeveyn'], (b1, b2), b2 + 3.5) + satirlar(ox - 6, y0, T['oyun'], (b1, b2), b2 + 3.5)
        # dönüş: sol üstte, okun ve Moyo Uzman yazısının arasında
        s += yaz(8, cy - R - 2, T['donus'][0], b2, 600, YESIL_K, 'start') + yaz(8, cy - R + b2 + 1.5, T['donus'][1], b2, 600, YESIL_K, 'start')
    else:     # alttakiler: simgenin yanında, halkanın dışına doğru
        y0 = ey - (b1 + b2 + 8) / 2 + b1 * .35
        s += satirlar(ex + ks / 2 + 16, y0, T['ebeveyn'], (b1, b2), b2 + 5, 'start') + satirlar(ox - ks / 2 - 16, y0, T['oyun'], (b1, b2), b2 + 5, 'end')
        dx, dy = kutup(cx, cy, R, 210)
        s += yaz(dx - iz - 10, dy + b2 * .36, ' '.join(T['donus']), b2, 600, YESIL_K, 'end')
    return svg(W, H, s + orta(cx, cy, T, ar))

# ---------- b) Yörünge: ortada "moyo" yazısı, çevresinde üç uygulama kartı (simge + ad + fiil çipi), halkada dolaşan nokta ----------
def cip(x, y, sat, boy, hiza='start'):
    # fiil çipi: açık lavanta zeminli hap; birden çok satır olabilir. (x, y): sol üst ya da üst orta
    gen = max(len(s) for s in sat) * boy * .5 + boy * 1.3       # Outfit 400, Türkçe küçük harf ortalaması ~0,5 em (tarayıcıda denetlendi)
    yuk = len(sat) * boy * 1.25 + boy * .6
    x0 = x if hiza == 'start' else x - gen / 2
    r = f'<rect x="{n(x0)}" y="{n(y)}" width="{n(gen)}" height="{n(yuk)}" rx="{n(min(yuk / 2, boy * .9))}" fill="{LAV}"/>'
    return r + ''.join(yaz(x0 + gen / 2, y + boy * .3 + (i + 1) * boy * 1.25 - boy * .22, s, boy, 600, L) for i, s in enumerate(sat)), gen, yuk
def yorunge(u, T, logo, dar):
    C = T['kart']
    if dar: W, H, cx, cy, R = 260, 336, 130, 180, 100
    else:   W, H, cx, cy, R = 640, 400, 320, 214, 140
    P = {'uzman': (cx, cy - R), 'ebeveyn': kutup(cx, cy, R, 30 if not dar else 54), 'oyun': kutup(cx, cy, R, 150 if not dar else 126)}
    s = golge(u)
    s += f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="{LAV}" stroke-width="{4 if dar else 5}"/>'
    s += f'<circle cx="{cx}" cy="{cy}" r="{n(R * (.36 if dar else .46))}" fill="#F6F5FE"/>'
    lw = 84 if dar else 132; lh = lw * LOGO_ORAN
    s += f'<svg x="{n(cx - lw / 2)}" y="{n(cy - lh * .62)}" width="{n(lw)}" height="{n(lh)}" viewBox="-33.7 -601.7 2920.4 1113.5" color="{L}">{logo}</svg>'
    # dolaşan nokta: tam turu 9 sn; hareket azaltmada solda (Moyo Oyun'dan Moyo Uzman'a dönüş yayında, iki kartın arasında) durur
    cevre = 2 * math.pi * R
    s += (f'<circle class="s6-yol" cx="{n(cx)}" cy="{n(cy)}" r="{R}" fill="none" stroke="{YESIL_K}" stroke-width="{9 if dar else 11}" stroke-linecap="round" '
          f'stroke-dasharray="0.1 {n(cevre)}" style="--s6c:{n(-cevre)}" transform="rotate({180 if not dar else 190} {n(cx)} {n(cy)})"/>')
    for a in ((-30, 90, 210) if not dar else (-42, 222)):   # dar: alttaki kartların arası dar, orada ok yok
        s += isaret(*kutup(cx, cy, R, a), a, 8 if dar else 10, 4 if dar else 5)
    for k, (x, y) in P.items():
        if dar:   # dar: dikey kart (simge üstte, ad, çip)
            ks, gen = 28, 108
            cs, cg, cy_ = cip(x, 0, C[k][1], 10, 'middle')
            yuk = 10 + ks + 8 + 12 + 6 + cy_ + 10
            y0 = y - yuk / 2
            s += f'<rect x="{n(x - gen / 2)}" y="{n(y0)}" width="{gen}" height="{n(yuk)}" rx="16" fill="#fff" stroke="{CIZGI}" filter="url(#{u}-g)"/>'
            s += karo(u, k, x, y0 + 10 + ks / 2, ks, False)
            s += yaz(x, y0 + 10 + ks + 8 + 10, C[k][0], 11.5, 800)
            s += cip(x, y0 + 10 + ks + 8 + 12 + 6, C[k][1], 10, 'middle')[0]
        else:     # geniş: yatay kart (simge solda, ad ve çip sağda)
            ks, tek = 42, [' '.join(C[k][1])]      # genişte çip tek satır
            _, cg, cy_ = cip(0, 0, tek, 12.5)
            gen = 14 + ks + 12 + max(cg, len(C[k][0]) * 15 * .56) + 16; yuk = max(ks, 18 + 6 + cy_) + 24
            x0, y0 = x - gen / 2, y - yuk / 2
            s += f'<rect x="{n(x0)}" y="{n(y0)}" width="{n(gen)}" height="{n(yuk)}" rx="18" fill="#fff" stroke="{CIZGI}" filter="url(#{u}-g)"/>'
            s += karo(u, k, x0 + 14 + ks / 2, y, ks, False)
            tx = x0 + 14 + ks + 12; ty = y - (18 + 6 + cy_) / 2
            s += yaz(tx, ty + 14, C[k][0], 15, 800, L, 'start') + cip(tx, ty + 18 + 6, tek, 12.5)[0]
    return svg(W, H, s)

# ---------- c) Dört adımlı halka: numaralı dört düğüm, aralarında oklar, ortada "Her hafta yeniden" ----------
def dort(u, T, dar):
    A = T['dort']
    if dar:   # dar: küçük halka üstte, adımlar altında numaralı liste (yazılar halkanın yanına sığmıyor)
        W, H, cx, cy, R, r, ar = 260, 312, 130, 92, 58, 15, 12.5
    else:
        W, H, cx, cy, R, r, ar = 640, 400, 320, 200, 104, 22, 19
    s = f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="{LAV}" stroke-width="{8 if dar else 12}"/>' + akis(cx, cy, R, 8 if dar else 12, L, .35)
    acilar = (-90, 0, 90, 180)
    for i, a in enumerate(acilar):          # ok: bir sonraki düğümün hemen önünde
        x, y = kutup(cx, cy, R, a + 90 - (r + 9) / R * 180 / math.pi)
        s += ucgen(x, y, a + 90 + 90 - (r + 9) / R * 180 / math.pi, 4.4 if dar else 6.2)
    for i, a in enumerate(acilar):
        x, y = kutup(cx, cy, R, a)
        s += (f'<circle cx="{n(x)}" cy="{n(y)}" r="{r}" fill="{L}" stroke="#fff" stroke-width="{3 if dar else 4}"/>'
              + yaz(x, y + (4.6 if dar else 6.6), str(i + 1), 13 if dar else 18, 800, '#fff'))
    s += orta(cx, cy, T, ar)
    if dar:
        for i, sat in enumerate(A):
            y = 186 + i * 31
            s += (f'<circle cx="20" cy="{y}" r="10.5" fill="{L}"/>' + yaz(20, y + 4.2, str(i + 1), 11.5, 800, '#fff')
                  + yaz(38, y + 4.4, ' '.join(sat), 12.5, 600, L, 'start'))
    else:
        b, ar_ = 15.5, 20
        s += satirlar(cx, cy - R - r - 16, A[0][:1], (b, b), ar_, 'middle', 700)
        s += ''.join(yaz(cx + R + r + 16, cy - ar_ / 2 + 5 + i * ar_, t, b, 700, L, 'start') for i, t in enumerate(A[1]))
        s += yaz(cx, cy + R + r + 30, ' '.join(A[2]), b, 700)
        s += ''.join(yaz(cx - R - r - 16, cy - ar_ / 2 + 5 + i * ar_, t, b, 700, L, 'end') for i, t in enumerate(A[3]))
    return svg(W, H, s)

# ---------- d) Üç renkli halka: her uygulama halkanın bir dilimi; dilimin ucu ok başı, bir sonrakinin girintisine oturur; yazılar dışta ----------
def dilim_yol(cx, cy, ri, ro, a1, a2, t):
    # halka dilimi: a1'de girinti, a2'de ok başı (t derece ileride, orta yarıçapta)
    rm = (ri + ro) / 2
    p = lambda r, a: '%s %s' % tuple(n(v) for v in kutup(cx, cy, r, a))
    return (f'M{p(ro, a1)}A{n(ro)} {n(ro)} 0 0 1 {p(ro, a2)}L{p(rm, a2 + t)}L{p(ri, a2)}'
            f'A{n(ri)} {n(ri)} 0 0 0 {p(ri, a1)}L{p(rm, a1 + t)}Z')
def dilim(u, T, dar):
    if dar: W, H, cx, cy, R, kal, ks, b1, b2, ar = 260, 296, 130, 146, 60, 22, 32, 12.5, 11.5, 13
    else:   W, H, cx, cy, R, kal, ks, b1, b2, ar = 640, 400, 320, 228, 104, 30, 46, 16.5, 14.5, 19
    bos = 3.2                                 # dilimler arasındaki ince boşluk (derece)
    D = {'uzman': -90, 'ebeveyn': 30, 'oyun': 150}
    s = golge(u)
    for k, m in D.items():
        t = math.degrees(kal * .62 / R)       # ok başının boyu (derece)
        s += f'<path d="{dilim_yol(cx, cy, R - kal / 2, R + kal / 2, m - 60 + bos / 2 - t / 2, m + 60 - bos / 2 - t / 2, t)}" fill="{RENK[k]}"/>'
    for k, m in D.items(): s += karo(u, k, *kutup(cx, cy, R, m), ks)
    V = T['dilim']
    s += satirlar(cx, cy - R - max(kal, ks) / 2 - b2 - (10 if dar else 14), V['uzman'], (b1, b2), b2 + 4)
    if dar:
        y0 = cy + R + kal / 2 + b1 + 6
        s += satirlar(cx + 62, y0, V['ebeveyn'], (b1, b2), b2 + 3.5) + satirlar(cx - 62, y0, V['oyun'], (b1, b2), b2 + 3.5)
    else:
        ex, ey = kutup(cx, cy, R + kal / 2, 30); ox, oy = kutup(cx, cy, R + kal / 2, 150)
        y0 = ey + 2
        s += satirlar(ex + 18, y0, V['ebeveyn'], (b1, b2), b2 + 5, 'start') + satirlar(ox - 18, y0, V['oyun'], (b1, b2), b2 + 5, 'end')
    return svg(W, H, s + orta(cx, cy, T, ar))

def sema(K, logo, duzen, onek='s6'):
    # duzen: 'g' geniş (sahne) | 'd' dar (kart). Dört seçenek yan yana durur; etkin olmayanlar hidden (oniz.js).
    T, dar, u = K['sema'], duzen == 'd', onek + duzen
    oneri = next(g['oneri'] for g in K['oniz'] if g['k'] == 'dongu6')
    ic = {'a': cember(u + 'a', T, dar), 'b': yorunge(u + 'b', T, logo, dar), 'c': dort(u + 'c', T, dar), 'd': dilim(u + 'd', T, dar)}
    return (f'<div class="d6" role="img" aria-label="{e(K["dongu"][5]["alt"])}">'
            + ''.join(f'<div class="d6-v" data-var="dongu6:{v}"{"" if v == oneri else " hidden"}>{ic[v]}</div>' for v in ('a', 'b', 'c', 'd')) + '</div>')
