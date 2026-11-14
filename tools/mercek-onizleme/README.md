# Moyo Mercek tanıtım sitesi: önizleme kabuğu

Önizleme: https://claude.ai/artifact/4g3viopCTWujHervSVzpWt. `host.html` sayfa olarak, sitenin dosyaları `site/…` yoluyla
`files` ile yayınlanır (`site/index.html`, `site/fiyat.html`, `site/assets/**`). Başka pencereden yayınlarken önce `read`, sonra `url`.

- Sekmeler: Ana sayfa · Fiyat sayfası · 14 Kasım notu ve benchmark; Masaüstü / Telefon.
- "Neden" bölümünün üç düzeni (1 Akış · 2 Bento · 3 Hafta) `site/index.html?neden=N` ile seçilir (`site.js` 7. madde); yayında
  `#degerler` `data-neden` varsayılanı kalır. Seçim gelince öteki ikisi HTML ve CSS'ten silinir.
- Açılıştaki ürün turu `site/assets/motion/akis.mp4` ← `tools/landing-motion` `node record.js akis` (`scenes/akis.js`; kamera
  yakınlaşması `kit.js` `zoom` / `unzoom`). Kaydın altındaki 1-2-3 çiplerinin `data-t` saniyeleri `out/manifest.json`'daki `beats`'ten.
