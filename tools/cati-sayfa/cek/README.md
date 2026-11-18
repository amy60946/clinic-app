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
- Betik ekranda "macera" görürse uyarır; "Rutin ekle"deki "…oyunda çocuğunuz için bir macera olur" cümlesi beklenen bilgidir.
