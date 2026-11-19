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
# 1) Hakkımızda (19 Kasım 2026 tur 5: kullanıcının gönderdiği örnek "Company" sayfasının yapısıyla yeniden kuruldu)
#    Beş bölüm, sert kenarlı zemin bantları: açılış (beyaz, iki sütun: metin + üç gerçek ekran düz marka şekilleri üstünde)
#    → döngü (lacivert bant, üç beyaz kart, kartların çevresinde bir kez çizilen ince ok; altında not ve açılır kaynak listesi)
#    → neden varız (gri bant, beyaz kart + bir görüşmeden ötekine haftanın şeması, kayıtlar bir kez yanar)
#    → [yalnız önizleme: ekip ve hikâye yer tutucusu, ONIZ:BAS/SON] → iletişim (beyaz, üç çerçeveli bağlantı kartı).
#    Döngü düzeni 19 Kasım 2026 tur 6'da kullanıcı seçimiyle kalıcı: lacivert bant + üç kart (önizleme grubu "kdon" a; b, yuvarlak yol, kalktı).
#    Sayfada önizleme grubu kalmadı: oniz.js ve #oniz-gruplar yüklenmez.
# ======================================================================
H = K['hakkimizda']
LOGO = bul(r'<svg class="logo-svg".*?</svg>', UST).group(0)   # "moyo" yazısı (fill: currentColor)

SIMGELER.update({
    'zarf': '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4.5 7.5 7.5 5.5 7.5-5.5"/>',
    'kisi': '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 19.5c.9-3.5 3.6-5.4 7-5.4s6.1 1.9 7 5.4"/>',
})


def ust(s):
    """Bölüm üstündeki küçük, büyük harfli etiket."""
    return f'<p class="kh-ust">{e(s)}</p>'


def kolaj(ekranlar):
    """Açılışın sağ sütunu: düz marka şekilleri (lacivert, yeşil, yumuşak gri) üstünde üç gerçek ekran, hafif üst üste."""
    sekil = ''.join(f'<span class="kh-sekil kh-s{i}"></span>' for i in (1, 2, 3))
    img = ''.join(f'<img class="kh-ek kh-ek-{x["k"]}" src="{x["img"]}" alt="{e(x["alt"])}" width="{x["en"]}" height="{x["boy"]}" decoding="async">'
                  for x in ekranlar)
    return f'<div class="kh-kolaj" role="group" aria-label="{e(H["kolaj_etiket"])}">{sekil}{img}</div>'


def kd_ok():
    """Döngünün yön oku: çizginin ucundaki ok başı; yönü CSS verir (--kd-yon)."""
    return (f'<span class="kd-ok" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M9.5 6.5 15 12l-5.5 5.5" fill="none" '
            'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>')


def dongu_bolumu(D):
    """Açılışın altındaki döngü: üç durak (Çocuk, Ebeveyn, Uzman), her birinde gerçek ekran, "burada ne olur" satırı ve dayandığı araştırma.
    Lacivert bant, yan yana üç kart (k.css "Döngü"); geçiş yazıları kartların üstünde ve altında köşeli çizgilerin üstünde
    (Çocuk → Ebeveyn, Ebeveyn → Uzman üstte; Uzman → Çocuk altta), çizgiler bir kez çizilir. Dar ekranda kartlar alt alta.
    Araştırma cümlelerindeki [[Anahtar]] işaretleri sayfanın atıf adımında numaralanır; kaynak listesi {KAYNAK_LISTESI} yerine konur."""
    duraklar = []
    for d in D['duraklar']:
        rozet = f'<span class="gizli">, </span><span class="kd-rozet">{e(D["istege_etiket"])}</span>' if d.get('istege') else ''
        x = d['ekran']
        ekran = f'<img src="{x["img"]}" alt="{e(x["alt"])}" loading="lazy" decoding="async">'
        if x.get('dar'):   # dar kırpım (geniş tablo dar kartta okunmuyor); hangisinin görüneceğini k.css seçer, gizli olan indirilmez
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
    # Okuma sırası: Çocuk, geçiş, Ebeveyn, geçiş, Uzman, dönüş (görünür yerleri ızgara alanlarıyla, k.css).
    return (f'<section class="kd" id="dongu" aria-labelledby="h-dongu">\n  <div class="kd-ic">\n'
            f'    <div class="kh-bas kd-ust">{ust(D["etiket"])}<h2 id="h-dongu">{e(D["baslik"])}</h2><p>{e(D["alt"])}</p></div>\n'
            f'    <div class="kd-izgara" data-gor>\n'
            f'      {duraklar[0]}\n      {g1}\n      {duraklar[1]}\n      {g2}\n      {duraklar[2]}\n      {g3}\n    </div>\n'
            f'    <p class="kd-not">{e(D["not"])}</p>\n    {{KAYNAK_LISTESI}}\n  </div>\n</section>')


# Bir kez görünür olunca: döngünün okları çizilir (a), haftanın kayıtları soldan sağa yanar. Sayfa açılırken zaten görünen parça,
# hareket azaltma ve eski tarayıcı: durağan son hâl (CSS yalnız .bekle / .goster sınıflarına bağlı).
GOR_JS = r"""<script>/* bir kez görünür olunca çizilir / yanar */(function () {
  if (!window.IntersectionObserver || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var io = new IntersectionObserver(function (l) {
    l.forEach(function (g) {
      if (!g.isIntersecting) return;
      io.unobserve(g.target);
      g.target.classList.add('goster'); g.target.classList.remove('bekle');
    });
  }, { rootMargin: '0px 0px -18% 0px' });
  [].forEach.call(document.querySelectorAll('[data-gor]'), function (el) {
    if (el.getBoundingClientRect().top < innerHeight * .82) return;
    el.classList.add('bekle'); io.observe(el);
  });
})();</script>
"""


def kaynak_blogu(sira):
    """Döngünün altındaki açılır kaynak listesi: yalnız sayfada anılan kaynaklar, ilk geçiş sırasıyla."""
    liste = ''.join(f'<li id="kaynak-{i}">{kunye(K["kaynaklar"][k])}</li>' for i, k in enumerate(sira, 1))
    return (f'<details class="k-kaynak-ac" id="kaynak-ac">\n      <summary><span>{e(H["kaynak_baslik"])} ({len(sira)})</span></summary>\n'
            f'      <p class="k-kaynak-not">{e(H["kaynak_metin"])}</p>\n      <ol class="k-kaynaklar">{liste}</ol>\n    </details>')


def hafta_semasi(HF):
    """Neden varız: bir görüşmeden sonrakine bir hafta (yalnız HTML, ürün ekranı değil). Sütunlar: görüşme, altı ev günü, görüşme.
    Satırlar: Hafıza (yalnız son günler, soluk), Kayıt (her gün; bir kez soldan sağa yanar), kalın hafta çizgisi, gün adları."""
    n = len(HF['gunler'])                       # 8: iki uçta görüşme günü
    ev = range(1, n - 1)
    bos = '<span class="kh-hf-bos"></span>'

    def satir(tur, ad, dolu):
        hucre = ''.join('<span class="kh-hf-h"></span>' if i in (0, n - 1) else
                        (f'<span class="kh-hf-h"><i class="kh-is kh-is-{tur}" style="--i:{i - 1}"></i></span>' if i in dolu else
                         '<span class="kh-hf-h"></span>') for i in range(n))
        return f'<span class="kh-cip kh-cip-{tur}">{e(ad)}</span>{hucre}'

    uc = {0: ' kh-hf-uc kh-hf-ilk', n - 1: ' kh-hf-uc kh-hf-son'}
    cizgi = ''.join(f'<span class="kh-hf-c{uc.get(i, "")}"></span>' for i in range(n))
    adlar = ''.join(f'<span class="kh-hf-g{" kh-hf-uc" if i in (0, n - 1) else ""}">{e(g)}'
                    + (f'<small>{e(HF["gorusme"])}</small>' if i in (0, n - 1) else '') + '</span>'
                    for i, g in enumerate(HF['gunler']))
    acik = ''.join(f'<li><b>{e(ad)}:</b> {e(m)}</li>' for ad, m in HF['acik'])
    return (f'<figure class="kh-hafta" data-gor><div class="kh-hf" role="img" aria-label="{e(HF["etiket"])}">'
            + satir('h', HF['hafiza'], set(HF['hafiza_gun'])) + satir('k', HF['kayit'], set(ev))
            + bos + cizgi + bos + adlar
            + f'</div><figcaption><ul class="kh-hf-acik">{acik}</ul></figcaption></figure>')


def ekip_bolumu(EK):
    """Yalnız önizleme (ONIZ:BAS/SON, canlıya taşınmaz): açılışın aynası; solda büyük "moyo" yazısı, sağda kullanıcıdan istenenler."""
    maddeler = ''.join(f'<li>{e(m)}</li>' for m in EK['maddeler'])
    return ('<!-- ONIZ:BAS -->\n<section class="kh-ekip" id="ekip" aria-labelledby="h-ekip">\n  <div class="ic kh-ekip-ic">'
            f'<div class="kh-ekip-pano" aria-hidden="true">{LOGO}</div>'
            f'<div class="kh-ekip-metin"><p class="kh-yer-not">{e(EK["not"])}</p><h2 id="h-ekip">{e(EK["baslik"])}</h2>'
            f'<p>{e(EK["metin"])}</p><ul>{maddeler}</ul></div></div>\n</section>\n<!-- ONIZ:SON -->')


def iletisim_karti(c):
    link = yer(c['link'])
    dis_mi = link.startswith('http')
    yeni = '<span class="gizli"> (yeni sekmede açılır)</span>' if dis_mi else ''
    return (f'<li><a class="kh-git" href="{link}"{dis(link)}><span class="kh-git-ikon">{svg(SIMGELER[c["ikon"]], 26)}</span>'
            f'<h3>{e(c["ad"])}</h3><p>{e(c["metin"])}</p>'
            f'<span class="kh-git-alt">{e(c["link_ad"])}{yeni}{svg(SIMGELER["dis" if dis_mi else "ok"], 20)}</span></a></li>')


N, IL = H['neden'], H['iletisim']
neden_p = ''.join(f'<p>{e(p)}</p>' for p in N['metin'])
govde_h = (f'''<main id="icerik">
<section class="kh-acilis" aria-labelledby="h1">
  <div class="ic kh-acilis-ic">
    <div class="kh-acilis-metin">
      {ust(H["etiket"])}
      <h1 id="h1">{e(H["h1"])}</h1>
      <p class="kh-alt">{e(H["alt"])}</p>
      <p class="kh-ince">{e(H["ince"])}</p>
    </div>
    {kolaj(H["acilis_ekranlar"])}
  </div>
</section>

{dongu_bolumu(H["dongu"])}

<section class="kh-neden" id="neden" aria-labelledby="h-neden">
  <div class="ic kh-neden-ic">
    <div class="kh-neden-kart">
      {ust(N["etiket"])}
      <h2 id="h-neden">{e(N["baslik"])}</h2>
      {neden_p}
      <p class="kh-vurgu">{e(N["vurgu"])}</p>
    </div>
    {hafta_semasi(N["hafta"])}
  </div>
</section>

{ekip_bolumu(H["ekip"])}

<section class="kh-iletisim" id="iletisim" aria-labelledby="h-iletisim">
  <div class="ic">
    <div class="kh-bas">{ust(IL["etiket"])}<h2 id="h-iletisim">{e(IL["baslik"])}</h2></div>
    <ul class="kh-kartlar">{"".join(iletisim_karti(c) for c in IL["kartlar"])}</ul>
  </div>
</section>
</main>
''')
govde_h, sira = atiflar(govde_h, K['kaynaklar'])
fazla = sorted(set(K['kaynaklar']) - set(sira))
assert not fazla, f'k-metin.json içinde anılmayan kaynak: {fazla}'
assert govde_h.count('{KAYNAK_LISTESI}') == 1
govde_h = govde_h.replace('{KAYNAK_LISTESI}', kaynak_blogu(sira))
ATIF_JS = ('<script>/* atıf numarasına basınca kapalı kaynak listesi açılır */(function () {\n'
           "  var d = document.getElementById('kaynak-ac');\n"
           "  function ac() { if (d && /^#kaynak-\\d+$/.test(location.hash)) d.open = true; }\n"
           "  document.addEventListener('click', function (ev) { if (d && ev.target.closest && ev.target.closest('a[href^=\"#kaynak-\"]')) d.open = true; });\n"
           "  addEventListener('hashchange', ac); ac();\n"
           '})();</script>\n')
govde_h += ATIF_JS + GOR_JS
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
