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
| `yap_m.py` + `e-metin.json` + `m/` | **Moyo Ebeveyn sayfası (14 Kasım 2026)** → `ebeveyn.html`: Moyo Mercek sitesinin düzeni ve akışı (açılış, "Neden" Akış, sekmeli "Nasıl çalışır", güvenlik, ekosistem, fiyat, SSS); Moyo'nun gerçek ekranları (örnek veri). `m/site.css` ve `m/site.js` clinic-app `site/assets`'ın kopyası, `m/moyo.css` yalnız bu sayfaya özel. |
| `beyaz.css` | Çatı sayfanın beyaz zemin teması (14 Kasım 2026) ve okunurluk düzeltmeleri. |
| `disa_aktar.py` | Canlıya: `python3 disa_aktar.py <parent-app>/site/moyo` → `index.html` (çatı), `ebeveyn/index.html`, `c/…`. parent-app `site/build-cf.sh site` bunu `dist-site`'a kopyalar (Worker `moyo-site`). |
| `kompakt.js` | Telefon ve iPad (≤ 1024 px ya da dokunmatik) "Nasıl çalışır": Sekmeler · Kartlar · Liste; varsayılan telefonda Sekmeler, iPad'de Liste (önizlemede seçici, seçim tarayıcıda) |
| `ikon/oyun-*.webp` | Moyo Oyun ikonu, sağ altta küçük Moyo logosu: A rozet · B beyaz etiket · C koyu köşe · D yalın; üreteç `../logo/oyun_rozet.js` (oyunun 1024 ikonu game-app `Assets/_Pofi/Art/AppIcon.png`, salt okunur) |
| `hikaye.js` | Kaydırdıkça dönen anlatım (masaüstünde yapışkan sahne); `data-mobil="liste"` ise telefonda alt alta + bir kez dönerek giriş |
| `dongu.js` | "Hepsi birlikte": masaüstünde 6 adımlık dönen halka, telefonda yana kaydırılan kartlar + İleri/Geri; alt başlık seçici |
| `arastirma.md` | Ebeveyn metinleri için benchmark (12 ürün) ve nöropazarlama ilkeleri, kaynaklı; C'nin metinleri buradan |
| `img/c-*.webp` | Gerçek ekranlar, örnek veri: Moyo Ebeveyn (ilerleme, onay, uzmandan görevler), Moyo Oyun ("Ailen bakıyor" kartı, günün rutinleri), Moyo Mercek (haftalık rutin tablosu, ebeveyn eğitimi) |
| `img/ikon-*.svg` | Uygulama ikonları (Moyo koyu/yeşil, Moyo Mercek açık/lacivert); üreteç `../logo/ikon.py` |
| `cekim/` | Ekran çekim betikleri (yollar ilk oturumun geçici klasörüne göre; uyarlayarak kullan) |

Derleme ve yerel kontrol:

```bash
cd tools/cati-sayfa && python3 yap.py && python3 yap_c.py && python3 yap_m.py
```

Ekran kaynakları:
- **Moyo Ebeveyn:** parent-app `preview/build.sh` (çalışma klasörü `PARENTAPP_PREVIEW_WORK`) → `preview/out/app.html`; mağaza çekim düzeni `store/capture/` (`prep.js`). `cekim/odak.js` onay ve ilerleme ekranlarını öğe konumlarına göre kırpar, `cekim/ben.js` "Görevlerin" bölümünü çeker.
- **Moyo Oyun:** game-app `webgl-preview` dalındaki WebGL derlemesi, yerel sunucu + Playwright (`--use-angle=swiftshader --enable-unsafe-swiftshader`). Deneme kodu A1A1A1, pet Okti. `tools/preview/pack.sh` güncel değil: dal veri dosyasını `.part00/.part01` diye bölüyor, parçalar elle birleştirildi. Oyun yalnız yatay açılıyor; "Yaptım"dan sonra ayrı onay penceresi yok, kart "Ailen bakıyor" olur. Deneme arka ucunda çıkan "Ebeveyn (deneme)" düğmesi görüntüden silindi.
- **Moyo Mercek:** `bash preview/build.sh` → `preview/out/clinic.html`; `tools/landing-motion/kit.js` `open()` ile veri hazır açılır; 640 px genişlikte, imleç gizli (`#__lm-cursor`) çekim (`cekim/cek.js`, `cekim/egitim.js`).

Kurallar: `ortak/hukuk/45` (sağlık ve sonuç iddiası yok, belgesiz rakam yok, "ücretsiz"in yanında fiyat + dönem + yenilenme),
kopyalama yasağı 12 Kasım'da kalktı ama rakip rakamları, yorumları ve bizde olmayan hizmetler kullanılmaz (ortak CLAUDE.md kural 7).
Görsel inceleme alt ajanda (kural 8).

## 17 Kasım 2026 sürümü (kullanıcı isteği; önizlemede, canlıya alınmadı)

- **Çatı sayfa (`yap_c.py` → `c.html`, stil katmanı `v4.css`):** yeni açılış metni (`c-metin.json` `h1`, `alt_etiket`, `alt`, `ince`), hemen altında Moyo Ekosistemi
  (`eko.js`: ortadaki ekran net; yandakiler bulanık, küçülmüş, geride; aralık görsellerin gerçek genişliğinden), hap biçiminde adım sayaçları
  (`.sayac`: etkin adım yeşil dolu, geçilen adımın numarası yeşil; Atlassian'ın sekme çubuğu örnek), üst menüde yalnız üç başlık
  (Güvenlik ve Sorular alt bilgide), açık zeminli kutuda sütunlu alt bilgi (`.altb`), dar ekranda menü düğmesi (`menu.js`).
- **Ürün adı kilitleri:** `inline-moyo-ebeveyn.svg`, `-oyun.svg`, `-uzman.svg` (`tools/logo/gen.py` üretir; Mercek logosuyla aynı kural: kalın "moyo" + ince ad).
  Aileye dönük sayfalarda uzman ürününün adı **Moyo Uzman**; "Moyo Mercek" yalnız uzman platformunda (kullanıcı kararı 17 Kasım 2026).
- **Gerçek ekranlar:** `img/moyo-*.webp` (Moyo Ebeveyn, 600×1298), `img/mercek-*.webp` (Mercek paneli 1440×900, `-tel` telefon); çekim betikleri `cek/` (README orada).
- **Moyo Ebeveyn sayfası (`yap_m.py`):** üstte kilit logo "moyo Ebeveyn", açılış iki sütun (solda başlık, sağda oyun + onay telefonu; telefon oyun
  ekranının sağ panelini örter), açılıştan sonra Nasıl çalışır, ardından Neden Moyo.
- **Düzen ayarı (`duzen/`):** çatı sayfanın yazı ve görsellerini sürükleyerek aralarını açma aracı. `python3 yap_c.py && (cd duzen && python3 yap_duzen.py)`;
  Artifact'in ana sayfası `duzen/duzen.html`, dosya eşlemesi `duzen/dosyalar.json`, yetenek `db` + `user`. Kullanıcının ayarı Artifact veritabanında
  `duzen/cati-masa`, `cati-tablet`, `cati-tel` belgelerinde (öğe başına `ust_bosluk`, `yatay`, `dikey` piksel); buradan okunup `v4.css`'e işlenir.
  Önizleme: https://claude.ai/artifact/2MWBbCkhaTyY7RaGDdJx3N
- **Önizleme kabuğu `host.html`** sadeleşti: iki sekme (Moyo Ekosistem · Moyo Ebeveyn) + Masaüstü / Tablet / Telefon. Eski sekmeler (analiz, A, B, benchmark) depoda duruyor (`a.html`, `b.html`, `arastirma.md`).
- **Canlıya:** `disa_aktar.py` yeni dosyaları (`v4.css`, `eko.js`, `menu.js`) ve yeni alt bilgiyi taşır; çalıştırmak ve parent-app'e göndermek kullanıcı onayıyla.
