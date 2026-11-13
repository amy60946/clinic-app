# moyoapp.com.tr çatı sayfa ve Moyo tanıtım sayfası: önizleme kaynağı

Kullanıcı istekleri 12–13 Kasım 2026. Önizleme: https://claude.ai/artifact/B9PZ8eV64Yg6AqaWnJFTFV (aynı adrese
`host.html` sayfa, öteki dosyalar `files` ile yayınlanır; başka pencereden yayınlarken önce `read`, sonra `url` ile).
Henüz hiçbir siteye girmedi; karar kullanıcıda. Moyo tanıtım sayfası ve çatı sayfa 13 Kasım'da bu pencereye geçti
(kullanıcı kararı; ortak `DURUM.md`).

| Dosya | Ne |
|---|---|
| `host.html` | Önizleme kabuğu: sekmeler Analiz ve öneri · A · B · C · Metinler · Logo ve ikon · Benchmark; A/B/C iframe'de, Masaüstü/Telefon düğmesi |
| `yap.py` | A (ebeveyn sayfası) ve B (tek sayfa, iki kitle) → `a.html`, `b.html` (`ortak.css`, `hikaye.js`) |
| `yap_c.py` + `c-metin.json` | **C (çatı sayfa, üçüncü sürüm)** → `c.html` (`ortak.css` + `c.css`, `hikaye.js` + `dongu.js`). Metinler yalnız `c-metin.json`'da |
| `hikaye.js` | Kaydırdıkça dönen anlatım (masaüstünde yapışkan sahne); `data-mobil="liste"` ise telefonda alt alta + bir kez dönerek giriş |
| `dongu.js` | "Hepsi birlikte": masaüstünde 6 adımlık dönen halka, telefonda yana kaydırılan kartlar + İleri/Geri; alt başlık seçici |
| `arastirma.md` | Ebeveyn metinleri için benchmark (12 ürün) ve nöropazarlama ilkeleri, kaynaklı; C'nin metinleri buradan |
| `img/c-*.webp` | Gerçek ekranlar, örnek veri: Moyo Ebeveyn (ilerleme, onay, uzmandan görevler), Moyo Oyun ("Ailen bakıyor" kartı, günün rutinleri), Moyo Mercek (haftalık rutin tablosu, ebeveyn eğitimi) |
| `img/ikon-*.svg` | Uygulama ikonları (Moyo koyu/yeşil, Moyo Mercek açık/lacivert); üreteç `../logo/ikon.py` |
| `cekim/` | Ekran çekim betikleri (yollar ilk oturumun geçici klasörüne göre; uyarlayarak kullan) |

Derleme ve yerel kontrol:

```bash
cd tools/cati-sayfa && python3 yap.py && python3 yap_c.py
```

Ekran kaynakları:
- **Moyo Ebeveyn:** parent-app `preview/build.sh` (çalışma klasörü `PARENTAPP_PREVIEW_WORK`) → `preview/out/app.html`; mağaza çekim düzeni `store/capture/` (`prep.js`). `cekim/odak.js` onay ve ilerleme ekranlarını öğe konumlarına göre kırpar, `cekim/ben.js` "Görevlerin" bölümünü çeker.
- **Moyo Oyun:** game-app `webgl-preview` dalındaki WebGL derlemesi, yerel sunucu + Playwright (`--use-angle=swiftshader --enable-unsafe-swiftshader`). Deneme kodu A1A1A1, pet Okti. `tools/preview/pack.sh` güncel değil: dal veri dosyasını `.part00/.part01` diye bölüyor, parçalar elle birleştirildi. Oyun yalnız yatay açılıyor; "Yaptım"dan sonra ayrı onay penceresi yok, kart "Ailen bakıyor" olur. Deneme arka ucunda çıkan "Ebeveyn (deneme)" düğmesi görüntüden silindi.
- **Moyo Mercek:** `bash preview/build.sh` → `preview/out/clinic.html`; `tools/landing-motion/kit.js` `open()` ile veri hazır açılır; 640 px genişlikte, imleç gizli (`#__lm-cursor`) çekim (`cekim/cek.js`, `cekim/egitim.js`).

Kurallar: `ortak/hukuk/45` (sağlık ve sonuç iddiası yok, belgesiz rakam yok, "ücretsiz"in yanında fiyat + dönem + yenilenme),
kopyalama yasağı 12 Kasım'da kalktı ama rakip rakamları, yorumları ve bizde olmayan hizmetler kullanılmaz (ortak CLAUDE.md kural 7).
Görsel inceleme alt ajanda (kural 8).
