# Canlıya taşıma (kullanıcı isteği 14 Kasım 2026: "şifre girişli sistemi aktif tutarak live'a al"; 19 Kasım 2026: kurumsal sayfalar,
# Moyo Ebeveyn fiyat sayfası, site haritası). Önizleme sayfaları → parent-app/site/moyo/ (moyoapp.com.tr, Worker moyo-site):
#   /                ← c.html             (çatı sayfa)
#   /ebeveyn/        ← ebeveyn.html
#   /ebeveyn/fiyat/  ← ebeveyn-fiyat.html
#   /hakkimizda/     ← hakkimizda.html
#   /guven/          ← guven.html
#   /sitemap.xml, /robots.txt ← k-sitemap.xml, k-robots.txt
#   /c/…             ← css, js, yazı tipleri, kullanılan görseller
# Önizleme seçicileri (oniz.js sözleşmesi) canlıya taşınmaz: seçilen alternatif kalır, öbürleri silinir, <html>'e seçim yazılır.
# Seçim: varsayılan her grubun önerisi; kullanıcı başka seçtiyse secim.json ({"c.html": {"dongu6": "b"}, ...}).
# parent-app site/build-cf.sh site, site/moyo'yu dist-site'ın üstüne kopyalar. Kilit (Cloudflare Access) alan adında; dokunulmaz.
# Kullanım: cd tools/cati-sayfa && python3 disa_aktar.py ../../../parent-app/site/moyo [secim.json]
import json, os, re, shutil, subprocess, sys
from html.parser import HTMLParser

OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '../../../parent-app/site/moyo')
SECIM = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else (json.load(open('secim.json')) if os.path.exists('secim.json') else {})
APP = 'https://ebeveyn.moyoapp.com.tr/'
MERCEK = 'https://mercek.moyoapp.com.tr/'
for g in ('yap_c.py', 'yap_m.py', 'yap_f.py', 'yap_k.py'):     # yap_k çatı sayfanın üst/alt bilgisini c.html'den alır: en son
    if os.path.exists(g):
        subprocess.run([sys.executable, g], check=True, stdout=subprocess.DEVNULL)
import yap_c  # noqa: E402  (önizleme adresleri için)

SAYFA = {'c.html': 'index.html', 'ebeveyn.html': 'ebeveyn/index.html', 'ebeveyn-fiyat.html': 'ebeveyn/fiyat/index.html',
         'hakkimizda.html': 'hakkimizda/index.html', 'guven.html': 'guven/index.html'}
YOL = {'c.html': '/', 'ebeveyn.html': '/ebeveyn/', 'ebeveyn-fiyat.html': '/ebeveyn/fiyat/', 'hakkimizda.html': '/hakkimizda/', 'guven.html': '/guven/'}
VARLIK = ('ortak.css', 'c.css', 'beyaz.css', 'v4.css', 'c-18.css', 'k.css', 'eko.js', 'menu.js', 'c-18.js')
# Sekme simgesi (kullanıcı kararı 18 Kasım 2026; dosyalar Marketing setinden parent-app site/public/img'de → /img/…)
FAV_ONIZLEME = '<link rel="icon" href="img/favicon-moyo.svg" type="image/svg+xml">'
FAV = ('<link rel="icon" href="/img/favicon.svg" type="image/svg+xml"><link rel="icon" href="/img/favicon.ico" sizes="any">'
       '<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">')
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}


class Kes(HTMLParser):
    """data-var="k:v" taşıyan öğelerden seçilmeyenlerin aralığını, seçilenlerin açılış etiketini bulur."""
    def __init__(self, src, secili):
        super().__init__(convert_charrefs=False)
        self.src, self.secili, self.yigin, self.sil, self.tut = src, secili, [], [], []
        self.satir = [0]
        for m in re.finditer('\n', src):
            self.satir.append(m.end())
        self.feed(src)

    def _off(self):
        s, c = self.getpos()
        return self.satir[s - 1] + c

    def _ac(self, tag, attrs, tek):
        bas = self._off()
        son = bas + len(self.get_starttag_text())
        dv = dict(attrs).get('data-var')
        is_ = None
        if dv:
            k, v = dv.split(':', 1)
            is_ = 'sil' if self.secili.get(k) != v else 'tut'
            if is_ == 'tut':
                self.tut.append((bas, son))
        if tek or tag in VOID:
            if is_ == 'sil':
                self.sil.append((bas, son))
        else:
            self.yigin.append((tag, bas, is_))

    def handle_starttag(self, tag, attrs): self._ac(tag, attrs, False)
    def handle_startendtag(self, tag, attrs): self._ac(tag, attrs, True)

    def handle_endtag(self, tag):
        son = self.src.index('>', self._off()) + 1
        while self.yigin:
            t, bas, is_ = self.yigin.pop()
            if t == tag:
                if is_ == 'sil':
                    self.sil.append((bas, son))
                break


def canli(ad, s):
    """Önizleme seçicilerini çıkarır: seçilen alternatif kalır, öbürleri silinir."""
    m = re.search(r'<script type="application/json" id="oniz-gruplar">(.*?)</script>\s*', s, re.S)
    if not m:
        return s
    gruplar = json.loads(m.group(1))
    # Fiyat sayfasının alt bilgisi ana sayfanın "h1" seçimini izler (19 Kasım 2026): o sayfada ayrı seçim yoksa ebeveyn.html'ninki geçer
    ust = SECIM.get({'ebeveyn-fiyat.html': 'ebeveyn.html'}.get(ad, ''), {})
    secili = {g['k']: SECIM.get(ad, {}).get(g['k'], ust.get(g['k'], g['oneri'])) for g in gruplar}
    for g in gruplar:
        assert secili[g['k']] in [o[0] for o in g['sec']], f'{ad}: {g["k"]} için geçersiz seçim {secili[g["k"]]}'
    k = Kes(s, secili)
    duzen = [(a, b, '') for a, b in sorted(k.sil)]
    for a, b in k.tut:
        if not any(x <= a < y for x, y, _ in duzen):
            t = re.sub(r'\s+data-var="[^"]*"', '', s[a:b])
            duzen.append((a, b, re.sub(r'\s+hidden(?=[\s/>])', '', t)))
    kalan = []
    for a, b, t in sorted(duzen, key=lambda x: (x[0], -x[1])):
        if kalan and a < kalan[-1][1]:
            continue                                  # iç içe: dıştaki zaten silindi
        kalan.append((a, b, t))
    for a, b, t in reversed(kalan):
        s = s[:a] + t + s[b:]
    s = s.replace(m.group(0), '') if m.group(0) in s else re.sub(r'<script type="application/json" id="oniz-gruplar">.*?</script>\s*', '', s, flags=re.S)
    s = s.replace('<script src="oniz.js"></script>', '')
    v = ''.join(f' data-v-{x}="{secili[x]}"' for x in secili)
    s = re.sub(r'<html lang="tr"[^>]*>', f'<html lang="tr"{v}>', s, count=1)
    assert 'data-var=' not in s and 'oniz' not in s.replace('onizleme', ''), f'{ad}: önizleme izi kaldı'
    return s


def cut(s, start, end_tag):
    i = s.find(start)
    if i < 0:
        return s
    j = s.index(end_tag, i) + len(end_tag)
    return s[:i] + s[j:]


def baglantilar(s):
    for dosya, yol in YOL.items():                    # sayfalar arası bağlantılar gerçek yollara
        s = s.replace(f'href="{dosya}#', f'href="{yol}#').replace(f'href="{dosya}"', f'href="{yol}"')
    s = s.replace(yap_c.MERCEK, MERCEK).replace(yap_c.SITE, '/')
    s = s.replace('href="#">Giriş yap</a>', f'href="{APP}#giris">Giriş yap</a>')
    s = s.replace('href="#">Ücretsiz deneyin</a>', f'href="{APP}#kayit">Ücretsiz deneyin</a>')
    s = s.replace('<a class="logo" href="#"', '<a class="logo" href="/"')
    for a in VARLIK:
        s = s.replace(f'"{a}"', f'"/c/{a}"')
    s = s.replace(FAV_ONIZLEME, FAV)
    s = s.replace('"m/', '"/c/m/').replace('src="img/', 'src="/c/img/').replace('href="img/', 'href="/c/img/').replace("url(img/", "url(/c/img/")
    return s


cikti = {}
for ad in SAYFA:
    if not os.path.exists(ad):
        print('yok, atlandı:', ad)
        continue
    s = open(ad, encoding='utf-8').read()
    if ad == 'c.html':
        s = cut(s, '<div class="alt-secici"', '</div>')          # eski önizleme seçicileri (artık üretilmiyorsa etkisiz)
        s = cut(s, '<div class="nk-secici"', '</div>')
        s = s.replace('<title>Moyo · Çatı sayfa</title>', '<title>Moyo · Çocuk, ebeveyn ve uzman için rutin ve davranış takibi</title>')
        if 'rel="canonical"' not in s:
            s = s.replace('</title>', '</title><link rel="canonical" href="https://moyoapp.com.tr/">', 1)
        if 'name="description"' not in s:
            s = s.replace('</title>', '</title><meta name="description" content="Rutini kurun, davranışları kaydedin, ilerlemeyi görün; dilerseniz uzmanınızla paylaşın. Moyo Ebeveyn, Moyo Oyun ve Moyo Uzman.">', 1)
    s = re.sub(r'<!-- ONIZ:BAS -->.*?<!-- ONIZ:SON -->\s*', '', s, flags=re.S)   # yalnız önizleme (ör. ekip yer tutucusu)
    s = baglantilar(canli(ad, s))
    assert 'claude.ai' not in s and 'Önizleme' not in s, f'{ad}: önizleme izi kaldı'
    assert 'href="#"' not in s, f'{ad}: boş bağlantı kaldı'
    assert not re.search(r'href="(?!https?:|/|#|mailto:)[^"]*\.html', s), f'{ad}: göreli .html bağlantısı kaldı'
    assert FAV in s, f'{ad}: sekme simgesi bağlantısı yok'
    cikti[ad] = s

for d in ('c', 'ebeveyn', 'hakkimizda', 'guven'):
    shutil.rmtree(os.path.join(OUT, d), ignore_errors=True)
os.makedirs(os.path.join(OUT, 'c', 'img'))
for ad, s in cikti.items():
    yol = os.path.join(OUT, SAYFA[ad])
    os.makedirs(os.path.dirname(yol), exist_ok=True)
    open(yol, 'w', encoding='utf-8').write(s)
for a in VARLIK:
    if os.path.exists(a):
        shutil.copy(a, os.path.join(OUT, 'c', a))
shutil.copytree('fonts', os.path.join(OUT, 'c', 'fonts'))
shutil.copytree('m', os.path.join(OUT, 'c', 'm'))
for kaynak, hedef in (('k-sitemap.xml', 'sitemap.xml'), ('k-robots.txt', 'robots.txt')):
    if os.path.exists(kaynak):
        shutil.copy(kaynak, os.path.join(OUT, hedef))
css = ''.join(open(a, encoding='utf-8').read() for a in VARLIK if os.path.exists(a) and a.endswith('.css'))
used = set(re.findall(r'/c/img/([\w.-]+)', ''.join(cikti.values()))) | set(re.findall(r'url\(["\']?(?:\.\./)?img/([\w.-]+)', css))
for f in sorted(used):
    shutil.copy(os.path.join('img', f), os.path.join(OUT, 'c', 'img', f))
print('ok', OUT, '·', len(cikti), 'sayfa ·', len(used), 'görsel')
