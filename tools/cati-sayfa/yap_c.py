# Çatı sayfa C, dördüncü sürüm (kullanıcı isteği 17 Kasım 2026): yeni açılış metni, "Moyo Ekosistemi" anlatımı açılışın hemen altında
# (yandaki ekranlar bulanık ve geride, hap biçiminde yeşil adım sayacı), menüden Güvenlik / Sorular alt bilgiye, Atlassian düzeninde alt bilgi,
# adımlarda ürün adları çizgi kilitle ("moyo Ebeveyn / Oyun / Uzman"), tam ekran gerçek ürün görüntüleri.
# Aileye dönük sayfalarda uzman ürününün adı "Moyo Uzman"; "Moyo Mercek" yalnız uzman platformunda (ortak durumlar.md 5B).
# Beşinci tur (kullanıcı geri bildirimi 18 Kasım 2026): alternatifler "oniz" sözleşmesiyle (c-metin.json "oniz" + data-var kardeşler,
# <html data-v-…> varsayılanları), 6. adımda şema (c-sema.py), 1-2-3 kartları dört tasarım (.uc), Güven bölümü ayrı sayfaya, alt bilgide Kurumsal.
# Tur 2 (kullanıcı yanıtları 19 Kasım 2026): kabul edilen seçenekler tek sürüm (açık sahne, renkli 1-2-3 kartları, başlık ve kart 1),
# sahnenin kapanış cümlesi kalktı; yeni gruplar: dongu6 (dört halka), fiil, b2, b3, b3s, hikaye (kartlarda ekran / yalnızca kartlar / bugünkü).
# Kural: çocuk adımı gerçek hayatta yapar, oyunda işaretler; ebeveyn rutini planlar; uygulamalar "birbirine bağlı" (tek platform değil).
# Tur 3 (kullanıcı yanıtları 19 Kasım 2026): alt, fiil ("planlar"), hikaye (ekranlar 1-2-3 kartlarında) ve urun tek sürüm; ayrı ürün
# anlatımı (#nasil, telefon ve tablette #nasil-k) kalktı, hikaye.js ve kompakt.js bu sayfada yüklenmez; nk grubu da onunla gitti.
# Tur 4 (kullanıcı kararları 19 Kasım 2026): dongu6 b (Yörünge), b2 a, b3 a, b3s a tek sürüm; sayfada önizleme grubu kalmadı.
# c-metin.json "oniz" boşken #oniz-gruplar ve oniz.js yazılmaz; yeni grup eklenirse (sözlük metin + "oniz" kaydı) ikisi yeniden çıkar.
import re, html as H, json, sys, runpy
def _svg(dosya):
    s = open(dosya).read().strip()
    return re.sub(r' role="img" aria-label="[^"]*"', ' aria-hidden="true" focusable="false"', s).replace(' xmlns="http://www.w3.org/2000/svg"', '')
LOGO = _svg('inline-moyo.svg')
MERCEK = 'https://claude.ai/artifact/H2hwv9mqx9CDtjjEsYP6UE#mercek'
SITE = 'https://moyoapp.com.tr/'               # yasal ve destek bağlantıları (disa_aktar.py kök yola çevirir)
K = json.load(open('c-metin.json'))            # metinler ayrı dosyada
# Moyo Ekosistemi sahnesinin tam ekran, kırpılmamış gerçek ürün ekranları (örnek veri): tools/cati-sayfa/cek ile çekilir.
# 1-2-3 kartlarının ekranları c-metin.json "basamak" içinde (sahnedekilerden farklı).
IMG = {'ebeveyn-onay': 'img/moyo-onay.webp', 'ebeveyn-ekle': 'img/moyo-ekle.webp', 'ebeveyn-uzman': 'img/moyo-uzman.webp', 'oyun-onay': 'img/c-oyun-onay.webp',
       'mercek-veri': 'img/mercek-rutin.webp', 'mercek-egitim': 'img/mercek-egitim.webp',
       'mercek-veri-tel': 'img/mercek-rutin-tel.webp', 'mercek-egitim-tel': 'img/mercek-egitim-tel.webp'}
e = H.escape
ONIZ = K.get('oniz', []); ONERI = {g['k']: g['oneri'] for g in ONIZ}
SEMA = runpy.run_path('c-sema.py')['sema']; LOGO_IC = re.sub(r'^<svg[^>]*>|</svg>$', '', LOGO)
def secenek(k, d, tag='span', attr=''):
    # Metin alternatifi: sözlükse her değer data-var="k:değer" taşıyan kardeş öğe olur; önerilmeyenler hidden (oniz.js açar). Düz metin olduğu gibi.
    if isinstance(d, str): return d
    return ''.join(f'<{tag}{attr} data-var="{k}:{v}"{"" if v == ONERI[k] else " hidden"}>{t}</{tag}>' for v, t in d.items())

def cumleler(t):
    # Uzun tanıtım cümleleri geniş ekranda cümle sınırında satır atlasın ("…tasarlandı. Birlikte / kullanıldığında" yerine): her cümle bir span.
    return ''.join(f'<span class="cumle">{c}</span> ' for c in re.split(r'(?<=[.!?]) (?=[A-ZÇĞİÖŞÜ"])', t)).strip()

# Telefona özel kırpım (kullanıcı kararı 22 Kasım 2026, "Telefona özel kırp"): < 700 px'te kart görseli kutusu ~306 × 371 px; bütün ekran
# oraya ~170 px genişlikte sığıyor, yazı ~6 px kalıyordu. Kartın mesajını anlatan parçanın kırpımı kutuyu doldurur (yazı ~11 px).
# Kırpımlar img/c-kirp-<anahtar>.webp ← python3 ../landing-motion/kirp.py kirp.json (kutular orada). Tablet ve geniş ekran değişmez.
KIRP = {k: f'img/c-kirp-{k}.webp' for k in ('ebeveyn-ekle', 'oyun-onay', 'ebeveyn-onay', 'mercek-veri', 'mercek-egitim')}
def kirp(key, alt): return f'<img class="d-kirp" src="{KIRP[key]}" alt="{e(alt)}" loading="lazy" decoding="async">' if key in KIRP else ''

def tur(key): return 'ebeveyn' if key.startswith('ebeveyn') else ('mercek' if key.startswith('mercek') else (key if key == 'sema' else 'oyun'))
def cls(key, dar=False): return 'telefon' if key.startswith('ebeveyn') or (dar and key.startswith('mercek')) else ('panel' if key.startswith('mercek') else '')
def resim(key, alt, c='', dar=False):
    if dar and key.startswith('mercek'): key += '-tel'          # telefonda Moyo Uzman'ın telefon ekranı (masaüstü penceresi okunmaz)
    return f'<img class="{c}" src="{IMG[key]}" alt="{e(alt)}" loading="lazy" decoding="async">'

def dongu(beats):
    # Moyo Ekosistemi: ortadaki ekran net; yanındakiler bulanık, yana açılmış ve geride. Masaüstünde sayfa kaydıkça ilerler (eko.js),
    # altında hap biçiminde adım sayacı (geçilen adımların numarası yeşil dolar). Telefonda ve tablette parmakla yana kaydırılan kartlar + aynı sayaç.
    # 6. adımın görseli ekran değil yörünge çizimidir (c-sema.py; tur 4'te tek sürüm). Kapanış cümlesi 19 Kasım'da kalktı (Moyo Ebeveyn sayfasına).
    slots, pills, kartlar, mpills = [], [], [], []
    for i, b in enumerate(beats):
        t = tur(b['gorsel'])
        genis = SEMA(K, LOGO_IC, 'g', 's6s') if t == 'sema' else resim(b["gorsel"], b["alt"], cls(b["gorsel"]))       # sahne
        dar = SEMA(K, LOGO_IC, 'd', 's6k') if t == 'sema' else resim(b["gorsel"], b["alt"], cls(b["gorsel"], True), True)  # kart
        # Geniş ekranda kartlar (hareket azaltma ya da dokunmatik büyük ekran, ≥ 1025 px) sahnedeki kadar büyük: Moyo Uzman'ın masaüstü
        # ekranı ve 6. adımın geniş çizimi (c-18.css .d-gen / .d-dar; gizli olan görsel tembel yüklendiği için indirilmez). 19 Kasım QA.
        if t == 'sema':
            dar = (dar.replace('class="d6"', 'class="d6 d-dar"', 1) + SEMA(K, LOGO_IC, 'g', 's6w').replace('class="d6"', 'class="d6 d-gen"', 1))
        elif t == 'mercek':
            dar = resim(b["gorsel"], b["alt"], 'telefon d-dar', True) + resim(b["gorsel"], b["alt"], 'panel d-gen')
        dar = kirp(b['gorsel'], b['alt']) + dar
        slots.append(f'<div class="d-slot t-{t}" style="--i:{i}">{genis}</div>')
        ad = f'{i + 1}. {b["kim"]}: {b["baslik"]}'
        pills.append(f'<li><a href="#hepsi" aria-label="{e(ad)}"><span class="n">{i + 1}</span><span class="ad">{b["kisa"]}</span></a></li>')
        mpills.append(f'<li><a href="#hepsi" aria-label="{e(ad)}"><span class="n">{i + 1}</span><span class="ad">{b["kisa"]}</span></a></li>')
        kartlar.append(f'<li class="d-kart t-{t}"><div class="d-gorsel">{dar}</div><div class="d-yazi"><span class="rol">{i + 1} · {b["kim"]}</span><h3>{b["baslik"]}</h3><p>{b["metin"]}</p></div></li>')
    yazilar = ''.join(f'<div class="d-yazi-m" data-i="{i}"><span class="rol">{i + 1} · {b["kim"]}</span><h3>{b["baslik"]}</h3><p>{b["metin"]}</p></div>' for i, b in enumerate(beats))
    ok_ = lambda c, ad, d: (f'<button type="button" class="d-ok {c}" aria-label="{ad}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="{d}" fill="none" stroke="currentColor" '
                            f'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>')
    return (f'<section class="dongu-b statik" id="hepsi" style="--n:{len(beats)}" aria-label="{e(K["dongu_etiket"])}">'
            f'<h2 class="gizli">{K["dongu_etiket"]}: {K["dongu_baslik"]}</h2>'
            f'<div class="d-kayit"><div class="d-sahne">'
            f'<div class="d-halka-kap" aria-hidden="true"><div class="d-halka">{"".join(slots)}</div></div>'
            f'<div class="d-yazilar" aria-live="polite">{yazilar}</div><ol class="d-nokta sayac" aria-label="Ekosistemin adımları">{"".join(pills)}</ol></div></div>'
            f'<div class="d-mobil ic"><div class="d-pencere"><ol class="d-serit" tabindex="0" aria-label="Ekosistemin adımları, yana kaydırın">{"".join(kartlar)}</ol>'
            f'{ok_("geri", "Önceki adım", "M14.5 5.5 8 12l6.5 6.5")}{ok_("ileri", "Sonraki adım", "M9.5 5.5 16 12l-6.5 6.5")}</div>'
            f'<p class="d-ipucu" aria-hidden="true"><span>‹</span> {K["kaydir_ipucu"]} <span>›</span></p>'
            f'<ol class="d-nokta-m sayac" aria-label="Ekosistemin adımları">{"".join(mpills)}</ol></div></section>')

def uc_kart(i, s):
    # Renkli üç kart (kullanıcı kararı 19 Kasım 2026; Atlassian örnek 1). Başlık ya da metin sözlükse grup "b<n>" seçenekleri
    # (tur 4'te hepsi tek sürüm). Kartın altında bir gerçek ürün ekranı (1-6 sahnesindekilerden farklı; tur 3'te tek sürüm).
    rozet = f'<span class="uc-rozet">{s["rozet"]}</span>' if s['rozet'] else ''
    g = s['gorsel']
    ekran = f'<div class="uc-gorsel uc-{g["tur"]}"><img src="{g["img"]}" alt="{e(g["alt"])}" loading="lazy" decoding="async"></div>'
    return (f'<li class="uc-k uc-{i + 1}{" istege" if s["rozet"] else ""}"><div class="uc-ust"><span class="uc-no" aria-hidden="true">{i + 1}</span>{rozet}</div>'
            f'<h3>{secenek("b%d" % (i + 1), s["baslik"])}</h3>'
            f'<p>{secenek("b%d" % (i + 1), s["metin"])}</p>{ekran}</li>')
basamak = '<ol class="uc">' + ''.join(uc_kart(i, s) for i, s in enumerate(K['basamak'])) + '</ol>'
urunler = ''.join(f'<div class="kart urun"><img class="u-ikon" src="{u["ikon"]}" alt="" width="52" height="52"><h3><small>{u["kim"]}</small>{u["ad"]}</h3><p class="sorun2">{u["ozet"]}</p><p>{u["metin"]}</p><a href="{u["link"]}"{" target=\"_blank\" rel=\"noopener\"" if u["link"].startswith("http") else ""}>{u["link_ad"]}</a></div>' for u in K['urunler']).replace('{MERCEK}', MERCEK)
# Menüde ve açılışta "Nasıl çalışır" #giris'e gider (1-2-3 kartları; ayrı ürün anlatımı tur 3'te kalktı).
# Güven kartları bu sayfada yok (18 Kasım 2026): ayrı kurumsal sayfa guven.html; metinleri c-metin.json "guven" anahtarında duruyor.
sss = ''.join(f'<details><summary>{q[0]}</summary><p>{q[1]}</p></details>' for q in K['sss'])

# Alt bilgi (Atlassian düzeni örnek alındı): açık zeminli yuvarlak kutuda logo + slogan (açılış başlığı) ve dört bağlantı sütunu,
# altında telif satırı. Kurumsal sayfalar (hakkimizda.html, guven.html) ayrı dosyalar; disa_aktar.py gerçek adreslere çevirir.
def sutun(baslik, baglar): return f'<div class="altb-s"><h3>{baslik}</h3><ul>' + ''.join(f'<li><a href="{h}"{" target=\"_blank\" rel=\"noopener\"" if h.startswith("https://claude.ai") else ""}>{t}</a></li>' for t, h in baglar) + '</ul></div>'
altbilgi = (f'<footer class="altb"><div class="ic"><div class="altb-kutu">'
            f'<div class="altb-s altb-marka"><a class="logo" href="#" aria-label="Moyo">{LOGO}</a><p class="altb-slogan">{K["altbilgi_slogan"]}</p></div>'
            + sutun('Uygulamalar', [('Moyo Ebeveyn', 'ebeveyn.html'), ('Moyo Oyun', '#sonraki'), ('Moyo Uzman', MERCEK)])
            + sutun('Kurumsal', [('Hakkımızda', 'hakkimizda.html'), ('Güvenlik ve gizlilik', 'guven.html'), ('Destek', SITE + 'destek')])
            + sutun('Yardım', [('Nasıl çalışır', '#giris'), ('Sıkça sorulan sorular', '#sss')])
            + sutun('Yasal', [('Gizlilik Politikası', SITE + 'yasal/gizlilik'), ('Kullanım Koşulları', SITE + 'yasal/kosullar-parentapp'), ('KVKK başvurusu', SITE + 'yasal/kvkk-basvuru')])
            + f'</div><div class="altb-alt"><span>© 2026 Moyo</span><span class="altb-not">Ekranlardaki adlar örnektir. Bu sayfa çerez, reklam pikseli ya da analiz aracı kullanmaz.</span></div></div></footer>')

# Önizleme alternatifleri: <html data-v-…> varsayılanları sayfaya yazılır (betik olmadan da önerilen tasarım açılır);
# #oniz-gruplar + oniz.js yalnız önizlemede (disa_aktar.py çıkarır) ve yalnız grup varken yazılır.
VARS = ''.join(f' data-v-{g["k"]}="{g["oneri"]}"' for g in ONIZ)
GRUPLAR = '' if not ONIZ else '<script type="application/json" id="oniz-gruplar">' + json.dumps([{k: g[k] for k in ('k', 'ad', 'hedef', 'oneri', 'sec')} for g in ONIZ], ensure_ascii=False).replace('</', '<\\/') + '</script><script src="oniz.js"></script>'
SEO = K['seo']
assert len(SEO['aciklama']) <= 155, 'açıklama 155 karakteri geçti'

html = f'''<!doctype html><html lang="tr"{VARS}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Moyo · Çatı sayfa</title>
<meta name="description" content="{e(SEO["aciklama"])}">
<meta property="og:type" content="website"><meta property="og:locale" content="tr_TR"><meta property="og:site_name" content="Moyo">
<meta property="og:title" content="{e(SEO["og_baslik"])}"><meta property="og:description" content="{e(SEO["aciklama"])}">
<link rel="icon" href="img/favicon-moyo.svg" type="image/svg+xml"><link rel="stylesheet" href="ortak.css"><link rel="stylesheet" href="c.css"><link rel="stylesheet" href="beyaz.css"><link rel="stylesheet" href="v4.css"><link rel="stylesheet" href="c-18.css">
{GRUPLAR}</head><body class="sayfa-c beyaz">
<header class="ust"><div class="ic"><a class="logo" href="#" aria-label="Moyo">{LOGO}</a><nav class="menu" aria-label="Ana menü"><a href="#giris">Nasıl çalışır</a><a class="kitle" href="ebeveyn.html">Ebeveynler için</a><a class="kitle" href="{MERCEK}" target="_blank" rel="noopener">Uzmanlar için</a></nav><div class="sag"><a class="hap cizgi k" href="#">Giriş yap</a><a class="hap dolu k" href="#">Ücretsiz deneyin</a>
<details class="dar-menu"><summary aria-label="Menü"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="m-ac" d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path class="m-kapat" d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></summary>
<nav aria-label="Menü"><a href="#giris">Nasıl çalışır</a><a href="ebeveyn.html">Ebeveynler için</a><a href="{MERCEK}" target="_blank" rel="noopener">Uzmanlar için</a><a class="yalniz-dar" href="#">Giriş yap</a></nav></details></div></div></header>
<main>
<section class="acilis c" id="acilis"><div class="ic"><p class="alt-etiket">{K["alt_etiket"]}</p><h1>{K["h1"]}</h1><p class="alt">{K["alt"]}</p>
<div class="dugmeler"><a class="hap dolu b" href="#">Ücretsiz deneyin</a><a class="hap cizgi b" href="#giris">Nasıl çalışır? ↓</a></div>
<p class="ince">{K["ince"]}</p></div></section>
{dongu(K["dongu"])}
<section class="giris-bant" id="giris"><div class="ic"><p class="ust-etiket">{K["giris_etiket"]}</p><h2>{K["giris_baslik"]}</h2><p>{K["giris_metin"]}</p>{basamak}</div></section>
<section class="bant" id="sonraki"><div class="ic"><div class="bas"><p class="ust-etiket">{K["urunler_etiket"]}</p><h2>{K["urunler_baslik"]}</h2><p>{cumleler(K["urunler_metin"])}</p></div><div class="kartlar3">{urunler}</div></div></section>
<section class="bant" id="sss"><div class="ic"><div class="bas"><p class="ust-etiket">Sıkça sorulanlar</p><h2>Sorular</h2><p>Sorunuzun yanıtını burada göremediyseniz bize <a href="{SITE}destek">destek sayfasından</a> yazın.</p></div><div class="sss">{sss}</div></div></section>
</main>
{altbilgi}
<script src="c-18.js"></script><script src="eko.js"></script><script src="menu.js"></script></body></html>'''
open('c.html', 'w').write(html); print('ok c.html')
