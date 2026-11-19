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
    'kitap': '<path d="M12 6.5C10.2 5.2 7.8 4.6 4 4.6v13.2c3.8 0 6.2.6 8 1.9 1.8-1.3 4.2-1.9 8-1.9V4.6c-3.8 0-6.2.6-8 1.9Z"/><path d="M12 6.5v13.2"/>',
    'bag': '<path d="M10 14a4 4 0 0 1 0-5.7l2.3-2.3a4 4 0 0 1 5.7 5.7l-1.2 1.2"/><path d="M14 10a4 4 0 0 1 0 5.7l-2.3 2.3A4 4 0 0 1 6 12.3l1.2-1.2"/>',
    'hediye': '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5v7h14v-7M12 8.5v11"/><path d="M12 8.5c-1.5-3.4-5.5-3.6-5.5-1.4 0 1.4 2.5 1.4 5.5 1.4Zm0 0c1.5-3.4 5.5-3.6 5.5-1.4 0 1.4-2.5 1.4-5.5 1.4Z"/>',
    'pano': '<rect x="5" y="4.5" width="14" height="16" rx="2"/><path d="M9 4.5V3.5h6v1M8.5 10h7M8.5 13.5h7M8.5 17h4"/>',
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
# 1) Hakkımızda
# ======================================================================
H = K['hakkimizda']
GRUP_H = [
    {'k': 'kbas', 'ad': 'Hakkımızda başlığı', 'hedef': '.k-acilis', 'oneri': 'a',
     'sec': [['a', 'Tahminle değil, kayıtla'], ['b', 'Seanstan eve, evden seansa'], ['c', 'Tek çatı altında']]},
    {'k': 'kkisi', 'ad': 'Çocuk, ebeveyn, uzman bölümü', 'hedef': '#kisiler', 'oneri': 'a',
     'sec': [['a', 'Satır satır (yan yana oku)'], ['b', 'Üç renkli kart']]},
]
VARSAYILAN = ''.join(f' data-v-{g["k"]}="{g["oneri"]}"' for g in GRUP_H)

h1 = ''.join(f'<span data-var="kbas:{k}"{"" if k == "a" else " hidden"}>{e(v)}</span>' for k, v in H['h1'].items())
olgular = ''.join(f'<li class="k-olgu"><b>{n}</b><div><strong>{e(ad)}</strong><span>{e(t)}</span></div></li>' for n, ad, t in H['olgular'])

adimlar = []
for i, a in enumerate(H['akis'], 1):
    sonraki_istege = i < len(H['akis']) and H['akis'][i].get('istege')
    cls = 'k-adim' + (' istege' if a.get('istege') else '') + (' once-istege' if sonraki_istege else '')
    rozet = f'<span class="k-rozet">{e(H["istege_etiket"])}</span>' if a.get('istege') else ''
    adimlar.append(f'<li class="{cls}"><span class="k-no" aria-hidden="true">{i}</span><div class="k-adim-kart">'
                   f'<p class="k-uyg">{ikon_img(a["ikon"], 22, "k-uyg-ikon")}<span>{e(a["uygulama"])}</span>{rozet}</p>'
                   f'<h3><span class="gizli">{i}. </span>{e(a["ad"])}</h3><p>{e(a["metin"])}</p></div></li>')

PA = H['parca_adlari']
kisiler = []
for p in H['kisiler']:
    ikonlar = ''.join(ikon_img(x, 52 if len(p['ikonlar']) == 1 else 34) for x in p['ikonlar'])
    ek = f' · {e(p["ek"])}' if p.get('ek') else ''
    kisiler.append(
        f'<article class="k-kisi k-kisi-{p["k"]}" aria-labelledby="kisi-{p["k"]}">'
        f'<header class="k-kisi-bas"><div class="k-kisi-ikon n{len(p["ikonlar"])}">{ikonlar}</div>'
        f'<div><h3 id="kisi-{p["k"]}">{e(p["ad"])}</h3><p class="k-kisi-uyg">{e(p["uygulama"])}{ek}</p></div></header>'
        f'<div class="k-parca k-zorluk"><h4>{PA[0]}</h4><p>{p["zorluk"]}</p></div>'
        f'<div class="k-parca k-arastirma"><h4>{PA[1]}</h4><p>{p["arastirma"]}</p></div>'
        f'<div class="k-parca k-karsilik"><h4>{PA[2]}</h4><p>{p["karsilik"]}</p></div>'
        f'</article>')

sinirlar = ''.join(f'<li class="k-sinir"><span class="k-sinir-ikon">{svg(SIMGELER[s["ikon"]])}</span>'
                   f'<h3>{e(s["baslik"])}</h3><p>{s["metin"]}</p></li>' for s in H['sinirlar'])


def kapanis_karti(c):
    link = yer(c['link'])
    ikon = (f'<span class="k-git-ikon svg">{svg(SIMGELER["kalkan"], 28)}</span>' if c['ikon'] == 'kalkan'
            else ikon_img(c['ikon'], 52, 'k-git-ikon'))
    yeni = '<span class="gizli"> (yeni sekmede açılır)</span>' if link.startswith('http') else ''
    oku = svg(SIMGELER['dis' if link.startswith('http') else 'ok'], 20)
    return (f'<li><a class="k-git k-{c["renk"]}" href="{link}"{dis(link)}>{ikon}<h3>{e(c["ad"])}</h3><p>{e(c["metin"])}</p>'
            f'<span class="k-git-alt">{e(c["link_ad"])}{yeni}{oku}</span></a></li>')


govde_h = f'''<main id="icerik">
<section class="k-acilis" aria-labelledby="h1">
  <div class="ic">
    <p class="k-etiket">{e(H["etiket"])}</p>
    <h1 id="h1">{h1}</h1>
    <p class="k-alt">{e(H["alt"])}</p>
    <p class="k-ince">{e(H["ince"])}</p>
    <ul class="k-olgular" aria-label="Moyo kısaca">{olgular}</ul>
  </div>
</section>

<section class="k-bolum k-sis" id="ekosistem" aria-labelledby="h-akis">
  <div class="ic">
    <div class="k-bas"><p class="k-etiket">{e(H["akis_etiket"])}</p><h2 id="h-akis">{e(H["akis_baslik"])}</h2><p>{e(H["akis_metin"])}</p></div>
    <ol class="k-adimlar">{"".join(adimlar)}</ol>
  </div>
</section>

<section class="k-bolum" id="kisiler" aria-labelledby="h-kisi">
  <div class="ic">
    <div class="k-bas"><p class="k-etiket">{e(H["kisi_etiket"])}</p><h2 id="h-kisi">{e(H["kisi_baslik"])}</h2><p>{e(H["kisi_metin"])}</p></div>
    <div class="k-kisiler">{"".join(kisiler)}</div>
  </div>
</section>

<section class="k-bolum k-mavi" id="sinirlar" aria-labelledby="h-sinir">
  <div class="ic">
    <div class="k-bas"><p class="k-etiket">{e(H["sinir_etiket"])}</p><h2 id="h-sinir">{e(H["sinir_baslik"])}</h2><p>{e(H["sinir_metin"])}</p></div>
    <ul class="k-sinirlar">{sinirlar}</ul>
  </div>
</section>
'''
govde_h, sira = atiflar(govde_h, K['kaynaklar'])
kaynak_listesi = ''.join(f'<li id="kaynak-{i}">{kunye(K["kaynaklar"][k])}</li>' for i, k in enumerate(sira, 1))
govde_h += f'''
<section class="k-bolum" id="kaynaklar" aria-labelledby="h-kaynak">
  <div class="ic k-dar">
    <h2 id="h-kaynak">{e(H["kaynak_baslik"])}</h2>
    <p class="k-kaynak-not">{e(H["kaynak_metin"])}</p>
    <ol class="k-kaynaklar">{kaynak_listesi}</ol>
  </div>
</section>

<section class="k-bolum k-kapanis" aria-labelledby="h-kapanis">
  <div class="ic">
    <h2 id="h-kapanis">{e(H["kapanis_baslik"])}</h2>
    <ul class="k-gitler">{"".join(kapanis_karti(c) for c in H["kapanis"])}</ul>
  </div>
</section>
</main>
'''
open('hakkimizda.html', 'w', encoding='utf-8').write(bas('hakkimizda', H, GRUP_H, VARSAYILAN) + govde_h + son('hakkimizda'))


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
