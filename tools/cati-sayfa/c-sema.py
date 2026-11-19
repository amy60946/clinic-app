# Çatı sayfa, 6. adım ("Sürer") görseli: "bu sürekli işleyen bir düzen" diyen üç şema (kullanıcı isteği 18 Kasım 2026).
# yap_c.py runpy ile yükler: sema(K) -> 'g' (geniş, sahne) ve 'd' (dar, telefon / tablet kartı) düzenleri için satır içi SVG.
#   a Döngü çemberi · b Yarım halka · c Haftalık şerit. Yazılar c-metin.json "sema" anahtarından; yazı tipi sayfadan (Outfit).
# Hareket: .s6-akis çizgileri yavaşça akar (c-18.css); hareket azaltmada durur.
import math, html
L, Y2, YESIL, YESIL_K, LAV, CIZGI, MOR = '#16113A', '#5C5875', '#51E56A', '#0A8F3A', '#ECEBFA', '#E3E1EE', '#7C74E8'
IKON = {'uzman': 'img/ikon-mercek.svg', 'ebeveyn': 'img/ikon-moyo.svg', 'oyun': 'img/ikon-oyun.png'}
e = html.escape

def n(v): return ('%.1f' % v).rstrip('0').rstrip('.')
def yaz(x, y, s, boy, kalin=400, renk=L, hiza='middle', ek=''):
    return f'<text x="{n(x)}" y="{n(y)}" font-size="{n(boy)}" font-weight="{kalin}" fill="{renk}" text-anchor="{hiza}"{ek}>{e(s)}</text>'
def golge(u):
    return (f'<defs><filter id="{u}-g" x="-40%" y="-40%" width="180%" height="190%">'
            f'<feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="{L}" flood-opacity=".2"/></filter></defs>')
def karo(u, k, cx, cy, s):
    # uygulama simgesi karosu: yuvarlak köşe, yumuşak gölge, ince çerçeve (beyaz Moyo Uzman simgesi beyaz zeminde kaybolmasın)
    x, y, r = cx - s / 2, cy - s / 2, s * .235
    kutu = f'x="{n(x)}" y="{n(y)}" width="{n(s)}" height="{n(s)}" rx="{n(r)}"'
    return (f'<rect {kutu} fill="#fff" filter="url(#{u}-g)"/><clipPath id="{u}-{k}"><rect {kutu}/></clipPath>'
            f'<image href="{IKON[k]}" x="{n(x)}" y="{n(y)}" width="{n(s)}" height="{n(s)}" clip-path="url(#{u}-{k})" preserveAspectRatio="xMidYMid slice"/>'
            f'<rect {kutu} fill="none" stroke="{L}" stroke-opacity=".14"/>')
def ok(x, y, aci, b=5, renk=YESIL_K, kalin=2.4):
    # (x, y) noktasında, aci (derece, saat yönünde) yönüne bakan ok ucu
    return (f'<path d="M{n(-b)} {n(-b * 1.15)}L{n(b * .55)} 0L{n(-b)} {n(b * 1.15)}" transform="translate({n(x)} {n(y)}) rotate({n(aci)})" '
            f'fill="none" stroke="{renk}" stroke-width="{kalin}" stroke-linecap="round" stroke-linejoin="round"/>')
def kutup(cx, cy, r, aci): return cx + r * math.cos(math.radians(aci)), cy + r * math.sin(math.radians(aci))
def svg(w, h, ic): return f'<svg viewBox="0 0 {w} {h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">{ic}</svg>'

# ---------- a) Döngü çemberi ----------
def cember(u, T, dar):
    if dar: W, H, cx, cy, R, ks, b1, b2, iz = 254, 240, 127, 128, 60, 40, 11.5, 11, 11
    else:   W, H, cx, cy, R, ks, b1, b2, iz = 640, 400, 320, 220, 112, 62, 15.5, 14, 16
    P = {k: kutup(cx, cy, R, a) for k, a in (('uzman', -90), ('ebeveyn', 30), ('oyun', 150))}
    s = golge(u)
    s += f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="{LAV}" stroke-width="{iz}"/>'
    # akan noktalar: yol saat yönünde, üstten başlar
    s += (f'<circle class="s6-akis" cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="{L}" stroke-opacity=".45" stroke-width="{n(iz * .17)}" '
          f'stroke-dasharray="0.1 {n(iz * .68 - .1)}" stroke-linecap="round" style="--s6:{n(-iz * .68)}" transform="rotate(-90 {cx} {cy})"/>')
    for a in (-30, 90, 210):
        x, y = kutup(cx, cy, R, a)
        s += f'<circle cx="{n(x)}" cy="{n(y)}" r="{n(iz * .78)}" fill="#fff" stroke="{CIZGI}"/>' + ok(x, y, a + 90, iz * .3, YESIL_K, 2 if dar else 2.4)
    for k in P: s += karo(u, k, P[k][0], P[k][1], ks)
    # üstte Moyo Uzman: ad ve fiil karonun üstünde; alttakilerde karonun altında
    ux, uy = P['uzman']
    s += yaz(ux, uy - ks / 2 - b2 - 11, T['uzman'][0], b1, 800) + yaz(ux, uy - ks / 2 - 8, T['uzman'][1], b2, 400, Y2)
    for k in ('ebeveyn', 'oyun'):
        x, y = P[k]
        s += yaz(x, y + ks / 2 + b1 + 6, T[k][0], b1, 800) + yaz(x, y + ks / 2 + b1 + b2 + 10, T[k][1], b2, 400, Y2)
    # dönüş: Moyo Oyun'dan uzmana giden sol yay
    if dar:
        p = T['donus'].split(' ')
        s += yaz(cx - 43, cy - 74, ' '.join(p[:2]), b2, 600, YESIL_K, 'end') + yaz(cx - 43, cy - 61, ' '.join(p[2:]), b2, 600, YESIL_K, 'end')
    else:
        x, y = kutup(cx, cy, R, 210)
        s += yaz(x - 26, y + 5, T['donus'], b2, 600, YESIL_K, 'end')
    ob = 12.5 if dar else 18
    s += yaz(cx, cy - 2, T['orta'][0], ob, 800) + yaz(cx, cy + ob + 1, T['orta'][1], ob, 800)
    return svg(W, H, s)

# ---------- b) Yarım halka ----------
def yarim(u, T, logo, dar):
    if dar: W, H, cx, by, R, kal, ks, tr, b1, b2, lw = 254, 240, 127, 190, 100, 44, 42, 46, 11.5, 11, 50
    else:   W, H, cx, by, R, kal, ks, tr, b1, b2, lw = 640, 400, 320, 344, 205, 66, 62, 112, 15.5, 14, 112
    P = {'uzman': kutup(cx, by, R, 210), 'ebeveyn': kutup(cx, by, R, 270), 'oyun': kutup(cx, by, R, 330)}
    s = golge(u)
    s += (f'<path d="M{n(P["uzman"][0])} {n(P["uzman"][1])}A{R} {R} 0 0 1 {n(P["oyun"][0])} {n(P["oyun"][1])}" fill="none" stroke="{LAV}" '
          f'stroke-width="{kal}" stroke-linecap="round"/>')
    # ortak taban: yarım daire, içinde yalnız "moyo" yazısı (koyu zeminde beyaz)
    s += f'<path d="M{cx - tr} {by}A{tr} {tr} 0 0 1 {cx + tr} {by}Z" fill="{L}"/>'
    lh = lw * 1113.5 / 2920.4
    s += f'<svg x="{n(cx - lw / 2)}" y="{n(by - tr * (.5 if dar else .56) - lh / 2)}" width="{n(lw)}" height="{n(lh)}" viewBox="-33.7 -601.7 2920.4 1113.5" color="#fff">{logo}</svg>'
    if dar: s += yaz(cx, by + 19, T['taban'], 12, 800)
    else:   s += yaz(cx, by - 16, T['taban'], 13.5, 600, '#fff', ek=' fill-opacity=".86"')
    # üç uygulamadan tabana akan kısa çizgiler
    for k in P:
        x, y = P[k]; dx, dy = cx - x, by - y; uz = math.hypot(dx, dy); bx, byy = dx / uz, dy / uz
        x1, y1, x2, y2 = x + bx * (ks / 2 + 7), y + byy * (ks / 2 + 7), cx - bx * (tr + 9), by - byy * (tr + 9)
        s += (f'<path class="s6-akis" d="M{n(x1)} {n(y1)}L{n(x2)} {n(y2)}" stroke="{L}" stroke-opacity=".5" stroke-width="{1.6 if dar else 2}" '
              f'stroke-dasharray="{"3 4" if dar else "4 6"}" stroke-linecap="round" style="--s6:{-7 if dar else -10}"/>')
        s += ok(cx - bx * (tr + 5), by - byy * (tr + 5), math.degrees(math.atan2(dy, dx)), 3.2 if dar else 4.5, YESIL_K, 1.8 if dar else 2.2)
    for k in P: s += karo(u, k, P[k][0], P[k][1], ks)
    ex, ey = P['ebeveyn']
    vb = ey - kal / 2 - (6 if dar else 9)   # üstteki karonun yazıları yayın dışında, üstünde
    s += yaz(ex, vb - b2 - 4, T['ebeveyn'][0], b1, 800) + yaz(ex, vb, T['b_ebeveyn'], b2, 400, Y2)
    for k in ('uzman', 'oyun'):
        x, y = P[k]
        s += yaz(x, y + ks / 2 + b1 + (7 if dar else 12), T[k][0], b1, 800) + yaz(x, y + ks / 2 + b1 + b2 + (10 if dar else 16), T[k][1], b2, 400, Y2)
    return svg(W, H, s)

# ---------- c) Haftalık şerit ----------
def isaret(tur, x, y, r):
    if tur == 0:    # rutin: yeşil dolu daire + onay
        return (f'<circle cx="{n(x)}" cy="{n(y)}" r="{n(r)}" fill="{YESIL}"/><path d="M{n(x - r * .42)} {n(y + r * .02)}l{n(r * .3)} {n(r * .32)}l{n(r * .56)} {n(-r * .62)}" '
                f'fill="none" stroke="{L}" stroke-width="{n(max(1.4, r * .2))}" stroke-linecap="round" stroke-linejoin="round"/>')
    if tur == 1:    # davranış kaydı: lacivert yuvarlak köşeli kare
        return f'<rect x="{n(x - r * .86)}" y="{n(y - r * .86)}" width="{n(r * 1.72)}" height="{n(r * 1.72)}" rx="{n(r * .42)}" fill="{L}"/>'
    if tur == 2:    # seans: mor eşkenar dörtgen
        return f'<rect x="{n(x - r * .8)}" y="{n(y - r * .8)}" width="{n(r * 1.6)}" height="{n(r * 1.6)}" rx="{n(r * .28)}" fill="{MOR}" transform="rotate(45 {n(x)} {n(y)})"/>'
    return (f'<circle cx="{n(x)}" cy="{n(y)}" r="{n(r * .92)}" fill="#fff" stroke="{L}" stroke-width="{n(max(1.4, r * .2))}"/>'          # yeni öneri: artı
            f'<path d="M{n(x - r * .42)} {n(y)}h{n(r * .84)}M{n(x)} {n(y - r * .42)}v{n(r * .84)}" stroke="{L}" stroke-width="{n(max(1.4, r * .2))}" stroke-linecap="round"/>')
GUNLER = {0: range(7), 1: (1, 4, 5), 2: (2,), 3: (3,)}   # satır -> işaretli günler (Pzt = 0)
def serit(u, T, dar):
    if dar: W, H, x0, ad, gw, y0, sa, r, hb = 254, 240, 34, 31, 25, 56, 22, 6.2, 10.5
    else:   W, H, x0, ad, gw, y0, sa, r, hb = 640, 400, 190, 60, 50, 122, 40, 9.5, 13.5
    gun = T['gunler_kisa'] if dar else T['gunler']
    ust, alt_ = y0 - sa * .62, y0 + sa * 3.62
    s = ''
    for i in range(7):
        x = x0 + ad * i
        s += f'<rect x="{n(x - gw / 2)}" y="{n(ust)}" width="{gw}" height="{n(alt_ - ust)}" rx="{n(gw * .3)}" fill="{"#F1F0F8" if i < 5 else "#F7F7FA"}"/>'
        s += yaz(x, ust - (7 if dar else 11), gun[i], hb, 800, L if i < 5 else Y2)
    for sat, gunler in GUNLER.items():
        y = y0 + sa * sat
        if not dar: s += yaz(x0 - gw / 2 - 18, y + 4.5, T['satirlar'][sat], 13.5, 600, Y2, 'end')
        for g in gunler: s += isaret(sat, x0 + ad * g, y, r)
    # tekrar oku: pazardan pazartesiye döner
    xa, xb, ya, yb, k = x0 + ad * 6, x0, alt_ + (7 if dar else 10), alt_ + (24 if dar else 44), (8 if dar else 14)
    s += (f'<path class="s6-akis" d="M{n(xa)} {n(ya)}V{n(yb - k)}Q{n(xa)} {n(yb)} {n(xa - k)} {n(yb)}H{n(xb + k)}Q{n(xb)} {n(yb)} {n(xb)} {n(yb - k)}V{n(ya + 3)}" fill="none" '
          f'stroke="{L}" stroke-opacity=".5" stroke-width="{1.6 if dar else 2}" stroke-dasharray="{"3 4" if dar else "4 6"}" stroke-linecap="round" style="--s6:{-7 if dar else -10}"/>')
    s += ok(xb, ya + 2, -90, 3.4 if dar else 4.8, YESIL_K, 1.8 if dar else 2.2)
    ob, gen = (11.5, 148) if dar else (15.5, 212)
    s += f'<rect x="{n((xa + xb) / 2 - gen / 2)}" y="{n(yb - ob)}" width="{gen}" height="{n(ob * 2)}" fill="#fff"/>' + yaz((xa + xb) / 2, yb + ob * .36, T['serit'], ob, 800)
    if dar:   # satır adları yerine altta açıklama (2 × 2)
        for j, ad_ in enumerate(T['satirlar']):
            x, y = (38 if j % 2 == 0 else 142), yb + 30 + (j // 2) * 19
            s += isaret(j, x, y, 5.4) + yaz(x + 11, y + 3.8, ad_, 11, 600, Y2, 'start')
    return svg(W, H, s)

def sema(K, logo, duzen):
    # duzen: 'g' geniş (sahne) | 'd' dar (kart). Üç seçenek yan yana durur; etkin olmayanlar hidden (oniz.js).
    T, dar, u = K['sema'], duzen == 'd', 's6' + duzen
    oneri = next(g['oneri'] for g in K['oniz'] if g['k'] == 'dongu6')
    ic = {'a': cember(u + 'a', T, dar), 'b': yarim(u + 'b', T, logo, dar), 'c': serit(u + 'c', T, dar)}
    return (f'<div class="d6" role="img" aria-label="{e(K["dongu"][5]["alt"])}">'
            + ''.join(f'<div class="d6-v" data-var="dongu6:{v}"{"" if v == oneri else " hidden"}>{ic[v]}</div>' for v in ('a', 'b', 'c')) + '</div>')
