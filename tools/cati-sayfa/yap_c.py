# Çatı sayfa C, dördüncü sürüm (kullanıcı isteği 17 Kasım 2026): yeni açılış metni, "Moyo Ekosistemi" anlatımı açılışın hemen altında
# (yandaki ekranlar bulanık ve geride, hap biçiminde yeşil adım sayacı), menüden Güvenlik / Sorular alt bilgiye, Atlassian düzeninde alt bilgi,
# adımlarda ürün adları çizgi kilitle ("moyo Ebeveyn / Oyun / Uzman"), tam ekran gerçek ürün görüntüleri.
# Aileye dönük sayfalarda uzman ürününün adı "Moyo Uzman"; "Moyo Mercek" yalnız uzman platformunda (ortak durumlar.md 5B).
import re, html as H, json, sys
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

def tur(key): return 'ebeveyn' if key.startswith('ebeveyn') else ('mercek' if key.startswith('mercek') else ('ikili' if key == 'ikili' else 'oyun'))
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
            f'<div class="nk-paneller" tabindex="0">{"".join(paneller)}</div>'
            f'<div class="nk-kontrol"><button type="button" class="nk-geri" aria-label="Önceki adım">‹</button><span class="nk-sayac" aria-live="polite">1 / {len(adimlar)}</span><button type="button" class="nk-ileri" aria-label="Sonraki adım">›</button></div>'
            f'</div></section>')

IKON = {   # Basit çizgi ikonlar (24×24, currentColor)
    'reklam': '<path d="M3 4h2.2l2.2 10.2h10.2L20 7H7"/><circle cx="9.5" cy="18.6" r="1.4"/><circle cx="16.5" cy="18.6" r="1.4"/><path d="M3 3l18 18"/>',
    'tek': '<path d="M7.5 8.5h9a4 4 0 0 1 3.9 3.2l.9 4.4a2.3 2.3 0 0 1-4 1.9L15.6 16H8.4l-1.7 2a2.3 2.3 0 0 1-4-1.9l.9-4.4a4 4 0 0 1 3.9-3.2z"/><path d="M8 11v3M6.5 12.5h3"/><circle cx="15.8" cy="12.3" r=".6" fill="currentColor"/><circle cx="17.6" cy="13.9" r=".6" fill="currentColor"/>',
    'kod': '<rect x="3.5" y="3.5" width="7" height="7" rx="1.3"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.3"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.3"/><rect x="5.9" y="5.9" width="2.2" height="2.2" fill="currentColor" stroke="none"/><rect x="15.9" y="5.9" width="2.2" height="2.2" fill="currentColor" stroke="none"/><rect x="5.9" y="15.9" width="2.2" height="2.2" fill="currentColor" stroke="none"/><path d="M13.5 13.5h3v3h-3zM17.5 17.5h3v3h-3zM19 13.5v2M13.5 19h2"/>',
    'kilit': '<path d="M12 3l7.5 3v5.6c0 4.6-3.2 8-7.5 9.4-4.3-1.4-7.5-4.8-7.5-9.4V6z"/><path d="M8.8 12.2l2.3 2.3 4.2-4.6"/>',
}
def ikon(k):
    return f'<span class="g-ikon" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{IKON[k]}</svg></span>'

def dongu(beats):
    # Moyo Ekosistemi: ortadaki ekran net; yanındakiler bulanık, yana açılmış ve geride. Masaüstünde sayfa kaydıkça ilerler (eko.js),
    # altında hap biçiminde adım sayacı (geçilen adımların numarası yeşil dolar). Telefonda yana kaydırılan kartlar + aynı sayaç.
    slots, pills, kartlar, mpills = [], [], [], []
    for i, b in enumerate(beats):
        t = tur(b['gorsel'])
        slots.append(f'<div class="d-slot t-{t}" style="--i:{i}">{resim(b["gorsel"], b["alt"], cls(b["gorsel"]))}</div>')
        ad = f'{i + 1}. {b["kim"]}: {b["baslik"]}'
        pills.append(f'<li><a href="#hepsi" aria-label="{e(ad)}"><span class="n">{i + 1}</span><span class="ad">{b["kisa"]}</span></a></li>')
        mpills.append(f'<li><a href="#hepsi" aria-label="{e(ad)}"><span class="n">{i + 1}</span><span class="ad">{b["kisa"]}</span></a></li>')
        kartlar.append(f'<li class="d-kart t-{t}"><div class="d-gorsel">{resim(b["gorsel"], b["alt"], cls(b["gorsel"], True), True)}</div><div class="d-yazi"><span class="rol">{i + 1} · {b["kim"]}</span><h3>{b["baslik"]}</h3><p>{b["metin"]}</p></div></li>')
    yazilar = ''.join(f'<div class="d-yazi-m" data-i="{i}"><span class="rol">{i + 1} · {b["kim"]}</span><h3>{b["baslik"]}</h3><p>{b["metin"]}</p></div>' for i, b in enumerate(beats))
    return (f'<section class="dongu-b statik" id="hepsi" style="--n:{len(beats)}" aria-label="{e(K["dongu_etiket"])}">'
            f'<h2 class="gizli">{K["dongu_etiket"]}: {K["dongu_baslik"]}</h2>'
            f'<div class="d-kayit"><div class="d-sahne">'
            f'<div class="d-halka-kap" aria-hidden="true"><div class="d-halka">{"".join(slots)}</div></div>'
            f'<div class="d-yazilar" aria-live="polite">{yazilar}</div><ol class="d-nokta sayac" aria-label="Ekosistemin adımları">{"".join(pills)}</ol></div></div>'
            f'<div class="d-mobil ic"><ol class="d-serit" tabindex="0" aria-label="Ekosistemin adımları, yana kaydırın">{"".join(kartlar)}</ol>'
            f'<ol class="d-nokta-m sayac" aria-label="Ekosistemin adımları">{"".join(mpills)}</ol></div>'
            f'<p class="d-kapanis ic">{K["dongu_kapanis"]}</p></section>')

basamak = '<ol class="basamak">' + ''.join(f'<li{" class=\"istege\"" if s[2] else ""}><b><span class="bn">{i + 1}</span>{s[0]}{f"<span class=\"b-rozet\">{s[2]}</span>" if s[2] else ""}</b>{s[1]}</li>' for i, s in enumerate(K['basamak'])) + '</ol>'
urunler = ''.join(f'<div class="kart urun"><img class="u-ikon" src="{u["ikon"]}" alt="" width="52" height="52"><h3><small>{u["kim"]}</small>{u["ad"]}</h3><p class="sorun2">{u["ozet"]}</p><p>{u["metin"]}</p><a href="{u["link"]}"{" target=\"_blank\" rel=\"noopener\"" if u["link"].startswith("http") else ""}>{u["link_ad"]}</a></div>' for u in K['urunler']).replace('{MERCEK}', MERCEK)
guven = ''.join(f'<div class="kart g-kart">{ikon(g[2])}<div><h3>{g[0]}</h3><p>{g[1]}</p></div></div>' for g in K['guven'])
sss = ''.join(f'<details><summary>{q[0]}</summary><p>{q[1]}</p></details>' for q in K['sss'])

# Alt bilgi (Atlassian düzeni örnek alındı): açık zeminli yuvarlak kutuda logo + dört sütun, altında telif satırı ve yasal bağlantılar.
# Üst menüden çıkan "Güvenlik" ve "Sıkça sorulan sorular" burada.
def sutun(baslik, baglar): return f'<div class="altb-s"><h3>{baslik}</h3><ul>' + ''.join(f'<li><a href="{h}"{" target=\"_blank\" rel=\"noopener\"" if h.startswith("https://claude.ai") else ""}>{t}</a></li>' for t, h in baglar) + '</ul></div>'
altbilgi = (f'<footer class="altb"><div class="ic"><div class="altb-kutu">'
            f'<div class="altb-s altb-marka"><a class="logo" href="#" aria-label="Moyo">{LOGO}</a><ul>'
            f'<li><a href="ebeveyn.html">Ebeveynler için</a></li><li><a href="{MERCEK}" target="_blank" rel="noopener">Uzmanlar için</a></li><li><a href="#nasil">Nasıl çalışır</a></li><li><a href="{SITE}destek">Bize yazın</a></li></ul></div>'
            + sutun('Uygulamalar', [('Moyo Ebeveyn', 'ebeveyn.html'), ('Moyo Oyun', '#sonraki'), ('Moyo Uzman', MERCEK)])
            + sutun('Yardım', [('Güvenlik', '#guven'), ('Sıkça sorulan sorular', '#sss'), ('Destek', SITE + 'destek')])
            + sutun('Yasal', [('Gizlilik Politikası', SITE + 'yasal/gizlilik'), ('Kullanım Koşulları', SITE + 'yasal/kosullar-parentapp'), ('KVKK başvurusu', SITE + 'yasal/kvkk-basvuru')])
            + f'</div><div class="altb-alt"><span>© 2026 Moyo</span><span class="altb-not">Ekranlardaki adlar örnektir. Bu sayfa çerez, reklam pikseli ya da analiz aracı kullanmaz.</span></div></div></footer>')

html = f'''<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Moyo · Çatı sayfa</title><link rel="icon" href="img/ikon-moyo.svg" type="image/svg+xml"><link rel="stylesheet" href="ortak.css"><link rel="stylesheet" href="c.css"><link rel="stylesheet" href="beyaz.css"><link rel="stylesheet" href="v4.css"></head><body class="sayfa-c beyaz">
<header class="ust"><div class="ic"><a class="logo" href="#" aria-label="Moyo">{LOGO}</a><nav class="menu" aria-label="Ana menü"><a href="#nasil">Nasıl çalışır</a><a class="kitle" href="ebeveyn.html">Ebeveynler için</a><a class="kitle" href="{MERCEK}" target="_blank" rel="noopener">Uzmanlar için</a></nav><div class="sag"><a class="hap cizgi k" href="#">Giriş yap</a><a class="hap dolu k" href="#">Ücretsiz deneyin</a>
<details class="dar-menu"><summary aria-label="Menü"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="m-ac" d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path class="m-kapat" d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></summary>
<nav aria-label="Menü"><a href="#nasil">Nasıl çalışır</a><a href="ebeveyn.html">Ebeveynler için</a><a href="{MERCEK}" target="_blank" rel="noopener">Uzmanlar için</a><a class="yalniz-dar" href="#">Giriş yap</a></nav></details></div></div></header>
<main>
<section class="acilis c" id="acilis"><div class="ic"><h1>{K["h1"]}</h1><p class="alt-etiket">{K["alt_etiket"]}</p><p class="alt">{K["alt"]}</p>
<div class="dugmeler"><a class="hap dolu b" href="#">Ücretsiz deneyin</a><a class="hap cizgi b" href="#nasil">Nasıl çalışır? ↓</a></div>
<p class="ince">{K["ince"]}</p></div></section>
{dongu(K["dongu"])}
<section class="giris-bant" id="giris"><div class="ic"><p class="ust-etiket">{K["giris_etiket"]}</p><h2>{K["giris_baslik"]}</h2><p>{K["giris_metin"]}</p>{basamak}</div></section>
{hikaye(K["adimlar"])}
{kompakt(K["adimlar"])}
<section class="bant" id="sonraki"><div class="ic"><div class="bas"><p class="ust-etiket">{K["urunler_etiket"]}</p><h2>{K["urunler_baslik"]}</h2><p>{K["urunler_metin"]}</p></div><div class="kartlar3">{urunler}</div></div></section>
<section class="bant sis" id="guven"><div class="ic"><div class="bas"><p class="ust-etiket">Güven</p><h2>Çocuğun verisi ailenindir</h2></div><div class="kartlar4">{guven}</div></div></section>
<section class="bant" id="sss"><div class="ic"><div class="bas"><p class="ust-etiket">Sıkça sorulanlar</p><h2>Sorular</h2><p>Sorunuzun yanıtını burada göremediyseniz bize <a href="{SITE}destek">destek sayfasından</a> yazın.</p></div><div class="sss">{sss}</div></div></section>
</main>
{altbilgi}
<script src="hikaye.js"></script><script src="eko.js"></script><script src="kompakt.js"></script><script src="menu.js"></script></body></html>'''
open('c.html', 'w').write(html); print('ok c.html')
