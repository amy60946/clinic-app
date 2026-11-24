# Gerçek ürün ekranları (çatı sayfa ve Moyo Ebeveyn sayfası)

Tam ekran, kırpılmamış, uydurma veriyle. Çıktılar `../img/` altına webp olarak yazılır.

```bash
# Moyo Mercek (1440×900 masaüstü + 600×1298 telefon): önce clinic-app'te önizleme derlenir
bash preview/build.sh && node tools/cati-sayfa/cek/mercek.js            # hepsi; tek tek: node … mercek-rutin mercek-rutin-tel

# Moyo (ParentApp, 390×844 ×2 → 600×1298): önce parent-app'te önizleme derlenir (PARENT_APP ile yol değişir)
(cd ../parent-app && bash preview/build.sh) && node tools/cati-sayfa/cek/moyo.js   # hepsi; tek tek: node … moyo-onay
```

- `mercek.js`: oturum ve uydurma veri `tools/landing-motion/kit.js` (`kit.open`) ile; imleç gizlenir.
- `moyo.js` + `moyo.json`: giriş ve uydurma aile parent-app `store/capture/prep.js` ile; adım sözdizimi dosyanın başında.
  `keep` uzmanın bekleyen rutin ve adım önerilerini korur, `noSessions` randevuları çıkarır (Uzmanım ekranı için).
- `kucult.py`: PNG → webp (quality 86).
- `c-baglan` (çatı sayfa 2. kart, 19 Kasım 2026): `invite` bağlanmamış bir uzman daveti ekler (kod K7M2PA), adımlar `type:` (alana yaz) ve `cb:` (onay kutusu).
- `img/c-davranis.webp` çekim değil, `mercek-davranis.webp`'ten kırpım: x 341–748, y 168–521 (ilk cümlenin sonu, "Öncül" ile "Sonuç" sütunlarının arası, 2. satırın çizgisi; 24 Kasım 2026, Süre sütunlu yeni tablo).
  Hakkımızda `img/k-uzman.webp` (x 366–1306, y 372–645: olay tablosu) ve `img/k-uzman-dar.webp` (x 562–918: yalnız Öncül ve Sonuç) da aynı görselden; `img/k-ebeveyn.webp` = `e-davranis.webp`'in üst 730 pikseli.
- Betik ekranda "macera" görürse uyarır; "Rutin ekle"deki "…oyunda çocuğunuz için bir macera olur" cümlesi beklenen bilgidir.

## 24 Kasım 2026: ebeveyn eğitimi kapalı (ortak `akislar.md` 27.4)

- Eğitim ekranları çıktı (`moyo-uzman-sade`, `moyo-egitim`, `mercek-egitim*`, `c-mercek-egitim`). Mercek çekimlerinde danışan Ev Rutinleri'yle açılır, menü Planla / Takip.
- `moyo-uzman-oneri` (çatı 5. kart ve Moyo Ebeveyn 5. adım): Uzmanım'da tek randevu (seans ücretiyle) ve uzmanın rutin önerisi. `moyo.json`:
  `"keep": "rutin"` yalnız rutin paketini geri koyar ("coin" yazan tek adım kartı görünmez), `"sessions": {"keep": ["demo-ses-3"], "fee": 1200}`,
  `hideBlock` "Bugün yapılacaklar" ve "Randevu al" satırını gizler. Telefon sürümü `CEK_H=700 CEK_EK=-m CEK_GEN=820`.
- `mercek.js e-nz-uzman`: Moyo Ebeveyn sayfasının "Neden Moyo" uzman paneli (780 × 1688); çıktıda "Yatağını topla" satırının yeri yazılır, `yap_m.py` `NZ['uzman']['cikma']`.
