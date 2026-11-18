# Moyo logosu (çizgiye çevrilmiş yazı ve ürün kilitleri)

**Kullanıcı kararı 18 Kasım 2026 (Marketing penceresinde; logo seçeneği 6):** her yerde yalnız "moyo" yazısı. Yeni çizim Poppins
800'den, m ve y köşeleri yuvarlak, y'nin topu yok. İşaret (1E: üç bacaklı kubbe) yalnız uygulama simgesinde ve profil resminde;
yazıyla yan yana kullanılmaz. Renk: açık zeminde lacivert `#16113A`, koyu zeminde beyaz; yazıda yeşil yok. Ana dosyalar ve PNG'ler
Marketing setinde (`amy60946/marketing`, `marka/moyo-set-2026-11-18/`, BENIOKU.md; önizleme
https://claude.ai/artifact/UwCiTLv19kbjeMpd9bQm3e). Buradaki kopyalar: `kaynak/moyo-yazi.svg`, `kaynak/moyo-isaret.svg`.
12 Kasım'daki "Moyo c top adjusted" (toplu y) yazısının yerine geçti; harf yerleri ve genişlik aynı kaldığı için sayfalardaki ölçüler değişmedi.

- Uzman platformunda yanında ince "Mercek": Poppins 300, harf aralığı −0,03 em, son "o"dan 0,5 x yüksekliği uzakta, "o"nun taban çizgisinde.
- Tanıtım sayfalarında aynı kuralla "moyo Ebeveyn / Oyun / Uzman" (aileye dönük sayfalarda uzman ürünü "Moyo Uzman").

```bash
MOYO_BRAND=<parent-app>/brand python3 tools/logo/gen.py <çıktı>   # moyo-{lacivert,beyaz}.svg, moyo-mercek-{lacivert,beyaz}.svg, inline-moyo*.svg
python3 tools/logo/simge.py <çıktı>                                # ikon-moyo.svg (işaret %60), favicon-moyo.svg (%68, köşe 22)
```

Çıktının gittiği yerler: `site/assets/logo/` (dosyalar), `site/index.html` + `site/fiyat.html` (satır içi `logo-svg`, elle değil betikle
değiştirilir), `tools/cati-sayfa/inline-moyo*.svg` + `img/ikon-moyo.svg` + `img/favicon-moyo.svg`. Yazı tipi okuyucusu Moyo kitinden
(parent-app `brand/geom.py`, salt okunur; kitin sahibi Moyo penceresi). `inline-*.svg` sayfalara satır içi gömülür: harfler `currentColor`.
`site/assets/logo/moyo-yesil*.svg` ve `moyo-mercek-yesil*.svg` eski çizimdir; yalnız `oyun_rozet.js` (Moyo Oyun simgesi alternatifleri,
ayrı karar) okur, sayfalarda kullanılmaz.

**Moyo Mercek simgesi (kullanıcı seçimi 18 Kasım 2026, "B"):** beyaz zemin + lacivert işaret, karenin %60'ı (karar önizlemesi
`mercek-simge/onizleme.py`, https://claude.ai/artifact/M1cvYU5CbTYZaECvV9fZrY: A eski iki satır · B seçilen · C yeşil zemin).
`python3 tools/logo/simge.py <çıktı> png` uygulamanın `assets/icon.png` (1024, saydamlıksız), `assets/favicon.png` (48, köşesi yuvarlak,
%68) ve `assets/splash-icon.png` (koyu açılış zemininde beyaz "moyo Mercek" kilidi; `app.json` `imageWidth` 300) dosyalarını da yazar;
`ikon-mercek.svg` (tanıtım sayfalarındaki küçük simge) ve `favicon-mercek.svg` (Mercek sitesinin sekme simgesi) aynı betikten.
İki satırlı "mo / yo" simgesi ve üreticisi (`ikon.py`) kalktı.
