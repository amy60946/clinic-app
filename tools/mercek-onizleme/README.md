# Moyo Mercek tanıtım sitesi: önizleme kabuğu

Önizleme: https://claude.ai/artifact/4g3viopCTWujHervSVzpWt. `host.html` sayfa olarak, sitenin dosyaları `site/…` yoluyla
`files` ile yayınlanır: `site/index.html`, `site/fiyat.html`, `site/guvenlik.html`, `site/assets/**` (`site/assets/oniz.js` dahil).
Başka pencereden yayınlarken önce `read`, sonra `url`.

- Sekmeler: Ana sayfa · Fiyat · Gizlilik ve güvenlik · Bu turda (19 Kasım, 4. tur notu: kabul edilen seçenekler, yeni seçenekler,
  bekleyen kontroller). Ekran boyu: Masaüstü / Tablet 820 × 1180 / Telefon 390 × 844 (kabuk 720 px'ten darsa gizli, sayfa tam genişlik).
- **Alternatifler** (18 Kasım 2026): sayfa `<head>`'de `#oniz-gruplar` JSON'unu ve `site/assets/oniz.js`'i taşır
  (`tools/cati-sayfa/oniz.js` ile aynı dosya). Kabuk `iframe.contentWindow.onizGruplar`'ı okur, seçeneğe dokununca `onizSec(k, v)`
  çağırır ve `hedef`e (değere özel `hedefler[v]` varsa ona) kaydırır. Gruptaki `neden` panelde önerinin gerekçesi olarak yazar.
  Seçimler tarayıcıda `mercek.oniz.v3` anahtarında (4. turda yenilendi: eski seçimler yeni pano seçeneklerine karışmasın); "Seçimlerimi kopyala" sohbete yapıştırılacak özeti verir, "Önerilere dön" sıfırlar.
- Sitede önizlemeye özel her parça `ONIZ:BAS` … `ONIZ:SON` işaretleri arasındadır (HTML'de yorum, CSS ve JS'de blok yorumu, işaretler
  kendi satırlarında). `bash site/build.sh` bu aralıkları ve önerilen alternatiflerdeki `data-var` işaretini canlı çıktıdan
  (`dist-mercek/`) siler, `oniz.js`'i kopyalamaz. Bir alternatif seçilince: seçilen parça işaretlerin dışına alınır, öteki
  parçalar ve stilleri silinir, grup JSON'dan çıkar.
- **19 Kasım 2026 (tur 4):** kabul edilen `tema` (b: açık renk ağırlıklı; değerler `site.css`'in temel kurallarında, koyu bölüm kalmadı,
  pano bölümünün sınıfı `sec-tint`), `neden` (a: ekranlı renkli kartlar) ve `psub` (a) kalıcı; öteki seçenekler, metinleri, stilleri ve
  betikleri silindi. Fiyat ve güvenlik sayfalarında grup kalmadı (`#oniz-gruplar` ve `oniz.js` yok, kabukta Alternatifler düğmesi gizli).
  Pano büyüteci (`plens`) kalktı; yerine `pvurgu` (pano: üç bölümü gösterme): a öneri ve canlı düzen (alt başlıktaki üç ifade `.pi` ve
  panodaki üç bölüm aynı renkte: başlıkta bant, kartların çevresinde çizgi), b numaralı işaretler ve açıklamalar, c sırayla vurgu (betik
  `site.js` ONIZ bölümünde), d yalın çizgi; b, c, d ONIZ'de. Görsel `site/assets/pano-2x.webp`; işaretler görselin 1440 × 900 düzleminde,
  kırpım `--ox/--oy/--ow/--oh` (`site.css` "Pano: renkli başlıklar"). Eski `assets/motion/pano.*` kaydı artık hiçbir sayfada kullanılmıyor.
- Açılıştaki ürün turu `site/assets/motion/akis.mp4` ← `tools/landing-motion` `node record.js akis` (`scenes/akis.js`; kamera
  yakınlaşması `kit.js` `zoom` / `unzoom`). Kaydın altındaki 1-2-3 çiplerinin `data-t` saniyeleri `out/manifest.json`'daki `beats`'ten.
  Boyutu yalnız CSS'te (`site.css` "Açılış" bölümü, `--hm-w`): ilk ekranda kaydın yaklaşık %45'i görünür.
