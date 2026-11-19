# Moyo Mercek tanıtım sitesi: önizleme kabuğu

Önizleme: https://claude.ai/artifact/4g3viopCTWujHervSVzpWt. `host.html` sayfa olarak, sitenin dosyaları `site/…` yoluyla
`files` ile yayınlanır: `site/index.html`, `site/fiyat.html`, `site/guvenlik.html`, `site/assets/**` (`site/assets/oniz.js` dahil).
Başka pencereden yayınlarken önce `read`, sonra `url`.

- Sekmeler: Ana sayfa · Fiyat · Gizlilik ve güvenlik · Bu turda (19 Kasım notu: kabul edilen seçenekler, yeni seçenekler,
  bekleyen kontroller). Ekran boyu: Masaüstü / Tablet 820 × 1180 / Telefon 390 × 844 (kabuk 720 px'ten darsa gizli, sayfa tam genişlik).
- **Alternatifler** (18 Kasım 2026): sayfa `<head>`'de `#oniz-gruplar` JSON'unu ve `site/assets/oniz.js`'i taşır
  (`tools/cati-sayfa/oniz.js` ile aynı dosya). Kabuk `iframe.contentWindow.onizGruplar`'ı okur, seçeneğe dokununca `onizSec(k, v)`
  çağırır ve `hedef`e (değere özel `hedefler[v]` varsa ona) kaydırır. Gruptaki `neden` panelde önerinin gerekçesi olarak yazar.
  Seçimler tarayıcıda `mercek.oniz.v1` anahtarında; "Seçimlerimi kopyala" sohbete yapıştırılacak özeti verir, "Önerilere dön" sıfırlar.
- Sitede önizlemeye özel her parça `ONIZ:BAS` … `ONIZ:SON` işaretleri arasındadır (HTML'de yorum, CSS ve JS'de blok yorumu, işaretler
  kendi satırlarında). `bash site/build.sh` bu aralıkları ve önerilen alternatiflerdeki `data-var` işaretini canlı çıktıdan
  (`dist-mercek/`) siler, `oniz.js`'i kopyalamaz. Bir alternatif seçilince: seçilen parça işaretlerin dışına alınır, öteki
  parçalar ve stilleri silinir, grup JSON'dan çıkar.
- **19 Kasım 2026 (tur 2):** kabul edilen `ince` (a) ve `davet` (a) gruplarının öteki seçenekleri, metinleri ve stilleri silindi.
  Açık gruplar: `dsira` (Davet adımının sırası; seçenek değişince `site.js` ONIZ bloğu sekmeyi ve paneli taşır, sekmeler
  `esitle` ile yeniden numaralanır) ve `kimler` (öneri `e` senaryo kartları; `a`, `f`, `b`, `c`, `d` önizlemede). `e` canlı
  düzende (`site.css` "Kimler için: senaryo kartları", `site.js` "7"); öneri değişirse `a`'nın stili ve `[data-km]` satırı ONIZ'den
  çıkarılır.
- Eski "Neden" düzenleri (`?neden=N`) 14 Kasım'da kapandı; yalnız "1 Akış" duruyor.
- Açılıştaki ürün turu `site/assets/motion/akis.mp4` ← `tools/landing-motion` `node record.js akis` (`scenes/akis.js`; kamera
  yakınlaşması `kit.js` `zoom` / `unzoom`). Kaydın altındaki 1-2-3 çiplerinin `data-t` saniyeleri `out/manifest.json`'daki `beats`'ten.
  Boyutu yalnız CSS'te (`site.css` "Açılış" bölümü, `--hm-w`): ilk ekranda kaydın yaklaşık %45'i görünür.
