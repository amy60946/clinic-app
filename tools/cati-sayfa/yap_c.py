# Çatı sayfa C, dördüncü sürüm (kullanıcı isteği 17 Kasım 2026): yeni açılış metni, "Moyo Ekosistemi" anlatımı açılışın hemen altında
# (yandaki ekranlar bulanık ve geride, hap biçiminde yeşil adım sayacı), menüden Güvenlik / Sorular alt bilgiye, Atlassian düzeninde alt bilgi,
# adımlarda ürün adları çizgi kilitle ("moyo Ebeveyn / Oyun / Uzman"), tam ekran gerçek ürün görüntüleri.
# Aileye dönük sayfalarda uzman ürününün adı "Moyo Uzman"; "Moyo Mercek" yalnız uzman platformunda (ortak durumlar.md 5B).
# Beşinci tur (kullanıcı geri bildirimi 18 Kasım 2026): alternatifler "oniz" sözleşmesiyle (c-metin.json "oniz" + data-var kardeşler,
# <html data-v-…> varsayılanları), 6. adımda şema (c-sema.py), 1-2-3 kartları dört tasarım (.uc), Güven bölümü ayrı sayfaya, alt bilgide Kurumsal.
import re, html as H, json, sys, runpy
def _svg(dosya):
    s = open(dosya).read().strip()
    return re.sub(r' role="img" aria-label="[^"]*"', ' aria-hidden="true" focusable="false"', s).replace(' xmlns="http://www.w3.org/2000/svg"', '')
LOGO = _svg('inline-moyo.svg')
KILIT = {k: _svg('inline-moyo-%s.svg' % k) for k in ('ebeveyn', 'oyun', 'uzman')}   # tools/logo/gen.py üretir
MERCEK = 'https://claude.ai/artifact/H2hwv9mqx9CDtjjEsYP6UE#mercek'
SITE = 'https://moyoapp.com.tr/'               # yasal ve destek bağlantıları (disa_aktar.py kök yola çevirir)
K = json.load(open('c-metin.json'))            # metinler ayrı dosyada
# Tam ekran, kırpılmamış gerçek ürün ekranları (örnek veri): tools/cati-sayfa/cek ile çekilir
IMG = {'ebeveyn-rutin': 'img/moyo-rutinler.webp', 'ebeveyn-onay': 'img/moyo-onay.webp', 'ebeveyn-uzman': 'img/moyo-uzman.webp',
       'oyun-onay': 'img/c-oyun-onay.webp', 'oyun-liste': 'img/c-oyun-liste.webp',
       'mercek-veri': 'img/mercek-rutin.webp', 'mercek-egitim': 'img/mercek-egitim.webp',
       'mercek-veri-tel': 'img/mercek-rutin-tel.webp', 'mercek-egitim-tel': 'img/mercek-egitim-tel.webp'}
e = H.escape
ONIZ = K['oniz']; ONERI = {g['k']: g['oneri'] for g in ONIZ}
SEMA = runpy.run_path('c-sema.py')['sema']; LOGO_IC = re.sub(r'^<svg[^>]*>|</svg>$', '', LOGO)
def secenek(k, d, tag='span', attr=''):
    # Metin alternatifi: sözlükse her değer data-var="k:değer" taşıyan kardeş öğe olur; önerilmeyenler hidden (oniz.js açar). Düz metinse tek öğe.
    if isinstance(d, str): return f'<{tag}{attr}>{d}</{tag}>'
    return ''.join(f'<{tag}{attr} data-var="{k}:{v}"{"" if v == ONERI[k] else " hidden"}>{t}</{tag}>' for v, t in d.items())

def cumleler(d):
    # Uzun tanıtım cümleleri geniş ekranda cümle sınırında satır atlasın ("…tasarlandı. Birlikte / kullanıldığında" yerine): her cümle bir span.
    bol = lambda t: ''.join(f'<span class="cumle">{c}</span> ' for c in re.split(r'(?<=[.!?]) (?=[A-ZÇĞİÖŞÜ"])', t)).strip()
    return bol(d) if isinstance(d, str) else {k: bol(v) for k, v in d.items()}

def tur(key): return 'ebeveyn' if key.startswith('ebeveyn') else ('mercek' if key.startswith('mercek') else (key if key in ('ikili', 'sema') else 'oyun'))
def cls(key, dar=False): return 'telefon' if key.startswith('ebeveyn') or (dar and key.startswith('mercek')) else ('panel' if key.startswith('mercek') else '')
def resim(key, alt, c='', dar=False):
    if dar and key.startswith('mercek'): key += '-tel'          # telefonda Moyo Uzman'ın telefon ekranı (masaüstü penceresi okunmaz)
    return f'<img class="{c}" src="{IMG[key]}" alt="{e(alt)}" loading="lazy" decoding="async">'
def kilit(ad):
    # "Moyo Ebeveyn" → kalın "moyo" + ince ek; Moyo Mercek logosuyla aynı çizim kuralı
    return f'<span class="kilit" role="img" aria-label="{e(ad)}">{KILIT[ad.split()[-1].lower()]}</span>'
def rol(metin, no=None):
    p = metin.split(' · ')
    ek = ''.join(f'<span class="rol-ek">{x}</span>' for x in p[1:])
    return f'<span class="rol">{f"<span class=rol-no>{no}</span>" if no else ""}{kilit(p[0])}{ek}</span>'

def mini_ikili():
    # Oyun ekranı + köşesinde ebeveynin onay ekranı (üst üste, tek görsel kadar yer)
    return (f'<div class="ust-uste" role="img" aria-label="{e(K["ikili_alt"])}">'
            f'{resim("oyun-onay", K["oyun_onay_alt"], "uu-oyun")}{resim("ebeveyn-onay", K["ebeveyn_onay_alt"], "uu-tel")}</div>')
def adim_gorsel(a, dar=False):
    return mini_ikili() if a['gorsel'] == 'ikili' else resim(a['gorsel'], a['alt'], cls(a['gorsel'], dar), dar)

def hikaye(adimlar):
    yaz, kart, nok, lis = [], [], [], []
    for i, a in enumerate(adimlar):
        ol = ('<ol class="adim-liste">' + ''.join(f'<li><b>{x[0]}</b> {x[1]}</li>' for x in a.get('liste', [])) + '</ol>') if a.get('liste') else ''
        yaz.append(f'<div class="hk-yazi">{rol(a["rol"])}<h2>{a["baslik"]}</h2><p>{a["metin"]}</p>{ol}</div>')
        g = adim_gorsel(a)
        c = 'genis' if a['gorsel'] == 'ikili' else cls(a['gorsel'])
        kart.append(f'<figure class="hk-kart {c}">{g}' + (f'<figcaption>{a["etiket"]}</figcaption>' if a.get('etiket') else '') + '</figure>')
        nok.append(f'<li><a href="#nasil" aria-label="{i + 1}. adım: {a["kisa"]}"><span class="n">{i + 1}</span><span class="ad">{a["kisa"]}</span></a></li>')
        lis.append(f'<article class="cikis"><div class="l-yazi">{rol(a["rol"])}<h2>{a["baslik"]}</h2><p>{a["metin"]}</p>{ol}</div><div class="l-gorsel {c}">{g}</div></article>')
    return (f'<section class="hikaye statik" id="nasil" data-mobil="liste" style="--adim:{len(adimlar)}" aria-label="Moyo nasıl çalışır"><div class="hk-sahne ic">'
            f'<div class="hk-yazilar">{"".join(yaz)}</div><div class="hk-kartlar" aria-hidden="true">{"".join(kart)}</div>'
            f'<ol class="hk-nokta sayac" aria-label="Adımlar">{"".join(nok)}</ol>'
            f'<div class="hk-liste">{"".join(lis)}</div></div></section>')

def kompakt(adimlar):
    # Telefon ve iPad için "Nasıl çalışır": telefonda sekmeler, iPad'de alt alta liste (kompakt.js)
    pills, paneller = [], []
    for i, a in enumerate(adimlar):
        g = adim_gorsel(a, dar=True)
        rozet = '<span class="nk-rozet">İsteğe bağlı</span>' if 'isteğe bağlı' in a['rol'] else ''
        uzun = '<span class="uzun">Moyo </span>'
        pills.append(f'<button type="button" role="tab" id="nk-t{i}" aria-controls="nk-p{i}" aria-selected="{"true" if i == 0 else "false"}" data-i="{i}"><span class="n">{i + 1}</span><span class="ad">{a["kisa"].replace("Moyo ", uzun)}</span></button>')
        paneller.append(f'<article class="nk-adim t-{tur(a["gorsel"])}" role="tabpanel" id="nk-p{i}" aria-labelledby="nk-t{i}" data-i="{i}"><div class="nk-gorsel">{g}</div>'
                        f'<div class="nk-yazi"><span class="rol">{kilit(a["rol"].split(" · ")[0])}{rozet}</span><h3>{a["baslik"]}</h3><p>{a["ozet"]}</p></div></article>')
    return (f'<section class="nk" id="nasil-k" data-duzen="sekme" aria-label="Moyo nasıl çalışır"><div class="ic">'
            f'<div class="nk-sekmeler sayac" role="tablist" aria-label="Adımlar">{"".join(pills)}</div>'
            f'<div class="nk-paneller" tabindex="0" aria-label="Uygulamalar, yana kaydırın">{"".join(paneller)}</div>'
            f'<div class="nk-kontrol"><button type="button" class="nk-geri" aria-label="Önceki adım">‹</button><span class="nk-sayac" aria-live="polite">1 / {len(adimlar)}</span><button type="button" class="nk-ileri" aria-label="Sonraki adım">›</button></div>'
            f'</div></section>')

def dongu(beats):
    # Moyo Ekosistemi: ortadaki ekran net; yanındakiler bulanık, yana açılmış ve geride. Masaüstünde sayfa kaydıkça ilerler (eko.js),
    # altında hap biçiminde adım sayacı (geçilen adımların numarası yeşil dolar). Telefonda ve tablette parmakla yana kaydırılan kartlar + aynı sayaç.
    # 6. adımın görseli ekran değil şemadır (c-sema.py; üç seçenek, oniz "dongu6").
    slots, pills, kartlar, mpills = [], [], [], []
    for i, b in enumerate(beats):
        t = tur(b['gorsel'])
        genis = SEMA(K, LOGO_IC, 'g') if t == 'sema' else resim(b["gorsel"], b["alt"], cls(b["gorsel"]))
        dar = SEMA(K, LOGO_IC, 'd') if t == 'sema' else resim(b["gorsel"], b["alt"], cls(b["gorsel"], True), True)
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
            f'<ol class="d-nokta-m sayac" aria-label="Ekosistemin adımları">{"".join(mpills)}</ol></div>'
            f'<div class="d-kapanis ic" id="kapanis">{secenek("kapanis", cumleler(K["dongu_kapanis"]), "p")}</div></section>')

UC_IKON = {   # 1-2-3 kartlarının çizgi ikonları (yalnız "Beyaz ikonlu kartlar" tasarımında görünür)
    'ev': '<path d="M4 11.2 12 4.5l8 6.7"/><path d="M6.2 9.8V19h11.6V9.8"/><path d="M10 19v-4.6h4V19"/>',
    'kisi': '<circle cx="9.5" cy="8.2" r="3.4"/><path d="M3.5 19.2c.5-3.4 2.9-5.4 6-5.4s5.5 2 6 5.4"/><path d="M18.5 7.2v5.6M15.7 10h5.6"/>',
    'tekrar': '<path d="m17.5 3.8 3 3-3 3"/><path d="M3.5 11.2v-.9a3.5 3.5 0 0 1 3.5-3.5h13.2"/><path d="m6.5 20.2-3-3 3-3"/><path d="M20.5 12.8v.9a3.5 3.5 0 0 1-3.5 3.5H3.8"/>',
}
def uc_kart(i, s):
    # Tek işaretleme; "Renkli üç kart · Beyaz ikonlu · Büyük rakamlı · Mevcut" tasarımları <html data-v-uc> ile c-18.css'te.
    iko = f'<span class="uc-ikon" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{UC_IKON[s["ikon"]]}</svg></span>'
    rozet = f'<span class="uc-rozet">{s["rozet"]}</span>' if s['rozet'] else ''
    return (f'<li class="uc-k uc-{i + 1}{" istege" if s["rozet"] else ""}"><div class="uc-ust">{iko}<span class="uc-no" aria-hidden="true">{i + 1}</span>{rozet}</div>'
            f'<h3>{secenek("b%d" % (i + 1), s["baslik"]) if isinstance(s["baslik"], dict) else s["baslik"]}</h3>'
            f'<p>{secenek("b%d" % (i + 1), s["metin"]) if isinstance(s["metin"], dict) else s["metin"]}</p></li>')
basamak = ('<ol class="uc">' + ''.join(uc_kart(i, s) for i, s in enumerate(K['basamak'])) + '</ol>'
           + '<div class="uc-nokta" aria-hidden="true">' + ''.join(f'<i{" class=on" if i == 0 else ""}></i>' for i in range(len(K['basamak']))) + '</div>')
urunler = ''.join(f'<div class="kart urun"><img class="u-ikon" src="{u["ikon"]}" alt="" width="52" height="52"><h3><small>{u["kim"]}</small>{u["ad"]}</h3><p class="sorun2">{u["ozet"]}</p><p>{u["metin"]}</p><a href="{u["link"]}"{" target=\"_blank\" rel=\"noopener\"" if u["link"].startswith("http") else ""}>{u["link_ad"]}</a></div>' for u in K['urunler']).replace('{MERCEK}', MERCEK)
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
# #oniz-gruplar + oniz.js yalnız önizlemede (disa_aktar.py çıkarır).
VARS = ''.join(f' data-v-{g["k"]}="{g["oneri"]}"' for g in ONIZ)
GRUPLAR = json.dumps([{k: g[k] for k in ('k', 'ad', 'hedef', 'oneri', 'sec')} for g in ONIZ], ensure_ascii=False).replace('</', '<\\/')
SEO = K['seo']
assert len(SEO['aciklama']) <= 155, 'açıklama 155 karakteri geçti'

html = f'''<!doctype html><html lang="tr"{VARS}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Moyo · Çatı sayfa</title>
<meta name="description" content="{e(SEO["aciklama"])}">
<meta property="og:type" content="website"><meta property="og:locale" content="tr_TR"><meta property="og:site_name" content="Moyo">
<meta property="og:title" content="{e(SEO["og_baslik"])}"><meta property="og:description" content="{e(SEO["aciklama"])}">
<link rel="icon" href="img/favicon-moyo.svg" type="image/svg+xml"><link rel="stylesheet" href="ortak.css"><link rel="stylesheet" href="c.css"><link rel="stylesheet" href="beyaz.css"><link rel="stylesheet" href="v4.css"><link rel="stylesheet" href="c-18.css">
<script type="application/json" id="oniz-gruplar">{GRUPLAR}</script><script src="oniz.js"></script></head><body class="sayfa-c beyaz">
<header class="ust"><div class="ic"><a class="logo" href="#" aria-label="Moyo">{LOGO}</a><nav class="menu" aria-label="Ana menü"><a href="#nasil">Nasıl çalışır</a><a class="kitle" href="ebeveyn.html">Ebeveynler için</a><a class="kitle" href="{MERCEK}" target="_blank" rel="noopener">Uzmanlar için</a></nav><div class="sag"><a class="hap cizgi k" href="#">Giriş yap</a><a class="hap dolu k" href="#">Ücretsiz deneyin</a>
<details class="dar-menu"><summary aria-label="Menü"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="m-ac" d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path class="m-kapat" d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></summary>
<nav aria-label="Menü"><a href="#nasil">Nasıl çalışır</a><a href="ebeveyn.html">Ebeveynler için</a><a href="{MERCEK}" target="_blank" rel="noopener">Uzmanlar için</a><a class="yalniz-dar" href="#">Giriş yap</a></nav></details></div></div></header>
<main>
<section class="acilis c" id="acilis"><div class="ic"><p class="alt-etiket">{K["alt_etiket"]}</p><h1>{K["h1"]}</h1>{secenek("alt", K["alt"], "p", ' class="alt"')}
<div class="dugmeler"><a class="hap dolu b" href="#">Ücretsiz deneyin</a><a class="hap cizgi b" href="#nasil">Nasıl çalışır? ↓</a></div>
<p class="ince">{K["ince"]}</p></div></section>
{dongu(K["dongu"])}
<section class="giris-bant" id="giris"><div class="ic"><p class="ust-etiket">{K["giris_etiket"]}</p>{secenek("gbas", K["giris_baslik"], "h2")}{secenek("gmet", K["giris_metin"], "p")}{basamak}</div></section>
{hikaye(K["adimlar"])}
{kompakt(K["adimlar"])}
<section class="bant" id="sonraki"><div class="ic"><div class="bas"><p class="ust-etiket">{K["urunler_etiket"]}</p><h2>{K["urunler_baslik"]}</h2>{secenek("urun", cumleler(K["urunler_metin"]), "p")}</div><div class="kartlar3">{urunler}</div></div></section>
<section class="bant" id="sss"><div class="ic"><div class="bas"><p class="ust-etiket">Sıkça sorulanlar</p><h2>Sorular</h2><p>Sorunuzun yanıtını burada göremediyseniz bize <a href="{SITE}destek">destek sayfasından</a> yazın.</p></div><div class="sss">{sss}</div></div></section>
</main>
{altbilgi}
<script src="c-18.js"></script><script src="hikaye.js"></script><script src="eko.js"></script><script src="kompakt.js"></script><script src="menu.js"></script></body></html>'''
open('c.html', 'w').write(html); print('ok c.html')
