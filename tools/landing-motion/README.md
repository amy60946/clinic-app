# Tanıtım sayfası için ekran kayıtları (landing-motion)

Uzman panelinin önizleme derlemesinden (`preview/out/clinic.html`, uydurma veri) "biri kullanıyormuş gibi" kısa, sakin,
sessiz ve döngüye uygun klipler üretir: imleç yumuşakça kayar, bekler, basar, yazar. Kaynak koda dokunmaz.

## Çalıştırma

```bash
bash preview/build.sh                      # önizleme derlemesi yoksa
node tools/landing-motion/record.js akis   # tek sahne: akis · rutin · davranis · seans · rapor · pano
node tools/landing-motion/record.js all    # bütün masaüstü sahneleri
MOTION_DEVICE=dikey node tools/landing-motion/record.js akis   # telefonda gösterilen dikey sürüm (<sahne>-d)
```

Çıktı `out/<sahne>.mp4` (H.264, 30 kare/sn, sessiz), `.webm` (VP9; mp4'ten büyük çıkarsa yazılmaz), `.webp` (afiş karesi) ve
`out/manifest.json` (süre, boyut, adımların saniyeleri). Ara kareler işletim sisteminin geçici klasöründe
(`MOTION_TMP=` ile değişir).

Ortam değişkenleri: `SHOT_TIME` ("şimdi"; varsayılan `2026-11-09T09:40:00+03:00`, pazartesi sabahı: veri her çekimde aynı),
`SHOT_URL` (başka derleme), `MOTION_DEBUG=1` (adım zamanları ve kare gecikmeleri), `MOTION_FORMAT=jpeg` (kareler PNG yerine JPEG), `MOTION_WEBM=0` (webm üretilmez; VP9 uzun sürer, site webm'i yalnız mp4'ten küçükse kullanır), `MOTION_TRIES` (deneme sayısı, varsayılan 4).

## Nasıl çalışır

| Dosya | İş |
|---|---|
| `kit.js` | Tarayıcıyı açar (1440×900, ×2; telefon 393×800, ×3), veriyi hazırlar, `Human` (imleç, tıklama, yazma, kaydırma), `Recorder` (CDP ekran kaydı), video üretimi |
| `inject.js` | Sayfaya eklenenler: imleç (ok / dokunma noktası) ve basma halkası, "ClinicApp" → "Moyo Mercek", saat kaydırma |
| `data.js` | `../store-shots/editdb.js` verisinin üstüne çekime özel eklemeler; bir kez gösterilen ipuçlarını kapatan anahtarlar |
| `scenes/<ad>.js` | Sahne: `prepare` (kayıt dışı hazırlık) + `run` (kaydedilen adımlar, `beat` = manifest satırı) |
| `record.js` | Sahneyi çeker, kodlar, `manifest.json`'ı günceller |

- **Kayıt:** `Page.startScreencast` (kayıpsız PNG, her kare zaman damgasıyla). Sayfa 2 kat çözünürlükte çizilir, kareler
  1440×900'e indirilmiş gelir. Kareler 30 kare/sn'lik sabit diziye çevrilir, sonuna 1,2 sn bekleme eklenir.
- **Akıcılık:** imleç ve kaydırma adımları 30 Hz ızgaraya kilitlidir (her video karesi tam bir adım). Bir adım kendi
  karesini kaçırırsa (takılma) sahne kendiliğinden yeniden çekilir; satır sonundaki "kaçan hareket adımı 0/n" bunu gösterir.
- **Tempo:** hareket 650–1100 ms (eğri, yavaş başlar yavaş biter), basmadan önce 350–600 ms, her değişiklikten sonra
  900–1500 ms, yazı harf başına 60–90 ms.
- **Saat:** `Date` yalnız kaydırılır (donmaz), geçişler gerçek hızında oynar.
- **Veri:** hepsi uydurma (Elif Örnek, Nazlı, Ege, Defne, Kerem; pano için Duru, Poyraz). Takip Planı ve ebeveyn eğitimi kapalı
  (`care_plan`, `parent_training` yok); davranış hedefi ve GAS kaydı çekim verisinden çıkarılır, raporda GAS bölümü görünmez.
  Takvimde dolu bir hafta (Ege, Defne, Duru, Kerem, Poyraz, Nazlı) ve seans ücreti (1.200 / 1.500 TL; `data.js`).
- **Ad:** ekranda "ClinicApp" geçen yerler çekim sırasında "Moyo Mercek", "ParentApp" geçenler "Moyo" olur (`kit.js` `open`;
  uygulamanın kendisi henüz değişmedi).

## Sahneyi değiştirmek

`scenes/` altındaki dosyada adımlar sırayla yazılıdır: `h.click(hedef, { beat, after })`, `h.type('…')`,
`h.scroll(piksel)`, `h.hover(hedef)`, `h.zoom(hedef, ölçek)` / `h.unzoom()` (kamera: uygulamanın kökü hedefin çevresinde yavaşça
büyür, imleç ölçeklenmez; Atlassian ana sayfasındaki ürün turu gibi, 14 Kasım 2026; kök dışında açılan pencereleri büyütmez).
**`akis`** (ana sayfa açılışı; 24 Kasım 2026'da eğitimsiz): çocuğun haftalık ev rutinlerini görür → davranış kayıtlarına bakar →
raporu açıp aileye gönderir; `beat`'ler sayfadaki 1-2-3 çipinin saniyeleri. Öteki sahneler "Platform Nasıl Çalışır?" sekmeleri:
`rutin` (aileye rutin önerisi, adımın gün gün geçmişi), `davranis`, `seans` (takvim, seans hazırlığı, ücret), `rapor` (aileye gönder).
Uzun sahnede kayıt + kodlama 10 dakikayı aşabilir: arka planda çalıştır, `MOTION_FORMAT=jpeg` ile kareler küçük. Hedef tam metin, RegExp ya da Playwright locator olur; üstte ve görünür olan seçilir.
Çekimden sonra kareleri gözle kontrol et: `ffmpeg -i out/<sahne>.mp4 -vf fps=4/3 kare-%03d.png`.

## Moyo Ebeveyn kaydı ve telefon sürümleri (22 Kasım 2026)

Kullanıcı kararları (Mercek denetimi, 22 Kasım 2026): 3. sekme "Moyo Ebeveyn · ebeveynin telefonunda" **gerçek Moyo Ebeveyn ekranı**
gösterir. Telefonda okunmayan masaüstü kayıtları için önce parça kırpımları denendi; kullanıcı "açık değil" dedi, yerine **aynı sahnenin
dikey masaüstü çerçevesinde kaydı** geldi ("mevcut yapıyı koruyarak yazıyı büyüt", Atlassian'ın telefondaki ürün videosu örnek).

```bash
(cd ../parent-app && bash preview/build.sh)               # Moyo Ebeveyn (ParentApp) önizlemesi
node tools/landing-motion/ebeveyn.js                      # out/aile-m.* (telefon 786×1600) + out/aile.* (1440×900 zeminde)
MOTION_DEVICE=dikey MOTION_FORMAT=jpeg node tools/landing-motion/record.js akis rutin davranis seans rapor   # out/<sahne>-d.*
```

- `ebeveyn.js`: parent-app `store/capture/prep.js`'in uydurma ailesiyle (24 Kasım 2026, eğitimsiz) "Bugün → Uzmanından 3 adım önerisi →
  Uzmanım (randevu, seans ücreti) → Hepsini ekle → Bugün → onay bekleyen adım → Adımı incele → Onayla"; en az kaçan adımlı deneme saklanır. Telefon 393×800, 2 kat; kit'in telefon ölçeği kullanılmaz
  (o ölçekte dokunma koordinatları sayfaya yarı değerle ulaşıyordu). Dokunma noktası yalnız dokunurken görünür. Geniş sürüm aynı kayıt,
  `ebeveyn_zemin.py`'nin açık lavanta zemininde ortada. `EBEVEYN_YALNIZ_GENIS=1` yalnız geniş sürümü yeniden üretir.
- **Dikey çerçeve** (`kit.js` `dikey`: 900 × 1000, ×1,5; `MOTION_DEVICE=dikey`, çıktı `<sahne>-d`): aynı masaüstü düzeni (sol menü 900 pikselden
  itibaren), telefonda (~350 px) yazı 1440'lık kayda göre ~1,6 kat büyük. Sahnelerdeki sabit dinlenme noktaları `h.fit` ile orana çevrilir;
  olay tablosu bu genişlikte sol menüyle sığmadığı için `davranis` ve `akis` dikeyde menüyü uygulamanın ☰ düğmesiyle kapatır; `akis`'te kamera
  üst kenara sabit, afiş haftalık rutin tablosu. Sitede ≤ 700 px'te `data-clip-m="<sahne>-d"` ile oynar (`site.css` "Telefon sürümü");
  açılış turunun telefon saniyeleri `data-t-m`.
- Denemeler: `record.js` en az kaçan adımlı denemeyi saklar; %2'ye kadar kaçan adım kabul. Sayfanın sonuna gelmiş kaydırma (sayfa kaymaz)
  "kaçan adım" sayılır ama görünmez.
- `kare.js`: sahneyi kayıttaki gibi oynatır, her tıklama / yakınlaşma / kaydırmadan sonra imleçsiz ekran görüntüsü alır (`kareler.json`).
- Sonra `out/aile*.{mp4,webm,webp}` ve `out/*-d.{mp4,webm,webp}` → `site/assets/motion/` (webm yalnız mp4'ten küçükse; `site.js` `WEBM`).

## 24 Kasım 2026: eğitimsiz kayıtlar

- `akis`, `rutin`, `seans`, `rapor`, `davranis` (masaüstü ve `-d`) ve `ebeveyn.js` (`aile`, `aile-m`) yeni önizlemelerden kaydedildi, `MOTION_WEBM=0`
  (yalnız `aile.webm`, mp4'ten küçük olduğu için; `site.js` `WEBM`). Makinede başka bir çekim işi çalışırken kaydedildi: kaçan hareket adımı
  %8–20 (imleç yer yer bir kare takılır); boş makinede `node record.js <sahne>` ile yeniden çekilebilir.
- Açılış turu saniyeleri (`index.html` `data-t` / `data-t-m`) saklanan denemenin ekran değişimlerinden ölçüldü: masaüstü 0 · 10,1 · 22,5;
  dikey 0 · 11 · 26,6. `record.js` artık saklanan denemenin manifest satırını yazar.
- `davranis.webp` afişi kaydın 8,4. saniyesinden (açılmış olay tablosu): yük altında `poster` anı tablo açılmadan düştü.
- `ebeveyn.js`: "İlk onayın tamam!" kutlaması kayıtta gösterilmez (`first-approval-seen`); o pencerede eski oyun adı ve "coin" yazıyor (Moyo uygulaması, ayrı iş).

## 24 Kasım 2026 (ikinci tur): açılış turu dört adım, imleç kayıttan sonra çizilir

- Kullanıcı: "ekran yukarıdan kesik geliyor, bütün ekran görünmüyor". Kırpılma `akis`'in kamera yakınlaşmasından (`zoom`, sağ üst köşeye
  sabit, ölçek 1,3: üst kenar ve sol menü kadraj dışına çıkıyordu) ve olay tablosuna sayfa kaydırmasından geliyordu; `.clip` kutusu (16:10,
  `object-fit: cover`) ve telefon sürümü (9:10) kaydın oranıyla aynı, kırpmıyor. `akis` artık yakınlaştırmaz ve kaydırmaz; dört adım:
  ev rutinleri → davranış kayıtları → "+ Hedef davranış ekle" (ad, strateji, "Ebeveyn davranış kaydı" açık, Kaydet) → raporu aileye gönder.
  Sitedeki çipler 0 · 8,6 · 20,9 · 40,4 (telefonda 0 · 8,5 · 22,6 · 40,9).
- **`MOTION_IMLEC=sonra`**: kayıtta sayfadaki imleç gizlenir; `kit.js` her video karesinin imleç yerini ve basma anını planlanan zamanla
  `imlec.json`'a yazar, `imlec.py` kareleri imleç (sayfadaki SVG okun kendisi, `record.js` `imlecGorseli`) ve basma halkasıyla yeniden yazar.
  Makinede başka yük varken de imleç akıcı kayar (önceki kayıtlarda hareket adımlarının %8–20'si kaçıyordu). Bu kipte "kaçan hareket adımı"
  sayısı anlamını yitirir (imleç kare üretmez), `MOTION_TRIES=1` yeter. 24 Kasım kayıtları (`akis`, `rutin`, `davranis`, `seans`, `rapor`, `-d`)
  bu kiple.
