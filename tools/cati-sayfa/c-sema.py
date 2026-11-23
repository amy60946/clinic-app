# Çatı sayfa, 6. adım ("Sürer") görseli: "bu her hafta yeniden işleyen bir düzen" diyen yörünge çizimi.
# 18 Kasım 2026: ilk üç şema. 19 Kasım 2026: dört halka seçeneği (a döngü çemberi · b yörünge · c dört adımlı halka · d üç renkli halka).
# Tur 4 (kullanıcı kararı 19 Kasım 2026, "dongu6" b): yalnız Yörünge kaldı; öbür üç halka ve önizleme grubu silindi.
#   Ortada "moyo" yazısı, çevresinde üç uygulama kartı (simge + ad + fiil çipi), aralarında yön okları, halkada dolaşan tek nokta.
# yap_c.py runpy ile yükler: sema(K, logo, duzen, onek) -> 'g' (geniş: masaüstü sahnesi, 640 × 400) ve 'd' (dar: telefon / tablet kartı)
# düzenleri için satır içi SVG. Yazılar c-metin.json "sema.kart" anahtarından; yazı tipi sayfadan (Outfit). onek: sayfada her çizim kopyasının
# kimlikleri ayrı olsun (sahne ve kart; gizli kopyadaki clipPath'e başvurulmasın).
# Hareket: .s6-yol (halkada dönen tek nokta, transform), c-18.css; hareket azaltmada durur, nokta yerinde kalır.
# Kural (tur 2): çocuk adımı gerçek hayatta yapar, oyunda işaretler; ebeveyn planlar (kurmaz).
# 22 Kasım 2026 (kullanıcı kararı "Aileyle başlasın"): Moyo Ebeveyn üstte, saat yönünde Moyo Oyun ve Moyo Uzman; uzman isteğe bağlı:
#   kartı ve ona giden / ondan dönen yay kesikli, kartın altında "isteğe bağlı" yazısı (sema.kart.uzman[2]).
import math, html
L, YESIL_K, LAV, CIZGI = '#16113A', '#0A8F3A', '#ECEBFA', '#E3E1EE'
IKON = {'uzman': 'img/ikon-mercek.svg', 'ebeveyn': 'img/ikon-moyo.svg', 'oyun': 'img/ikon-oyun.png'}
LOGO_ORAN = 1113.5 / 2920.4                                             # inline-moyo.svg viewBox (-33.7 -601.7 2920.4 1113.5)
e = html.escape

def n(v): return ('%.1f' % v).rstrip('0').rstrip('.')
def yaz(x, y, s, boy, kalin=400, renk=L, hiza='middle', ek=''):
    return f'<text x="{n(x)}" y="{n(y)}" font-size="{n(boy)}" font-weight="{kalin}" fill="{renk}" text-anchor="{hiza}"{ek}>{e(s)}</text>'
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
def sevron(x, y, aci, b, renk=YESIL_K, kalin=2.4):
    # açık ok ucu (›): küçük boyda da yönü dolu üçgenden daha net okunur (dolu üçgen tarayıcıda "◀" gibi görünüyordu)
    return (f'<path d="M{n(-b * .55)} {n(-b)}L{n(b * .55)} 0L{n(-b * .55)} {n(b)}" transform="translate({n(x)} {n(y)}) rotate({n(aci)})" '
            f'fill="none" stroke="{renk}" stroke-width="{n(kalin)}" stroke-linecap="round" stroke-linejoin="round"/>')
def isaret(x, y, aci, r, b):
    # halkanın üstünde beyaz yuvarlak içinde yön oku (saat yönünde)
    return f'<circle cx="{n(x)}" cy="{n(y)}" r="{n(r)}" fill="#fff" stroke="{CIZGI}"/>' + sevron(x + b * .12 * math.cos(math.radians(aci + 90)), y + b * .12 * math.sin(math.radians(aci + 90)), aci + 90, b, YESIL_K, max(1.8, b * .42))
def kutup(cx, cy, r, aci): return cx + r * math.cos(math.radians(aci)), cy + r * math.sin(math.radians(aci))
def svg(w, h, ic): return f'<svg viewBox="0 0 {w} {h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">{ic}</svg>'

# ---------- Yörünge: ortada "moyo" yazısı, çevresinde üç uygulama kartı (simge + ad + fiil çipi), halkada dolaşan nokta ----------
def cip(x, y, sat, boy, hiza='start'):
    # fiil çipi: açık lavanta zeminli hap; birden çok satır olabilir. (x, y): sol üst ya da üst orta
    gen = max(len(s) for s in sat) * boy * .5 + boy * 1.3       # Outfit 400, Türkçe küçük harf ortalaması ~0,5 em (tarayıcıda denetlendi)
    yuk = len(sat) * boy * 1.25 + boy * .6
    x0 = x if hiza == 'start' else x - gen / 2
    r = f'<rect x="{n(x0)}" y="{n(y)}" width="{n(gen)}" height="{n(yuk)}" rx="{n(min(yuk / 2, boy * .9))}" fill="{LAV}"/>'
    return r + ''.join(yaz(x0 + gen / 2, y + boy * .3 + (i + 1) * boy * 1.25 - boy * .22, s, boy, 600, L) for i, s in enumerate(sat)), gen, yuk
KESIK, GRI, DASH = '#B9B5D3', '#6B6889', ' stroke-dasharray="6 4" stroke-width="1.4"'   # isteğe bağlı kart: kesikli çerçeve, gri not
def yorunge(u, T, logo, dar):
    C = T['kart']
    ops = lambda k: len(C[k]) > 2      # üçüncü öğe varsa ("isteğe bağlı") kart isteğe bağlıdır
    # dar (19 Kasım QA): alttaki iki kart halkanın 38° / 142° noktalarında, aralarında halkanın alt yayı ve yön oku görünür;
    # "moyo" yazısı biraz yukarıda, kartlara değmez; yazılar 390 px'te ≥ 12 px
    if dar: W, H, cx, cy, R = 260, 314, 130, 175, 95          # 314: uzman kartının altındaki "isteğe bağlı" yazısına yer
    else:   W, H, cx, cy, R = 640, 400, 320, 214, 140
    P = {'ebeveyn': (cx, cy - R), 'oyun': kutup(cx, cy, R, 30 if not dar else 34), 'uzman': kutup(cx, cy, R, 150 if not dar else 146)}   # dar: 34° / 146° (alttaki okun iki kart arasında yeri olsun)
    s = golge(u)
    sw = 4 if dar else 5
    # halka: uzmana giden ve ondan dönen yol kesikli (isteğe bağlı), Moyo Ebeveyn → Moyo Oyun yayı düz
    s += f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="{LAV}" stroke-width="{sw}" stroke-dasharray="{n(sw * 2.2)} {n(sw * 1.6)}"/>'
    b0, b1 = kutup(cx, cy, R, -90), kutup(cx, cy, R, 30 if not dar else 34)
    s += f'<path d="M{n(b0[0])} {n(b0[1])}A{R} {R} 0 0 1 {n(b1[0])} {n(b1[1])}" fill="none" stroke="{LAV}" stroke-width="{sw}"/>'
    my = cy - 13 if dar else cy                 # yazının ve açık dairenin merkezi
    s += f'<circle cx="{cx}" cy="{n(my)}" r="{n(R * (.32 if dar else .46))}" fill="#F6F5FE"/>'
    lw = 60 if dar else 132; lh = lw * LOGO_ORAN
    s += f'<svg x="{n(cx - lw / 2)}" y="{n(my - lh * .62)}" width="{n(lw)}" height="{n(lh)}" viewBox="-33.7 -601.7 2920.4 1113.5" color="{L}">{logo}</svg>'
    # dolaşan nokta: tam turu 9 sn; hareket azaltmada solda (Moyo Uzman'dan Moyo Ebeveyn'e dönüş yayında, iki kartın arasında) durur.
    # 19 Kasım 2026 (QA): nokta artık çizginin kesik kaydırmasıyla değil, kendi merkezinde dönen bir <g> ile yürür (c-18.css .s6-yol).
    # Kesik kaydırma 3B dönmüş sahnede her karede yeniden boyama istiyordu; Moyo Oyun kartının solunda harf kırıntıları kalıyordu.
    nx, ny = kutup(cx, cy, R, 180 if not dar else 190)
    s += (f'<g class="s6-yol" style="transform-origin:{n(cx)}px {n(cy)}px"><circle cx="{n(nx)}" cy="{n(ny)}" r="{4.5 if dar else 5.5}" fill="{YESIL_K}"/></g>')
    alt_ok = 90
    if dar:
        # dar: alttaki yay (Moyo Oyun → Moyo Uzman) iki kartın arasında; uzman kartının çipi geniş olduğu için 90°'deki ok kartın altında
        # kalıyordu (22 Kasım QA). Ok, iki kartın iç kenarlarının ortasına denk gelen açıya konur.
        def kenar(k):
            g = max(100, cip(0, 0, C[k][1], 12.5, 'middle')[1] + 14); x = min(max(P[k][0], g / 2 + 4), W - g / 2 - 4)
            return x - g / 2, x + g / 2
        orta = (kenar('uzman')[1] + kenar('oyun')[0]) / 2
        alt_ok = math.degrees(math.acos(max(-1, min(1, (orta - cx) / R))))
    for a in ((-30, 90, 210) if not dar else (-26, alt_ok, 206)):   # üç yay, üç ok: kartların arasında, hiçbiri kartın altında kalmaz
        s += isaret(*kutup(cx, cy, R, a), a, 8 if dar else 10, 4 if dar else 5)
    for k, (x, y) in P.items():
        if dar:   # dar: dikey kart (simge üstte, ad, çip); ad 13,5, çip 12,5 birim (tur 4: 390 px'te ≥ 12,5 px; önceden 12,46)
            ks, bc, ba = 28, 12.5, 13.5
            cs, cg, cy_ = cip(x, 0, C[k][1], bc, 'middle')
            gen = max(100, cg + 14)
            x = min(max(x, gen / 2 + 4), W - gen / 2 - 4)   # kart çizim kutusunda kalsın (uzman kartının çipi geniş; 22 Kasım QA)
            yuk = 10 + ks + 6 + ba + 5 + cy_ + 10
            y0 = y - yuk / 2
            s += f'<rect x="{n(x - gen / 2)}" y="{n(y0)}" width="{n(gen)}" height="{n(yuk)}" rx="16" fill="#fff" stroke="{KESIK if ops(k) else CIZGI}"{DASH if ops(k) else ""} filter="url(#{u}-g)"/>'
            if ops(k): s += yaz(x, y0 + yuk + 14, C[k][2], 12.5, 600, GRI)
            s += karo(u, k, x, y0 + 10 + ks / 2, ks, False)
            s += yaz(x, y0 + 10 + ks + 6 + ba * .85, C[k][0], ba, 800)
            s += cip(x, y0 + 10 + ks + 6 + ba + 5, C[k][1], bc, 'middle')[0]
        else:     # geniş: yatay kart (simge solda, ad ve çip sağda)
            ks, tek = 42, [' '.join(C[k][1])]      # genişte çip tek satır
            _, cg, cy_ = cip(0, 0, tek, 12.5)
            gen = 14 + ks + 12 + max(cg, len(C[k][0]) * 15 * .56) + 16; yuk = max(ks, 18 + 6 + cy_) + 24
            x0, y0 = x - gen / 2, y - yuk / 2
            s += f'<rect x="{n(x0)}" y="{n(y0)}" width="{n(gen)}" height="{n(yuk)}" rx="18" fill="#fff" stroke="{KESIK if ops(k) else CIZGI}"{DASH if ops(k) else ""} filter="url(#{u}-g)"/>'
            if ops(k): s += yaz(x, y0 + yuk + 17, C[k][2], 12.5, 600, GRI)
            s += karo(u, k, x0 + 14 + ks / 2, y, ks, False)
            tx = x0 + 14 + ks + 12; ty = y - (18 + 6 + cy_) / 2
            s += yaz(tx, ty + 14, C[k][0], 15, 800, L, 'start') + cip(tx, ty + 18 + 6, tek, 12.5)[0]
    return svg(W, H, s)

def sema(K, logo, duzen, onek='s6'):
    # duzen: 'g' geniş (sahne) | 'd' dar (kart)
    u = onek + duzen
    return f'<div class="d6" role="img" aria-label="{e(K["dongu"][5]["alt"])}">{yorunge(u, K["sema"], logo, duzen == "d")}</div>'
