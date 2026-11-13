# Moyo Ebeveyn tanıtım sayfası (kullanıcı isteği 13–14 Kasım 2026): çatı sayfa C'nin "Nasıl çalışır", gerçek ekranlar ve
# "Moyo Ekosistemi" diliyle; ebeveyne özel açılış, fiyat ve sorular. Ortak parçalar yap_c.py'den (aynı metinler: c-metin.json).
import json, contextlib, io
with contextlib.redirect_stdout(io.StringIO()):
    import yap_c as C          # c.html'i de yeniden yazar; parçaları (hikaye, kompakt, dongu, ikon, ikili) buradan alırız
E = json.load(open('e-metin.json')); K = C.K; e = C.e
CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
isaret = ''.join(f'<li>{CHECK}{x}</li>' for x in E['isaretler'])
basamak = '<ol class="basamak">' + ''.join(f'<li{" class=\"istege\"" if s[2] else ""}><b><span class="bn">{i + 1}</span>{s[0]}{f"<span class=\"b-rozet\">{s[2]}</span>" if s[2] else ""}</b>{s[1]}</li>' for i, s in enumerate(K['basamak'])) + '</ol>'
urunler = ''.join(f'<div class="kart urun"><img class="u-ikon" src="{u["ikon"]}" alt="" width="52" height="52"><h3><small>{u["kim"]}</small>{u["ad"]}</h3><p class="sorun2">{u["ozet"]}</p><p>{u["metin"]}</p>'
                  + (f'<a href="{C.MERCEK}" target="_blank" rel="noopener">Uzmanınız için: Moyo Mercek ↗</a>' if 'Mercek' in u['ad'] else '') + '</div>' for u in K['urunler'])
guven = ''.join(f'<div class="kart g-kart">{C.ikon(g[2])}<div><h3>{g[0]}</h3><p>{g[1]}</p></div></div>' for g in K['guven'])
fiyat = ''.join(f'<div class="kart f-kart"><h3><small>{f[0]}</small>{f[1]}</h3><p>{f[2]}</p></div>' for f in E['fiyat'])
sss = ''.join(f'<details><summary>{q[0]}</summary><p>{q[1]}</p></details>' for q in E['sss'])

html = f'''<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E["baslik"]}</title><link rel="icon" href="img/ikon-moyo.svg" type="image/svg+xml"><link rel="stylesheet" href="ortak.css"><link rel="stylesheet" href="c.css"><link rel="stylesheet" href="e.css"></head><body class="sayfa-c sayfa-e">
<header class="ust"><div class="ic"><a class="logo" href="#" aria-label="Moyo">{C.LOGO}</a><nav class="menu" aria-label="Ana menü"><a href="#nasil">Nasıl çalışır</a><a href="#hepsi">Moyo Ekosistemi</a><a href="#guven">Güvenlik</a><a href="#fiyat">Fiyat</a><a href="#sss">Sorular</a><a href="{C.MERCEK}" target="_blank" rel="noopener">Uzmanlar için ↗</a></nav><div class="sag"><a class="hap cizgi k" href="#">Giriş yap</a><a class="hap dolu k" href="#">Ücretsiz deneyin</a></div></div></header>
<main>
<section class="e-acilis"><div class="ic">
 <div class="e-yazi"><p class="e-ust">moyo Ebeveyn</p><h1>{E["h1"]}</h1><p class="alt">{E["alt"]}</p>
  <div class="dugmeler"><a class="hap dolu b" href="#">Ücretsiz deneyin</a><a class="hap cizgi b" href="#nasil">Nasıl çalışır? ↓</a></div>
  <ul class="e-isaret">{isaret}</ul><p class="ince">{E["fiyat_not"]}</p></div>
 <div class="e-gorsel"><div class="e-genis">{C.ikili(True)}</div><div class="e-dar">{C.mini_ikili()}</div></div>
</div></section>
<section class="giris-bant"><div class="ic"><p class="ust-etiket">{K["giris_etiket"]}</p><h2>{K["giris_baslik"]}</h2><p>{K["giris_metin"]}</p>{basamak}</div></section>
{C.hikaye(K["adimlar"])}
{C.kompakt(K["adimlar"])}
{C.dongu(K["dongu"])}
<section class="bant" id="sonraki"><div class="ic"><div class="bas"><p class="ust-etiket">{K["urunler_etiket"]}</p><h2>{K["urunler_baslik"]}</h2><p>{K["urunler_metin"]}</p></div><div class="kartlar3">{urunler}</div></div></section>
<section class="bant sis" id="guven"><div class="ic"><div class="bas"><p class="ust-etiket">Güven</p><h2>Çocuğun verisi ailenindir</h2></div><div class="kartlar4">{guven}</div></div></section>
<section class="bant" id="fiyat"><div class="ic"><div class="bas"><p class="ust-etiket">Fiyat</p><h2>Oyun ücretsiz, ebeveyn uygulaması 7 gün ücretsiz</h2><p>Fiyatlar uygulamalar App Store'da yayınlandığında burada yer alacak.</p></div><div class="kartlar2">{fiyat}</div></div></section>
<section class="bant sis" id="sss"><div class="ic"><div class="bas"><p class="ust-etiket">Sıkça sorulanlar</p><h2>Sorular</h2></div><div class="sss">{sss}</div></div></section>
<section class="bant kapanis"><div class="ic"><h2>Çocuğunuzun günlük rutinine bugün başlayın</h2><div class="dugmeler"><a class="hap dolu b" href="#">Ücretsiz deneyin</a><a class="hap cizgi b" href="#">Giriş yapın</a></div><p class="ince">{E["fiyat_not"]}</p></div></section>
</main>
<footer class="alt-bilgi"><div class="ic"><span>© 2026 Moyo</span><span>Önizleme · metinler taslak · görsellerde örnek veri</span></div></footer>
<script src="hikaye.js"></script><script src="dongu.js"></script><script src="kompakt.js"></script></body></html>'''
open('ebeveyn.html', 'w').write(html); print('ok ebeveyn.html')
