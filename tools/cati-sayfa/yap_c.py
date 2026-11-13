# Çatı sayfa C, üçüncü sürüm (kullanıcı isteği 13 Kasım 2026): "platform" başlığı, Türk kültürüne uygun üç alt başlık seçeneği,
# net üç adım, sorun satırı yok, gerçek ürün ekranları, Oyun adımında oyun + ebeveyn telefonu yan yana döngü,
# "Hepsi birlikte" tam ekran dönen anlatım; telefonda kaydırma anlatımı yok (alt alta + yana kaydırılan kartlar).
import re, html as H, json, sys
LOGO = open('inline-moyo.svg').read().strip()
LOGO = re.sub(r' role="img" aria-label="[^"]*"', ' aria-hidden="true" focusable="false"', LOGO).replace(' xmlns="http://www.w3.org/2000/svg"', '')
MERCEK = 'https://claude.ai/artifact/H2hwv9mqx9CDtjjEsYP6UE#mercek'
K = json.load(open('c-metin.json'))            # metinler ayrı dosyada (araştırmadan sonra değişir)
IMG = {k: 'img/c-%s.webp' % k for k in ['ebeveyn-rutin', 'ebeveyn-onay', 'ebeveyn-uzman', 'oyun-onay', 'oyun-liste', 'mercek-veri', 'mercek-egitim']}
e = H.escape

def resim(key, alt, cls=''):
    return f'<img class="{cls}" src="{IMG[key]}" alt="{e(alt)}" loading="lazy" decoding="async">'

def ikili(buyuk=True):
    # Oyun + Moyo Ebeveyn telefonu yan yana; balonlar görsellerin üstündeki şeritte gider gelir (ekranların üstüne binmez)
    return (f'<div class="ikili{" buyuk" if buyuk else ""}" role="img" aria-label="{e(K["ikili_alt"])}">'
            f'<div class="i-akis" aria-hidden="true"><span class="cizgi"></span><span class="balon git">{K["balon_git"]}</span><span class="balon don">{K["balon_don"]}</span></div>'
            f'<div class="i-sira"><figure class="i-tablet">{resim("oyun-onay", K["oyun_onay_alt"])}<figcaption>Moyo Oyun · çocuğunuz</figcaption></figure>'
            f'<figure class="i-telefon">{resim("ebeveyn-onay", K["ebeveyn_onay_alt"], "telefon")}<figcaption>Moyo Ebeveyn · siz</figcaption></figure></div></div>')

def adim_gorsel(a):
    if a['gorsel'] == 'ikili': return ikili()
    cls = 'telefon' if a['gorsel'].startswith('ebeveyn') else ('panel' if a['gorsel'].startswith('mercek') else '')
    return resim(a['gorsel'], a['alt'], cls)

def hikaye(adimlar):
    yaz, kart, nok, lis = [], [], [], []
    for i, a in enumerate(adimlar):
        ol = ('<ol class="adim-liste">' + ''.join(f'<li><b>{x[0]}</b> {x[1]}</li>' for x in a.get('liste', [])) + '</ol>') if a.get('liste') else ''
        yaz.append(f'<div class="hk-yazi"><span class="rol">{a["rol"]}</span><h2>{a["baslik"]}</h2><p>{a["metin"]}</p>{ol}</div>')
        g = adim_gorsel(a)
        cls = 'genis' if a['gorsel'] == 'ikili' else ('telefon' if a['gorsel'].startswith('ebeveyn') else ('panel' if a['gorsel'].startswith('mercek') else ''))
        kart.append(f'<figure class="hk-kart {cls}">{g}' + (f'<figcaption>{a["etiket"]}</figcaption>' if a['gorsel'] != 'ikili' else '') + '</figure>')
        nok.append(f'<li><a href="#nasil" aria-label="{i + 1}. adım: {a["kisa"]}"><span class="n">{i + 1}</span><span class="ad">{a["kisa"]}</span></a></li>')
        lis.append(f'<article class="cikis"><div class="l-yazi"><span class="rol">{a["rol"]}</span><h2>{a["baslik"]}</h2><p>{a["metin"]}</p>{ol}</div><div class="l-gorsel {cls}">{g}</div></article>')
    return (f'<section class="hikaye statik" id="nasil" data-mobil="liste" style="--adim:{len(adimlar)}" aria-label="Moyo nasıl çalışır"><div class="hk-sahne ic">'
            f'<div class="hk-yazilar">{"".join(yaz)}</div><div class="hk-kartlar" aria-hidden="true">{"".join(kart)}</div>'
            f'<ol class="hk-nokta" aria-label="Adımlar">{"".join(nok)}</ol>'
            f'<div class="hk-liste">{"".join(lis)}</div></div></section>')

def mini_ikili():
    # Telefon/iPad: oyun ekranı + köşesinde ebeveynin onay ekranı (üst üste, tek görsel kadar yer)
    return (f'<div class="ust-uste" role="img" aria-label="{e(K["ikili_alt"])}">'
            f'{resim("oyun-onay", K["oyun_onay_alt"], "uu-oyun")}{resim("ebeveyn-onay", K["ebeveyn_onay_alt"], "uu-tel")}'
            f'</div>')

def kompakt(adimlar):
    # Telefon ve iPad için "Nasıl çalışır": üç düzen (önizlemede seçilir). Aynı içerik: görsel + kısa yazı yan yana ya da üst üste.
    pills, paneller = [], []
    for i, a in enumerate(adimlar):
        g = mini_ikili() if a['gorsel'] == 'ikili' else resim(a['gorsel'], a['alt'], 'telefon' if a['gorsel'].startswith('ebeveyn') else 'panel')
        tur = 'ikili' if a['gorsel'] == 'ikili' else a['gorsel'].split('-')[0]
        rozet = '<span class="nk-rozet">İsteğe bağlı</span>' if 'isteğe bağlı' in a['rol'] else ''
        pills.append(f'<button type="button" role="tab" id="nk-t{i}" aria-controls="nk-p{i}" aria-selected="{"true" if i == 0 else "false"}" data-i="{i}"><span class="n">{i + 1}</span><span class="ad">{a["kisa"].replace("Moyo ", "<span class=\"uzun\">Moyo </span>")}</span></button>')
        paneller.append(f'<article class="nk-adim t-{tur}" role="tabpanel" id="nk-p{i}" aria-labelledby="nk-t{i}" data-i="{i}"><div class="nk-gorsel">{g}</div>'
                        f'<div class="nk-yazi"><span class="rol">{i + 1} · {a["rol"].split(" · ")[0]}{rozet}</span><h3>{a["baslik"]}</h3><p>{a["ozet"]}</p></div></article>')
    secici = ('<div class="nk-secici" role="group" aria-label="Önizleme: telefon ve iPad düzeni"><span>Önizleme · telefon/iPad düzeni</span>'
              + ''.join(f'<button type="button" data-duzen="{k}" aria-pressed="{"true" if k == "sekme" else "false"}">{ad}</button>' for k, ad in [('sekme', 'Sekmeler'), ('kart', 'Kartlar'), ('liste', 'Liste')]) + '</div>')
    return (f'<section class="nk" id="nasil-k" data-duzen="sekme" aria-label="Moyo nasıl çalışır"><div class="ic">{secici}'
            f'<div class="nk-sekmeler" role="tablist" aria-label="Adımlar">{"".join(pills)}</div>'
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
    # Tam ekran dönen anlatım: 6 cihaz bir halkada; kaydırdıkça halka 60° döner, öndeki büyür. Telefonda yana kaydırılan kartlar.
    slots, pills, kartlar = [], [], []
    for i, b in enumerate(beats):
        g = ikili(False) if b['gorsel'] == 'ikili' else resim(b['gorsel'], b['alt'], 'telefon' if b['gorsel'].startswith('ebeveyn') else ('panel' if b['gorsel'].startswith('mercek') else ''))
        tur = 'ikili' if b['gorsel'] == 'ikili' else b['gorsel'].split('-')[0]
        slots.append(f'<div class="d-slot t-{tur}" style="--i:{i}">{g}</div>')
        pills.append(f'<li><a href="#hepsi" aria-label="{i + 1}. {b["kim"]}: {b["baslik"]}"><span class="n">{i + 1}</span><span class="ad">{b["kisa"]}</span></a></li>')
        kartlar.append(f'<li class="d-kart t-{tur}"><div class="d-gorsel">{g}</div><div class="d-yazi"><span class="rol">{i + 1} · {b["kim"]}</span><h3>{b["baslik"]}</h3><p>{b["metin"]}</p></div></li>')
    yazilar = ''.join(f'<div class="d-yazi-m" data-i="{i}"><span class="rol">{i + 1} · {b["kim"]}</span><h3>{b["baslik"]}</h3><p>{b["metin"]}</p></div>' for i, b in enumerate(beats))
    return (f'<section class="dongu-b statik" id="hepsi" style="--n:{len(beats)}" aria-label="{e(K["dongu_baslik"])}">'
            f'<div class="d-kayit"><div class="d-sahne"><div class="d-ust"><p class="ust-etiket">{K["dongu_etiket"]}</p><h2>{K["dongu_baslik"]}</h2></div>'
            f'<div class="d-halka-kap" aria-hidden="true"><div class="d-halka">{"".join(slots)}</div></div>'
            f'<div class="d-yazilar" aria-live="polite">{yazilar}</div><ol class="d-nokta" aria-label="Döngünün adımları">{"".join(pills)}</ol></div></div>'
            f'<div class="d-mobil ic"><p class="ust-etiket">{K["dongu_etiket"]}</p><h2>{K["dongu_baslik"]}</h2>'
            f'<ol class="d-serit" tabindex="0" aria-label="Döngünün adımları, yana kaydırın">{"".join(kartlar)}</ol>'
            f'<div class="d-kontrol"><button type="button" class="d-geri" aria-label="Önceki adım">‹</button><span class="d-sayac" aria-live="polite">1 / {len(beats)}</span><button type="button" class="d-ileri" aria-label="Sonraki adım">›</button></div></div>'
            f'<p class="d-kapanis ic">{K["dongu_kapanis"]}</p></section>')

alts = ''.join(f'<span class="alt-sec" data-alt="{i + 1}"{"" if i == 0 else " hidden"}>{t}</span>' for i, t in enumerate(K['alt_basliklar']))
secici = ('<div class="alt-secici" role="group" aria-label="Önizleme: alt başlık seçeneği"><span>Önizleme · alt başlık</span>'
          + ''.join(f'<button type="button" data-alt="{i + 1}" aria-pressed="{"true" if i == 0 else "false"}">{K["alt_etiketler"][i]}</button>' for i in range(len(K['alt_basliklar']))) + '</div>')
basamak = '<ol class="basamak">' + ''.join(f'<li{" class=\"istege\"" if s[2] else ""}><b><span class="bn">{i + 1}</span>{s[0]}{f"<span class=\"b-rozet\">{s[2]}</span>" if s[2] else ""}</b>{s[1]}</li>' for i, s in enumerate(K['basamak'])) + '</ol>'
urunler = ''.join(f'<div class="kart urun"><img class="u-ikon" src="{u["ikon"]}" alt="" width="52" height="52"><h3><small>{u["kim"]}</small>{u["ad"]}</h3><p class="sorun2">{u["ozet"]}</p><p>{u["metin"]}</p><a href="{u["link"]}"{" target=\"_blank\" rel=\"noopener\"" if u["link"].startswith("http") else ""}>{u["link_ad"]}</a></div>' for u in K['urunler']).replace('{MERCEK}', MERCEK)
guven = ''.join(f'<div class="kart g-kart">{ikon(g[2])}<div><h3>{g[0]}</h3><p>{g[1]}</p></div></div>' for g in K['guven'])
sss = ''.join(f'<details><summary>{q[0]}</summary><p>{q[1]}</p></details>' for q in K['sss'])

html = f'''<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Moyo · Çatı sayfa</title><link rel="icon" href="img/ikon-moyo.svg" type="image/svg+xml"><link rel="stylesheet" href="ortak.css"><link rel="stylesheet" href="c.css"></head><body class="sayfa-c">
<header class="ust"><div class="ic"><a class="logo" href="#" aria-label="Moyo">{LOGO}</a><nav class="menu" aria-label="Ana menü"><a href="#nasil">Nasıl çalışır</a><a class="kitle" href="a.html">Ebeveynler için</a><a class="kitle" href="{MERCEK}" target="_blank" rel="noopener">Uzmanlar için ↗</a><a href="#guven">Güvenlik</a><a href="#sss">Sorular</a></nav><div class="sag"><a class="hap cizgi k" href="#">Giriş yap</a><a class="hap dolu k" href="#">Ücretsiz deneyin</a></div></div></header>
<main>
<section class="acilis c"><div class="ic"><h1>{K["h1"]}</h1><p class="alt">{alts}</p>
<div class="dugmeler"><a class="hap dolu b" href="#">Ücretsiz deneyin</a><a class="hap cizgi b" href="#nasil">Nasıl çalışır? ↓</a></div>
<p class="ince">{K["fiyat_not"]}</p>{secici}</div></section>
<section class="giris-bant"><div class="ic"><p class="ust-etiket">{K["giris_etiket"]}</p><h2>{K["giris_baslik"]}</h2><p>{K["giris_metin"]}</p>{basamak}</div></section>
{hikaye(K["adimlar"])}
{kompakt(K["adimlar"])}
{dongu(K["dongu"])}
<section class="bant" id="sonraki"><div class="ic"><div class="bas"><p class="ust-etiket">{K["urunler_etiket"]}</p><h2>{K["urunler_baslik"]}</h2><p>{K["urunler_metin"]}</p></div><div class="kartlar3">{urunler}</div></div></section>
<section class="bant sis" id="guven"><div class="ic"><div class="bas"><p class="ust-etiket">Güven</p><h2>Çocuğun verisi ailenindir</h2></div><div class="kartlar4">{guven}</div></div></section>
<section class="bant" id="sss"><div class="ic"><div class="bas"><p class="ust-etiket">Sıkça sorulanlar</p><h2>Sorular</h2><p>Sorunuzun yanıtını burada göremediyseniz bize <a href="https://moyoapp.com.tr/destek">destek sayfasından</a> yazın.</p></div><div class="sss">{sss}</div></div></section>
</main>
<footer class="alt-bilgi"><div class="ic"><span>© 2026 Moyo</span><span>Önizleme · metinler taslak · görsellerde örnek veri</span></div></footer>
<script src="hikaye.js"></script><script src="dongu.js"></script><script src="kompakt.js"></script></body></html>'''
open('c.html', 'w').write(html); print('ok c.html')
