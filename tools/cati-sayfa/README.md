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

**Düzen aracı kaydı işlendi (18 Kasım 2026):** kullanıcının geniş ekran ayarı (`duzen/cati-masa`, 17 Kasım 21:31 UTC: giriş bandı başlık +16, metin +16, basamaklar +8; "Nasıl çalışır" +4 px) `v4.css` sonundaki `@media (min-width: 1025px)` bloğuna yazıldı; veritabanı kaydı boşaltıldı (işlenen değerler `islenen` alanında), araç yeni düzenden sıfırdan başlar. Tablet ve telefon için kayıt yoktu. Yeni kayıt gelince aynı yol: taban değer + fark → `v4.css`, iki önizlemeye `v4.css` yayınlanır, kayıt boşaltılır.

## 18–19 Kasım 2026 turu (kullanıcı geri bildirimi, üç sayfa; önizlemede, canlıya alınmadı)

Seçenekler ve önerilerin gerekçesi: belge https://claude.ai/artifact/U6z9HW9Zv8qfGnJBwG91SX.

- **Önizleme seçici sözleşmesi `oniz.js`:** sayfa `<head>`'de `#oniz-gruplar` JSON'u (grup anahtarı, ad, hedef, öneri, seçenekler) taşır;
  alternatif parçalar `data-var="<grup>:<değer>"`, seçili değer `<html data-v-<grup>>`. Kabuk `host.html` "Alternatifler" panelinden seçtirir,
  "Seçimlerimi kopyala" özet verir (seçim tarayıcıda `moyo.oniz.v1`). Canlıya bu parçalar gitmez: `disa_aktar.py` seçileni bırakır
  (varsayılan öneri; başka seçim `secim.json`: `{"c.html": {"dongu6": "b"}}`), öbürlerini siler.
- **Çatı sayfa:** yeni katman `c-18.css` + `c-18.js` (1-2-3 tasarımları, kaydırma), `c-sema.py` (6. adımın döngü çizimleri), 11 grup
  (`alt`, `sahne`, `dongu6`, `kapanis`, `gbas`, `gmet`, `uc`, `b1`, `b2`, `nk`, `urun`). 1–6 sahnesi ve telefon/tablet "Nasıl çalışır"
  parmakla kaydırılır. Güven bölümü kalktı, alt bilgide Kurumsal sütunu.
- **Moyo Ebeveyn:** `m/moyo.js` (oyun ↔ uygulama animasyonu, adımların kaydırılması), fiyat sayfası `yap_f.py` + `f-metin.json` → `ebeveyn-fiyat.html`.
- **Kurumsal sayfalar:** `yap_k.py` + `k-metin.json` + `k.css` → `hakkimizda.html` (doğrulanmış literatür: kaynak özeti tur klasöründe,
  yalnız "Doğrulandı" kaynaklar), `guven.html`. Üst ve alt bilgiyi `c.html`'den alır: çatı sayfa değişince `python3 yap_k.py`.
  `k-sitemap.xml` / `k-robots.txt` canlıda `/sitemap.xml` / `/robots.txt`.
- **Canlı yollar:** `/`, `/ebeveyn/`, `/ebeveyn/fiyat/`, `/hakkimizda/`, `/guven/` (`disa_aktar.py` `SAYFA`, `YOL`). Site Cloudflare Access
  kilidinin arkasında olduğu için arama motorları kilit kalkana kadar okuyamaz.

**İkinci bağımsız QA düzeltmeleri (19 Kasım 2026, önizlemede):** çatı sayfa 2. kart ekranı `img/c-baglan.webp` (Moyo Ebeveyn "Uzman bağla"
onay ekranı: uzman, paylaşılacak çocuk, Uzmanla bağlan; `cek/moyo.json` `c-baglan`, `invite` seçeneği), 3. kart `img/c-davranis.webp`
(`mercek-davranis.webp`'ten temiz sınırda kırpım, kartta bütünüyle görünür); 1. kartın cümlesi de "fiil" grubunu izler (`c-metin.json`
`parca.fiil1`, `_grup`); 1–6 kartları tablette ve geniş ekranda büyük (`c-18.css` 8, ≥ 1025 px'te Moyo Uzman'ın masaüstü ekranı ve 6. adımın
geniş çizimi `.d-gen`); yörüngedeki nokta `transform` ile döner (harf kırıntısı kalmaz), dar çizimlerde yazılar 390 px'te ≥ 12 px, üç ok görünür.
Moyo Ebeveyn: sekme çubuğu tam / kısa düzen (`m/moyo.js` ölçer), 2. adımın yatay görseli, yeni `h1` grubu (a özel başlık, b çatıyla aynı;
alt bilgideki slogan seçilen başlık, fiyat sayfasında da; `disa_aktar.py` fiyat sayfasına ebeveyn.html'nin seçimini geçirir).

**Tur 3–6 (19 Kasım 2026, kullanıcının seçimleri; önizlemede):** seçilen her seçenek kalıcı oldu, gruplar silindi; **hiçbir sayfada seçenek
kalmadı** (`#oniz-gruplar` / `oniz.js` yalnız gerektiğinde geri eklenir; sözleşme aynı, kabuktaki seçim anahtarı `moyo.oniz.v2`, geçersiz eski
seçimleri yok sayar). Çatı: 6. adım yörünge (`c-sema.py` yalnız bu çizim), ayrı ürün bölümü yok, ekranlar 1-2-3 kartlarının içinde.
Moyo Ebeveyn: "Neden Moyo" üç tam ekran telefon + telefondan taşan büyütülmüş satır kartı (ince lacivert çizgi, yeşil yok; görseller
`img/e-nz-plan|not|uzman.webp`, 780 × 1688), beş adımda "Zorlandığı anı kaydedin" (`img/e-davranis.webp`); fiyat sayfası yer tutucu
349 TL / ay (20 Kasım 2026'dan beri kesin fiyat: 349,99 TL / ay, altında "ya da 3.499,99 TL / yıl · 2 ay ücretsiz"; `yap_f.py` fiyatları denetler). Hakkımızda (Atlassian 'Company' kaydı örneğiyle beş bölüm): misyon + gerçek ekranlar, lacivert bantta üç kartlı döngü (çizgiler
görününce çizilir) + yöntem uyarısı + kaynaklar, Neden varız (hafıza / kayıt hafta çizgisi), ekip ve hikâye yer tutucusu (ONIZ, canlıya
gitmez), iletişim kartları.

## 22 Kasım 2026: döngü aileyle başlar, Moyo Ebeveyn tutarlılığı (kullanıcı kararları)

- **Döngü "Aileyle başlasın":** 1 Siz planlarsınız (`img/moyo-ekle.webp`) → 2 Çocuğunuz yapar → 3 Siz onaylarsınız → 4–5 Uzmanınız
  (etiketi "isteğe bağlı") görür ve önerir → 6 Sürer. `c-metin.json` `dongu`, aria metni (`dongu[5].alt`), başlık "Bugünün kaydı, yarının rutini".
  6. adımın yörüngesi (`c-sema.py`): Moyo Ebeveyn üstte, saat yönünde Moyo Oyun ve Moyo Uzman; uzman kartı ve ona giden / ondan dönen
  yay kesikli, kartın altında "isteğe bağlı" (`sema.kart.uzman[2]`).
- **Telefona özel kırpım denendi, kalktı** (kullanıcı 22 Kasım 2026: "açık değil"; yerine mevcut görseller): telefonda kartlar yine canlıdaki
  gibi Moyo Ebeveyn ve Moyo Uzman'ın telefon ekranlarını gösterir.
- **Moyo Ebeveyn sayfaları:** "Giriş" → "Giriş yap" (`yap_m.py`, `yap_f.py`); SSS işareti "+" / "–" ve dar ekranda açılır menü paneli
  (tam ekran değil; dışına dokununca ya da kaydırınca kapanır) çatı / Hakkımızda / Güven ile aynı (`m/moyo.css`, `m/moyo.js`;
  `m/site.css` Mercek'in kopyası olduğu için dokunulmadı).

## 24 Kasım 2026: eğitimsiz görseller (ortak `akislar.md` 27.4, kullanıcı kararı 23 Kasım 2026)

Metinler 26c208f'de eğitimsiz yazıldı; görseller bu turda: çatı 5. kart ve Moyo Ebeveyn 5. adım `img/moyo-uzman-oneri(-m).webp` (IMG anahtarı
`ebeveyn-oneri`: Uzmanım, randevu + seans ücreti + rutin önerisi), çatı "mercek-veri" kartı `img/mercek-rutin*.webp` (menü Planla / Takip),
`img/c-davranis.webp`, Hakkımızda `img/k-ebeveyn.webp` (davranış kaydı ekranı) ve `img/k-uzman(-dar).webp`, Moyo Ebeveyn "Neden Moyo"
`img/e-nz-uzman.webp`, `img/moyo-gelisim(-m).webp` (Gelişim'de "Ben" yok). Hakkımızda'da artık anılmayan iki kaynak (Furlong2012,
Thongseiratch2020) `k-metin.json`'dan çıktı (`yap_k.py` anılmayan kaynağı reddeder). Ayrıntı `cek/README.md` sonu. Canlıya alma kullanıcı onayıyla.
