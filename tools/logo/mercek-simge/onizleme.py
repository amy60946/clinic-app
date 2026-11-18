#!/usr/bin/env python3
# Moyo Mercek uygulama simgesi: karar önizlemesi (18 Kasım 2026). Moyo'nun simgesi kararlaştı (lacivert zemin + yeşil işaret, %60);
# Mercek'inki için kullanıcı kararı yok. Üç seçenek yan yana: A bugünkü (iki satır "mo / yo", eski yazı) · B aynı işaret, Mercek
# renkleriyle (Marketing önerisi; 13 Kasım aile kuralı: Mercek açık zemin + lacivert) · C aynı işaret, yeşil zemin (ana ekranda en ayırt
# edilen). Büyüteçli işaret (17 Kasım taslağı 1C) denendi, çıkarıldı: görsel denetimde "gözlü yüz" gibi okundu, 29 pikselde seçilmiyor.
#   python3 tools/logo/mercek-simge/onizleme.py  →  onizleme.html (Artifact olarak yayınlanır; karar gelince simge üretilir)
import os, re
H = os.path.dirname(os.path.abspath(__file__)); L = os.path.dirname(H)
LAC, YES, BEY = '#16113A', '#0FD354', '#FFFFFF'
isaret = ''.join(re.findall(r'<path[^>]*/>', open(os.path.join(L, 'kaynak', 'moyo-isaret.svg')).read()))
eski = open(os.path.join(L, '..', '..', 'site', 'assets', 'logo', 'ikon-mercek.svg')).read()
eski_ic = eski[eski.index('<g '):eski.rindex('</svg>')]

def kare(ic, zemin, ad):
    return '<svg viewBox="0 0 1024 1024" role="img" aria-label="%s"><rect width="1024" height="1024" fill="%s"/>%s</svg>' % (ad, zemin, ic)
def ortala(govde, w=200, h=180, f=60):
    g = f / 100 * 1024; s = g / w
    return '<g transform="translate(%.1f %.1f) scale(%.4f)">%s</g>' % ((1024 - g) / 2, (1024 - h * s) / 2, s, govde)
SIMGE = {
    'moyo': kare(ortala('<g fill="%s">%s</g>' % (YES, isaret)), LAC, 'Moyo simgesi'),
    'a': kare(eski_ic, BEY, 'Moyo Mercek simgesi, bugünkü'),
    'b': kare(ortala('<g fill="%s">%s</g>' % (LAC, isaret)), BEY, 'Moyo Mercek simgesi, seçenek B'),
    'c': kare(ortala('<g fill="%s">%s</g>' % (LAC, isaret)), YES, 'Moyo Mercek simgesi, seçenek C'),
}
SEC = [
    ('a', 'A', 'Bugünkü', 'İki satırlı “mo / yo”, eski yazıyla.', ['Eski yazı çizimi: y harfinin topu duruyor, yeni “moyo” yazısıyla uyuşmuyor.', 'Moyo simgesi artık işaretli; ikisi yan yana aynı aileden görünmüyor.']),
    ('b', 'B', 'Aynı işaret, Mercek renkleri', 'Beyaz zemin, lacivert işaret, karenin %60’ı.', ['Moyo ile aynı işaret: iki uygulama tek aile olarak okunur.', 'Ayrım yalnız renkte: koyu kare Moyo, açık kare Mercek.']),
    ('c', 'C', 'Aynı işaret, yeşil zemin', 'Yeşil zemin, lacivert işaret, karenin %60’ı.', ['Her duvar kâğıdında en kolay seçilen; Moyo’dan ilk bakışta ayrılır.', '13 Kasım’daki “Mercek açık zemin” kuralını değiştirir; tanıtım sitesindeki küçük simgeler de yeşile döner.']),
]
AC = lambda k: ' acik' if k in ('a', 'b') else ''
def kart(k, harf, ad, alt, madde):
    oneri = '<span class="rozet">Önerim</span>' if k == 'b' else ''
    return ('<article class="kart"><header><span class="harf">%s</span><div><h3>%s</h3><p class="alt">%s</p></div>%s</header>'
            '<div class="buyuk simge%s">%s</div>'
            '<div class="boylar" aria-label="Küçük boylarda">%s</div><ul>%s</ul></article>'
            % (harf, ad, alt, oneri, AC(k), SIMGE[k],
               ''.join('<figure><div class="simge%s" style="width:%dpx">%s</div><figcaption>%d</figcaption></figure>' % (AC(k), b, SIMGE[k], b) for b in (60, 40, 29)),
               ''.join('<li>%s</li>' % m for m in madde)))
def ekran(sinif, baslik):
    sat = ''.join('<div class="sira"><span class="etiket">%s</span><figure><div class="simge">%s</div><figcaption>Moyo</figcaption></figure>'
                  '<figure><div class="simge%s">%s</div><figcaption>Moyo Mercek</figcaption></figure></div>' % (h, SIMGE['moyo'], AC(k), SIMGE[k]) for k, h, *_ in SEC)
    return '<div class="ekran %s"><p class="ekran-ad">%s</p>%s</div>' % (sinif, baslik, sat)

html = '''<title>Mercek Simge Seçenekleri</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap">
<style>
/* Düzen: üstte kısa soru, altında üç seçenek kartı (büyük simge + gerçek boylar), sonra ana ekranda Moyo ile yan yana. */
:root { --zemin: #F6F5FA; --kart: #FFFFFF; --yazi: #16113A; --soluk: #5C5875; --cizgi: #E3E1EA; --vurgu: #0FD354; --vurgu-yazi: #0A5C2A; --rozet: #E6FAEC;
  --font: "Poppins", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --zemin: #100C2B; --kart: #1B163F; --yazi: #F2F1F8; --soluk: #B4B0CC; --cizgi: #332D5C; --vurgu: #0FD354; --vurgu-yazi: #7CF0A0; --rozet: #173B33; color-scheme: dark; } }
:root[data-theme="dark"] { --zemin: #100C2B; --kart: #1B163F; --yazi: #F2F1F8; --soluk: #B4B0CC; --cizgi: #332D5C; --vurgu: #0FD354; --vurgu-yazi: #7CF0A0; --rozet: #173B33; color-scheme: dark; }
body { background: var(--zemin); color: var(--yazi); font-family: var(--font); font-size: 15px; line-height: 1.5; }
.sayfa { max-width: 1040px; margin: 0 auto; padding-block: 28px 48px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 28px; }
h1 { font-size: clamp(24px, 4vw, 32px); line-height: 1.15; font-weight: 800; margin: 0; text-wrap: balance; }
h2 { font-size: 18px; font-weight: 800; margin: 0; }
h3 { font-size: 16px; font-weight: 600; margin: 0; }
p { margin: 0; }
.giris { display: grid; gap: 10px; max-width: 68ch; }
.giris p { color: var(--soluk); }
.kartlar { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
.kartlar { grid-template-rows: auto auto auto auto; }
.kart { background: var(--kart); border: 1px solid var(--cizgi); border-radius: 18px; padding: 18px; display: grid; grid-row: span 4; grid-template-rows: subgrid; gap: 16px; min-width: 0; }
.kart header { display: flex; align-items: flex-start; gap: 12px; }
.kart header > div { flex: 1; min-width: 0; }
.harf { flex: none; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; background: var(--yazi); color: var(--kart); }
.alt { color: var(--soluk); font-size: 13.5px; }
.rozet { flex: none; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; background: var(--rozet); color: var(--vurgu-yazi); }
.simge { aspect-ratio: 1; border-radius: 22.4%; overflow: hidden; flex: none; max-width: 100%; }
.simge svg { display: block; width: 100%; height: 100%; }
.simge.acik { box-shadow: 0 0 0 1px var(--cizgi); }
.buyuk { width: 152px; justify-self: center; }
.boylar { display: flex; align-items: flex-end; justify-content: center; gap: 18px; }
figure { margin: 0; display: grid; justify-items: center; gap: 6px; }
figcaption { font-size: 12px; color: var(--soluk); font-variant-numeric: tabular-nums; }
.kart ul { margin: 0; padding-left: 18px; display: grid; gap: 6px; color: var(--soluk); font-size: 14px; }
.ekranlar { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
/* Telefon ana ekranı taklidi: duvar kâğıdı sabit renk (iki örnek), yazı rengi her birinde ayrıca verilir */
.ekran { border-radius: 22px; padding: 18px 18px 20px; display: grid; gap: 16px; }
.ekran.gunduz { background: linear-gradient(160deg, #DCE6F5, #F3E9F2); color: #16113A; }
.ekran.gece { background: linear-gradient(160deg, #26303A, #45323F); color: #FFFFFF; }
.ekran-ad { font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; opacity: .7; }
.sira { display: flex; align-items: flex-start; justify-content: center; gap: 22px; }
.sira .etiket { width: 22px; font-weight: 800; padding-top: 18px; }
.sira .simge { width: 60px; }
.ekran figcaption { color: inherit; font-size: 11.5px; }
.ekran.gunduz .simge.acik { box-shadow: 0 0 0 1px rgba(22, 17, 58, .08); }
.ekran.gece .simge.acik { box-shadow: none; }
.not { border-top: 1px solid var(--cizgi); padding-top: 18px; color: var(--soluk); max-width: 68ch; display: grid; gap: 8px; }
.not b { color: var(--yazi); font-weight: 600; }
</style>
<div class="sayfa">
  <div class="giris">
    <h1>Moyo Mercek simgesi hangisi olsun?</h1>
    <p>Moyo’nun simgesi kararlaştırıldı: lacivert kare, yeşil işaret. Mercek’in simgesi hâlâ eski yazıyla duruyor. Aşağıda bugünkü simge ve iki öneri var; rakamlar simgenin ekrandaki boyudur (60 ana ekran, 40 arama, 29 ayarlar).</p>
  </div>
  <section class="kartlar" aria-label="Seçenekler">@@KART@@</section>
  <section style="display:grid;gap:14px">
    <h2>Ana ekranda Moyo ile yan yana</h2>
    <div class="ekranlar">@@EKRAN@@</div>
  </section>
  <div class="not">
    <p><b>Önerim B.</b> İki uygulama aynı işareti taşır, koyu kare Moyo, açık kare Mercek olur; 13 Kasım’daki “Mercek açık zemin, lacivert” kuralına da uyar. Mercek ana ekranda daha da ayrışsın isterseniz C.</p>
    <p>Seçtiğinizde uygulama simgesi, açılış ekranı, sekme simgesi ve Mercek sitesindeki küçük simgeler buna göre üretilir; iPhone ve iPad’de görmek için yeni bir TestFlight derlemesi gerekir.</p>
  </div>
</div>
'''.replace('@@KART@@', ''.join(kart(*s) for s in SEC)).replace('@@EKRAN@@', ekran('gunduz', 'Açık duvar kâğıdı') + ekran('gece', 'Koyu duvar kâğıdı'))
open(os.path.join(H, 'onizleme.html'), 'w', encoding='utf-8').write(html)
print('ok onizleme.html', len(html))
