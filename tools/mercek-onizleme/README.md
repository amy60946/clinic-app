# Moyo Mercek tanıtım sitesi: önizleme kabuğu

Önizleme: https://claude.ai/artifact/4g3viopCTWujHervSVzpWt. `host.html` sayfa olarak, sitenin dosyaları `site/…` yoluyla
`files` ile yayınlanır: `site/index.html`, `site/fiyat.html`, `site/guvenlik.html`, `site/assets/**` (`site/assets/oniz.js` dahil).
Başka pencereden yayınlarken önce `read`, sonra `url`.

- Sekmeler: Ana sayfa · Fiyat · Gizlilik ve güvenlik · Bu turda (19 Kasım, 3. tur notu: kabul edilen seçenekler, yeni seçenekler,
  bekleyen kontroller). Ekran boyu: Masaüstü / Tablet 820 × 1180 / Telefon 390 × 844 (kabuk 720 px'ten darsa gizli, sayfa tam genişlik).
- **Alternatifler** (18 Kasım 2026): sayfa `<head>`'de `#oniz-gruplar` JSON'unu ve `site/assets/oniz.js`'i taşır
  (`tools/cati-sayfa/oniz.js` ile aynı dosya). Kabuk `iframe.contentWindow.onizGruplar`'ı okur, seçeneğe dokununca `onizSec(k, v)`
  çağırır ve `hedef`e (değere özel `hedefler[v]` varsa ona) kaydırır. Gruptaki `neden` panelde önerinin gerekçesi olarak yazar.
  Seçimler tarayıcıda `mercek.oniz.v2` anahtarında; "Seçimlerimi kopyala" sohbete yapıştırılacak özeti verir, "Önerilere dön" sıfırlar.
- Sitede önizlemeye özel her parça `ONIZ:BAS` … `ONIZ:SON` işaretleri arasındadır (HTML'de yorum, CSS ve JS'de blok yorumu, işaretler
  kendi satırlarında). `bash site/build.sh` bu aralıkları ve önerilen alternatiflerdeki `data-var` işaretini canlı çıktıdan
  (`dist-mercek/`) siler, `oniz.js`'i kopyalamaz. Bir alternatif seçilince: seçilen parça işaretlerin dışına alınır, öteki
  parçalar ve stilleri silinir, grup JSON'dan çıkar.
- **Ortak grup:** grupta `"ortak": true` varsa (renk teması `tema`) seçim sayfaya değil `'*'` anahtarına yazılır; üç sayfada birlikte
  değişir, "Seçimlerimi kopyala" yanına "[üç sayfa]" yazar.
- **19 Kasım 2026 (tur 3):** kabul edilen `dsira` (a: Davet 2. adım) ve `kimler` (c: kayan şerit, üç sıra, Duraklat düğmesi yok) kalıcı;
  öteki seçenekler, metinleri, stilleri ve betikleri silindi. Açık gruplar: `tema` (üç sayfada; öneri `b` açık renk ağırlıklı, `site.css`
  "Açık renk ağırlıklı tema" bloğu `html:not([data-v-tema="a"])` ile canlı düzende, `a` bugünkü koyu düzen), `neden` (öneri `a` ekranlı
  renkli kartlar canlı düzende; `b` simge, `c` bugünkü akış ONIZ'de, aynı işaretleme CSS ile değişir), `psub` (pano alt başlığı, öneri `a`),
  `plens` (pano büyüteci; öneri `a` canlı düzende, `b` kırpımlar ve `c` bugünkü kayıt ONIZ'de). Yeni görseller: `site/assets/pano-2x.webp`
  (pano kaydının verisiyle durağan kare, 2x) ve `site/assets/neden-*.webp` (eğitim ekranlarından kırpım, 2x); çekim düzeneği
  `tools/landing-motion/kit.js` `open` ile aynı veri ve saat, imleç gizli.
- Açılıştaki ürün turu `site/assets/motion/akis.mp4` ← `tools/landing-motion` `node record.js akis` (`scenes/akis.js`; kamera
  yakınlaşması `kit.js` `zoom` / `unzoom`). Kaydın altındaki 1-2-3 çiplerinin `data-t` saniyeleri `out/manifest.json`'daki `beats`'ten.
  Boyutu yalnız CSS'te (`site.css` "Açılış" bölümü, `--hm-w`): ilk ekranda kaydın yaklaşık %45'i görünür.
