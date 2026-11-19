# Kurumsal sayfalar (18-19 Kasım 2026): hakkimizda.html ve guven.html (canlıda moyoapp.com.tr /hakkimizda/, /guven/).
# Metinler k-metin.json, stil k.css. Üst bilgi, alt bilgi, sekme simgesi ve stil katmanları her derlemede c.html'den alınır:
# çatı sayfa değişince yalnız `python3 yap_k.py` yeniden çalıştırılır.
# Ayrıca k-sitemap.xml ve k-robots.txt (dışa aktarırken sitemap.xml / robots.txt olur).
# Kullanım: cd tools/cati-sayfa && python3 yap_c.py && python3 yap_k.py
import html, json, os, re

os.chdir(os.path.dirname(os.path.abspath(__file__)))
K = json.load(open('k-metin.json', encoding='utf-8'))
C = open('c.html', encoding='utf-8').read()
MERCEK_GUVEN = 'https://mercek.moyoapp.com.tr/guvenlik'   # önizleme kabuğunda Mercek güvenlik sekmesi yok; kilitli canlı sayfa
LASTMOD = '2026-11-19'


# ---------- c.html'den alınanlar ----------
def bul(desen, s=C, bayrak=re.S):
    m = re.search(desen, s, bayrak)
    if not m:
        raise SystemExit(f'c.html içinde bulunamadı: {desen}')
    return m


def sadelestir(parca):
    """Önizleme seçicilerini at; c.html'deki alternatiflerden yalnız görüneni (hidden olmayanı) bırak."""
    parca = re.sub(r'<(\w+)\b[^>]*\bclass="[^"]*\b(?:alt-secici|nk-secici)\b[^"]*"[^>]*>.*?</\1>', '', parca, flags=re.S)
    parca = re.sub(r'<(\w+)\b[^>]*\bdata-var="[^"]*"[^>]*\bhidden\b[^>]*>.*?</\1>', '', parca, flags=re.S)
    return re.sub(r'\sdata-var="[^"]*"', '', parca)


def capa(parca):
    """Sayfa içi çapalar çatı sayfaya gider (#x -> c.html#x); boş "#" (Giriş, deneme) dışa aktarmada dolar, logo ana sayfaya."""
    parca = parca.replace('<a class="logo" href="#"', '<a class="logo" href="c.html"')
    return re.sub(r'href="#([^"]+)"', r'href="c.html#\1"', parca)


UST = capa(sadelestir(bul(r'<header class="ust">.*?</header>').group(0)))
ALT = capa(sadelestir(bul(r'<footer class="altb">.*?</footer>').group(0)))
SIMGE = bul(r'<link rel="icon"[^>]*>').group(0)
STILLER = re.findall(r'<link rel="stylesheet" href="([^"]+)">', C)
SITE = bul(r'href="([^"]*)yasal/gizlilik"').group(1)                    # yasal ve destek bağlantılarının kökü
MERCEK = bul(r'<a href="([^"]+)"[^>]*>Moyo Uzman</a>', ALT).group(1)    # alt bilgideki Moyo Uzman bağlantısı
assert 'menu.js' in C, 'c.html menu.js kullanmıyor'


def yer(s):
    return s.replace('{SITE}', SITE).replace('{MERCEK_GUVEN}', MERCEK_GUVEN).replace('{MERCEK}', MERCEK)


def dis(href):
    return ' target="_blank" rel="noopener"' if href.startswith('http') else ''


def e(s):
    return html.escape(s, quote=True)


def bas(sayfa, s, gruplar=None, html_ek=''):
    """<head> + üst bilgi. gruplar: önizleme alternatifleri (oniz.js sözleşmesi)."""
    css = ''.join(f'<link rel="stylesheet" href="{x}">' for x in STILLER + ['k.css'])
    oniz = ''
    if gruplar:
        oniz = (f'<script type="application/json" id="oniz-gruplar">{json.dumps(gruplar, ensure_ascii=False)}</script>'
                '<script src="oniz.js"></script>')
    return f'''<!doctype html><html lang="tr"{html_ek}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(s["title"])}</title>
<meta name="description" content="{e(s["aciklama"])}">
<link rel="canonical" href="{s["kanonik"]}">
<meta property="og:type" content="website"><meta property="og:locale" content="tr_TR"><meta property="og:site_name" content="Moyo"><meta property="og:url" content="{s["kanonik"]}">
<meta property="og:title" content="{e(s["og_baslik"])}"><meta property="og:description" content="{e(s["og_aciklama"])}">
{SIMGE}{css}
{oniz}</head><body class="sayfa-c beyaz sayfa-k k-{sayfa}">
<a class="k-atla" href="#icerik">İçeriğe geç</a>
{UST}
'''


def son(sayfa):
    alt = ALT.replace(f'href="{sayfa}.html"', f'href="{sayfa}.html" aria-current="page"')
    return f'{alt}\n<script src="menu.js"></script>\n</body></html>\n'


# ---------- simgeler (satır içi, çizgi) ----------
def svg(yol, boy=24):
    return (f'<svg viewBox="0 0 24 24" width="{boy}" height="{boy}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" '
            f'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{yol}</svg>')


SIMGELER = {
    'kalkan': '<path d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6l-7-2.5Z"/><path d="m9 12 2.2 2.2L15.3 10"/>',
    'tik': '<path d="m5.5 12.5 4 4 9-9"/>',
    'yok': '<path d="M6.5 12h11"/>',
    'ok': '<path d="M5 12h13M13 6.5 18.5 12 13 17.5"/>',
    'dis': '<path d="M14 5h5v5M19 5l-8 8"/><path d="M17 13.5V19H5V7h5.5"/>',
}


def ikon_img(src, boy, cls='k-ikon'):
    return f'<img class="{cls}" src="{src}" alt="" width="{boy}" height="{boy}">'


# ---------- kaynak işaretleri ----------
def atiflar(govde, kaynaklar):
    """[[A, B]] -> [1, 2] bağlantıları; numara sayfadaki ilk geçişe göre. Dönüş: (gövde, sıralı anahtarlar)."""
    sira = []

    def no(k):
        if k not in kaynaklar:
            raise SystemExit(f'bilinmeyen kaynak: {k}')
        if k not in sira:
            sira.append(k)
        return sira.index(k) + 1

    def degis(m):
        nolar = [no(k.strip()) for k in m.group(1).split(',')]
        icerik = ', '.join(f'<a href="#kaynak-{n}" aria-label="Kaynak {n}">{n}</a>' for n in nolar)
        return f'<span class="atif">[{icerik}]</span>'

    return re.sub(r'\s*\[\[([^\]]+)\]\]', lambda m: '&nbsp;' + degis(m), govde), sira


def kunye(k):
    s = re.sub(r'\*([^*]+)\*', r'<i>\1</i>', k['kunye'])
    doi = f'https://doi.org/{k["doi"]}'
    s += f' <a href="{doi}" target="_blank" rel="noopener">{doi}</a>'
    if k.get('pmid'):
        s += f' · <a href="https://pubmed.ncbi.nlm.nih.gov/{k["pmid"]}/" target="_blank" rel="noopener">PubMed {k["pmid"]}</a>'
    return s


# ======================================================================
# 1) Hakkımızda (19 Kasım 2026 tur 2: araştırma yazısından gerçek bir Hakkımızda sayfasına; tur 4: döngü)
#    Sıra: açılış (misyon) → döngü (Çocuk, Ebeveyn, Uzman: gerçek ekran + ne olur + dayandığı araştırma; altında not ve
#    açılır kaynak listesi) → neden varız (bir haftanın şeması) → [yalnız önizleme: ekip ve hikâye yer tutucusu, ONIZ:BAS/SON]
#    → iletişim (destek formu + üç kart).
#    Tur 4 (kullanıcı kararları 19 Kasım 2026): başlık "kbas" b tek sürüm; "Dürüst olmak gerekirse", "Neye inanıyoruz" (kdzn) ve
#    "Bir araya getirdiklerimiz" (5 adım) kalktı; açılıştaki üç uygulama çipi de kalktı (döngü aynı üç uygulamayı simge ve adlarıyla gösteriyor).
# ======================================================================
H = K['hakkimizda']


def kd_ok(ek=''):
    """Döngünün yön oku: lacivert yuvarlak içinde beyaz ok ucu; yönü CSS verir (--kd-yon)."""
    return (f'<span class="kd-ok{ek}" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M9.5 6.5 15 12l-5.5 5.5" fill="none" '
            'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>')


def dongu_bolumu(D):
    """Açılışın altındaki döngü: kendi içinde bir bölüm (k.css "Döngü" bloğu, sınıf öneki kd-, betik DONGU_JS); taşınabilir.
    Masaüstünde (≥ 1000 px) iki durak üstte, Uzman altta; köşeleri yuvarlak bir yol üçünü sırayla bağlar (Çocuk → Ebeveyn → Uzman → Çocuk),
    ortasında açılış başlığının fikri ("Düzen ve kayıt"). Dar ekranda duraklar alt alta; yol solda aşağı iner, altta ortadaki yazıdan geçer,
    sağda yukarı döner. Yol CSS kenarlığıdır (betiksiz de görünür); yolda yavaş dolaşan nokta betikle çizilir, hareket azaltmada yoktur.
    Araştırma cümlelerindeki [[Anahtar]] işaretleri sayfanın atıf adımında numaralanır; kaynak listesi {KAYNAK_LISTESI} yerine konur."""
    duraklar = []
    for d in D['duraklar']:
        rozet = f'<span class="gizli">, </span><span class="kd-rozet">{e(D["istege_etiket"])}</span>' if d.get('istege') else ''
        x = d['ekran']
        ekran = f'<img src="{x["img"]}" alt="{e(x["alt"])}" loading="lazy" decoding="async">'
        if x.get('dar'):   # telefonda daha dar bir kırpım (geniş tablo 270 px'te okunmuyor); gizli olan tembel yüklendiği için indirilmez
            ekran = (ekran.replace('<img ', '<img class="kd-gen" ', 1)
                     + f'<img class="kd-dar" src="{x["dar"]}" alt="{e(x["alt"])}" loading="lazy" decoding="async">')
        duraklar.append(
            f'<article class="kd-dur kd-{d["k"]}" aria-labelledby="h-kd-{d["k"]}">'
            f'<h3 class="kd-bas" id="h-kd-{d["k"]}">{ikon_img(d["ikon"], 44, "kd-ikon")}<span class="kd-kim">{e(d["kim"])}'
            f'<span class="gizli">: </span><small>{e(d["uygulama"])}</small></span>{rozet}</h3>'
            f'<p class="kd-ne">{e(d["ne"])}</p>'
            f'<figure class="kd-ekran">{ekran}</figure>'
            f'<p class="kd-ars"><span class="kd-ars-et">{e(D["ars_etiket"])}</span> {d["ars"]}</p></article>')
    g1, g2, g3 = (f'<p class="kd-gecis kd-g{i}">{kd_ok()}<span>{e(t)}</span></p>' for i, t in enumerate(D['gecisler'], 1))
    # Okuma sırası: Çocuk, geçiş, Ebeveyn, geçiş, Uzman, dönüş, ortadaki yazı (görünür yerleri ızgara alanlarıyla, k.css).
    return (f'<section class="kd" id="dongu" aria-labelledby="h-dongu">\n  <div class="kd-ic">\n'
            f'    <h2 class="gizli" id="h-dongu">{e(D["baslik"])}</h2>\n'
            f'    <div class="kd-izgara">\n      <div class="kd-yol" aria-hidden="true">{kd_ok(" kd-ok-don")}</div>\n'
            f'      {duraklar[0]}\n      {g1}\n      {duraklar[1]}\n      {g2}\n      {duraklar[2]}\n      {g3}\n'
            f'      <p class="kd-merkez">{e(D["merkez"])}</p>\n    </div>\n'
            f'    <p class="kd-not">{e(D["not"])}</p>\n    {{KAYNAK_LISTESI}}\n  </div>\n</section>')


# Döngünün yolundaki nokta: yolun (.kd-yol, CSS kenarlığı) orta çizgisi ölçülüp SVG yolu çizilir, nokta animateMotion ile yürür
# (masaüstünde saat yönünde, dar ekranda tersine: akışın yönü). Boyut değişince yeniden çizilir; hareket azaltmada nokta yok.
DONGU_JS = r"""<script>/* döngü: yolda yavaş dolaşan nokta (hareket azaltmada yok) */(function () {
  var yol = document.querySelector('.kd-yol'); if (!yol || !window.ResizeObserver) return;
  var az = matchMedia('(prefers-reduced-motion: reduce)'), dar = matchMedia('(max-width: 999px)'), NS = 'http://www.w3.org/2000/svg', svg = null, bek = 0;
  function ciz() {
    bek = 0; if (svg) { svg.remove(); svg = null; }
    if (az.matches) return;
    var cs = getComputedStyle(yol), b = parseFloat(cs.borderTopWidth) || 0, w = yol.offsetWidth, h = yol.offsetHeight;
    var r = Math.max(0, Math.min(parseFloat(cs.borderTopLeftRadius) || 0, w / 2, h / 2) - b / 2), x = b / 2, y = b / 2, W = w - b, H = h - b;
    if (W <= 2 * r || H <= 2 * r) return;
    var d = 'M' + (x + r) + ' ' + y + 'H' + (x + W - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + W) + ' ' + (y + r) + 'V' + (y + H - r) +
            'A' + r + ' ' + r + ' 0 0 1 ' + (x + W - r) + ' ' + (y + H) + 'H' + (x + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + (y + H - r) +
            'V' + (y + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y + 'Z';
    var uzun = 2 * (W + H - 4 * r) + 2 * Math.PI * r;
    svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'kd-nokta'); svg.setAttribute('width', w); svg.setAttribute('height', h);
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    var c = document.createElementNS(NS, 'circle'); c.setAttribute('r', '7');
    var m = document.createElementNS(NS, 'animateMotion');
    m.setAttribute('dur', Math.round(uzun / 70) + 's'); m.setAttribute('repeatCount', 'indefinite'); m.setAttribute('path', d);
    if (dar.matches) { m.setAttribute('keyPoints', '1;0'); m.setAttribute('keyTimes', '0;1'); m.setAttribute('calcMode', 'linear'); }
    c.appendChild(m); svg.appendChild(c); yol.appendChild(svg);
  }
  function iste() { if (!bek) bek = requestAnimationFrame(ciz); }
  new ResizeObserver(iste).observe(yol);
  az.addEventListener('change', iste); dar.addEventListener('change', iste);
})();</script>
"""


def kaynak_blogu(sira):
    """Döngünün altındaki açılır kaynak listesi: yalnız sayfada anılan kaynaklar, ilk geçiş sırasıyla."""
    liste = ''.join(f'<li id="kaynak-{i}">{kunye(K["kaynaklar"][k])}</li>' for i, k in enumerate(sira, 1))
    return (f'<details class="k-kaynak-ac" id="kaynak-ac">\n      <summary><span>{e(H["kaynak_baslik"])} ({len(sira)})</span></summary>\n'
            f'      <p class="k-kaynak-not">{e(H["kaynak_metin"])}</p>\n      <ol class="k-kaynaklar">{liste}</ol>\n    </details>')


# Neden varız: bir haftanın şeması (yalnız HTML; ürün ekranı değil). r = rutin adımı, rz = zor an olan rutin, g = görüşme.
HAFTA = [['r', 'r', 'r'], ['r', 'rz', 'r'], ['r', 'g', 'r', 'r'], ['r', 'r', 'r'], ['r', 'r', 'r'], ['r', 'rz'], ['r', 'r']]
HF = H['hafta']
gunler = ''.join(
    f'<div class="k-gun"><span class="k-gun-ad">{g}</span>'
    + ''.join(f'<i class="k-h-{x[0]}">{"<b></b>" if "z" in x else ""}{"<em>" + e(HF["gorusme"]) + "</em>" if x == "g" else ""}</i>'
              for x in HAFTA[i]) + '</div>'
    for i, g in enumerate(HF['gunler']))
acik = ''.join(f'<li><i class="k-h-{t}">{"<b></b>" if t == "z" else ""}</i><span><b>{e(ad)}</b> {e(n)}</span></li>'
               for t, ad, n in HF['acik'])
hafta = (f'<figure class="k-hafta"><div class="k-hafta-izgara" role="img" aria-label="{e(HF["etiket"])}">{gunler}</div>'
         f'<figcaption><ul class="k-hafta-acik">{acik}</ul></figcaption></figure>')

EK = H['ekip']
ekip_maddeler = ''.join(f'<li>{e(m)}</li>' for m in EK['maddeler'])
ekip = ('<!-- ONIZ:BAS -->\n<section class="k-bolum k-ekip" id="ekip" aria-labelledby="h-ekip">\n  <div class="ic k-dar"><div class="k-yer">'
        f'<p class="k-yer-not">{e(EK["not"])}</p><h2 id="h-ekip">{e(EK["baslik"])}</h2><p>{e(EK["metin"])}</p>'
        f'<ul>{ekip_maddeler}</ul></div></div>\n</section>\n<!-- ONIZ:SON -->')


def kapanis_karti(c):
    link = yer(c['link'])
    ikon = (f'<span class="k-git-ikon svg">{svg(SIMGELER["kalkan"], 28)}</span>' if c['ikon'] == 'kalkan'
            else ikon_img(c['ikon'], 52, 'k-git-ikon'))
    yeni = '<span class="gizli"> (yeni sekmede açılır)</span>' if link.startswith('http') else ''
    oku = svg(SIMGELER['dis' if link.startswith('http') else 'ok'], 20)
    return (f'<li><a class="k-git k-{c["renk"]}" href="{link}"{dis(link)}>{ikon}<span class="k-git-ust">{e(c["ust"])}</span>'
            f'<h3>{e(c["ad"])}</h3><p>{e(c["metin"])}</p>'
            f'<span class="k-git-alt">{e(c["link_ad"])}{yeni}{oku}</span></a></li>')


neden_p = ''.join(f'<p>{e(p)}</p>' for p in H['neden_metin'])
govde_h = (f'''<main id="icerik">
<section class="k-acilis k-acilis-dongu" aria-labelledby="h1">
  <div class="ic">
    <p class="k-etiket">{e(H["etiket"])}</p>
    <h1 id="h1">{e(H["h1"])}</h1>
    <p class="k-alt">{e(H["alt"])}</p>
    <p class="k-ince">{e(H["ince"])}</p>
  </div>
</section>

{dongu_bolumu(H["dongu"])}

<section class="k-bolum k-sis k-neden" id="neden" aria-labelledby="h-neden">
  <div class="ic k-neden-ic">
    <div class="k-neden-metin">
      <p class="k-etiket">{e(H["neden_etiket"])}</p>
      <h2 id="h-neden">{e(H["neden_baslik"])}</h2>
      {neden_p}
      <p class="k-vurgu">{e(H["neden_vurgu"])}</p>
    </div>
    {hafta}
  </div>
</section>

{ekip}
''')
govde_h, sira = atiflar(govde_h, K['kaynaklar'])
fazla = sorted(set(K['kaynaklar']) - set(sira))
assert not fazla, f'k-metin.json içinde anılmayan kaynak: {fazla}'
assert govde_h.count('{KAYNAK_LISTESI}') == 1
govde_h = govde_h.replace('{KAYNAK_LISTESI}', kaynak_blogu(sira))
kartlar = ''.join(kapanis_karti(c) for c in H['kapanis'])
destek = yer(H['iletisim_link'])
ATIF_JS = ('<script>/* atıf numarasına basınca kapalı kaynak listesi açılır */(function () {\n'
           "  var d = document.getElementById('kaynak-ac');\n"
           "  function ac() { if (d && /^#kaynak-\\d+$/.test(location.hash)) d.open = true; }\n"
           "  document.addEventListener('click', function (ev) { if (d && ev.target.closest && ev.target.closest('a[href^=\"#kaynak-\"]')) d.open = true; });\n"
           "  addEventListener('hashchange', ac); ac();\n"
           '})();</script>\n')
govde_h += (f'''
<section class="k-bolum k-sis k-iletisim" id="iletisim" aria-labelledby="h-iletisim">
  <div class="ic">
    <div class="k-bas"><h2 id="h-iletisim">{e(H["iletisim_baslik"])}</h2><p>{e(H["iletisim_metin"])}</p>
      <a class="k-destek" href="{destek}"{dis(destek)}>{e(H["iletisim_link_ad"])}{svg(SIMGELER["ok"], 20)}</a></div>
    <ul class="k-gitler">{kartlar}</ul>
  </div>
</section>
</main>
{ATIF_JS}{DONGU_JS}''')
govde_h = govde_h.replace('e-posta', 'e-&#8288;posta')   # "e-" satır sonunda kalmasın (sözcük birleştirici)
open('hakkimizda.html', 'w', encoding='utf-8').write(bas('hakkimizda', H) + govde_h + son('hakkimizda'))


# ======================================================================
# 2) Güvenlik ve gizlilik
# ======================================================================
G = K['guven']


def bolum_bas(b, ikon=True):
    uyg = ''
    if ikon and b.get('ikon'):
        uyg = f'<p class="k-uyg">{ikon_img(b["ikon"], 22, "k-uyg-ikon")}<span>{e(b["uygulama"])}</span></p>'
    return f'{uyg}<h2 id="h-{b["id"]}">{e(b["baslik"])}</h2>'


def maddeler(b):
    li = ''.join(f'<li><span class="k-tik">{svg(SIMGELER["tik"], 16)}</span><div><b>{e(t)}</b> {e(m)}</div></li>' for t, m in b['maddeler'])
    return f'<ul class="k-madde">{li}</ul>'


U = G['uzman']
gorur = ''.join(f'<li><span class="k-tik">{svg(SIMGELER["tik"], 16)}</span>{e(x)}</li>' for x in U['gorur'])
gormez = ''.join(f'<li><span class="k-tik yok">{svg(SIMGELER["yok"], 16)}</span>{e(x)}</li>' for x in U['gormez'])
veri = ''.join(f'<li>{yer(x)}</li>' for x in G['veri']['maddeler'])
yasal = ''.join(f'<li><a href="{yer(h)}"{dis(yer(h)) if not yer(h).startswith(SITE) else ""}><span>{e(ad)}'
                f'{f"<small>{e(n)}</small>" if n else ""}</span>{svg(SIMGELER["ok"], 20)}</a></li>'
                for ad, h, n in G['yasal']['baglantilar'])
nav = ''.join(f'<a href="#{b["id"]}">{e(b.get("kisa", b["baslik"]))}</a>'
              for b in (G['cocuk'], G['aile'], {'id': 'uzman', 'baslik': 'Uzmanınız neyi görür'}, {'id': 'veri', 'baslik': 'Verileriniz'},
                        G['degil'], {'id': 'yasal', 'baslik': 'Yasal metinler'}))

govde_g = f'''<main id="icerik">
<section class="k-acilis k-sol" aria-labelledby="h1">
  <div class="ic k-dar">
    <p class="k-etiket">{e(G["etiket"])}</p>
    <h1 id="h1">{e(G["h1"])}</h1>
    <p class="k-alt">{e(G["giris"])}</p>
    <nav class="k-bu" aria-label="{e(G["bu_sayfada"])}"><span>{e(G["bu_sayfada"])}</span>{nav}</nav>
  </div>
</section>

<div class="ic k-dar k-guven-govde">
  <section class="k-g" id="{G["cocuk"]["id"]}" aria-labelledby="h-{G["cocuk"]["id"]}">{bolum_bas(G["cocuk"])}{maddeler(G["cocuk"])}</section>
  <section class="k-g" id="{G["aile"]["id"]}" aria-labelledby="h-{G["aile"]["id"]}">{bolum_bas(G["aile"])}{maddeler(G["aile"])}</section>
  <section class="k-g" id="{U["id"]}" aria-labelledby="h-{U["id"]}">{bolum_bas(U)}
    <div class="k-gorur">
      <div class="k-kutu evet"><h3>{e(U["gorur_baslik"])} <small>{e(U["gorur_ek"])}</small></h3><ul>{gorur}</ul></div>
      <div class="k-kutu hayir"><h3>{e(U["gormez_baslik"])}</h3><ul>{gormez}</ul></div>
    </div>
    <p class="k-not">{e(U["not"])}</p>
  </section>
  <section class="k-g" id="{G["veri"]["id"]}" aria-labelledby="h-{G["veri"]["id"]}">{bolum_bas(G["veri"])}<ul class="k-liste">{veri}</ul></section>
  <section class="k-g" id="{G["degil"]["id"]}" aria-labelledby="h-{G["degil"]["id"]}">{bolum_bas(G["degil"])}<p class="k-degil">{e(G["degil"]["metin"])}</p></section>
  <section class="k-g" id="{G["yasal"]["id"]}" aria-labelledby="h-{G["yasal"]["id"]}">{bolum_bas(G["yasal"])}<ul class="k-yasal">{yasal}</ul>
    <p class="k-son">{yer(G["son"])}</p>
  </section>
</div>
</main>
'''
open('guven.html', 'w', encoding='utf-8').write(bas('guven', G) + govde_g + son('guven'))


# ======================================================================
# 3) sitemap ve robots (dışa aktarırken sitemap.xml / robots.txt)
# ======================================================================
KOK = 'https://moyoapp.com.tr'
yollar = ['/', '/ebeveyn/', '/ebeveyn/fiyat/', '/hakkimizda/', '/guven/']
open('k-sitemap.xml', 'w', encoding='utf-8').write(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + ''.join(f'  <url><loc>{KOK}{y}</loc><lastmod>{LASTMOD}</lastmod></url>\n' for y in yollar) + '</urlset>\n')
open('k-robots.txt', 'w', encoding='utf-8').write(f'User-agent: *\nAllow: /\n\nSitemap: {KOK}/sitemap.xml\n')

for ad, s in (('hakkimizda', H), ('guven', G)):
    assert len(s['aciklama']) <= 155, f'{ad}: açıklama {len(s["aciklama"])} karakter'
print('ok · hakkimizda.html (%d kaynak) · guven.html · k-sitemap.xml · k-robots.txt' % len(sira))
