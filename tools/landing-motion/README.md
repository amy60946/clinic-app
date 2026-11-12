# Tanıtım sayfası için ekran kayıtları (landing-motion)

Uzman panelinin önizleme derlemesinden (`preview/out/clinic.html`, uydurma veri) "biri kullanıyormuş gibi" kısa, sakin,
sessiz ve döngüye uygun klipler üretir: imleç yumuşakça kayar, bekler, basar, yazar. Kaynak koda dokunmaz.

## Çalıştırma

```bash
bash preview/build.sh                      # önizleme derlemesi yoksa
node tools/landing-motion/record.js hero   # tek sahne: hero · kutuphane · aile · davranis · rapor · pano
node tools/landing-motion/record.js all    # altı masaüstü sahnesi
node tools/landing-motion/record.js mobile # telefon sahneleri: hero-m · davranis-m · rapor-m
```

Çıktı `out/<sahne>.mp4` (H.264, 30 kare/sn, sessiz), `.webm` (VP9; mp4'ten büyük çıkarsa yazılmaz), `.webp` (afiş karesi) ve
`out/manifest.json` (süre, boyut, adımların saniyeleri). Ara kareler işletim sisteminin geçici klasöründe
(`MOTION_TMP=` ile değişir).

Ortam değişkenleri: `SHOT_TIME` ("şimdi"; varsayılan `2026-11-09T09:40:00+03:00`, pazartesi sabahı: veri her çekimde aynı),
`SHOT_URL` (başka derleme), `MOTION_DEBUG=1` (adım zamanları ve kare gecikmeleri), `MOTION_FORMAT=jpeg` (kareler PNG yerine JPEG).

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
- **Veri:** hepsi uydurma (Elif Örnek, Nazlı, Ege, Defne, Kerem; pano için Duru, Poyraz). Takip Planı kapalı
  (`care_plan` yok); davranış hedefi ve GAS kaydı çekim verisinden çıkarılır, raporda GAS bölümü görünmez.
- **Ad:** ekranda "ClinicApp" geçen yerler çekim sırasında "Moyo Mercek" olur (`kit.js` `open`). "ParentApp" olduğu gibi
  kalır (ilerleme notunda geçer); aile uygulamasının adı belli olunca aynı yere bir satır eklenir.

## Sahneyi değiştirmek

`scenes/` altındaki dosyada adımlar sırayla yazılıdır: `h.click(hedef, { beat, after })`, `h.type('…')`,
`h.scroll(piksel)`, `h.hover(hedef)`. Hedef tam metin, RegExp ya da Playwright locator olur; üstte ve görünür olan seçilir.
Çekimden sonra kareleri gözle kontrol et: `ffmpeg -i out/<sahne>.mp4 -vf fps=4/3 kare-%03d.png`.
