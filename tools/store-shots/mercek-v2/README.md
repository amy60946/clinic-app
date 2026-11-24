# Moyo Mercek mağaza seti, eğitimsiz (24 Kasım 2026)

Ebeveyn eğitimi kapalıyken (bayrak `parent_training` tanımsız) çekilen 8 karelik App Store seti; iPhone 6,3" (1206 × 2622) ve iPad 13" (2064 × 2752).
Son hâli "App Store Görselleri" sayfasında: https://claude.ai/artifact/TZSKSduPVVHwYeSCMtfcMi (`mercek/iphone_01–08.jpg`, `mercek/ipad_01–08.jpg`).

Sıra: 1 Bütün danışanlar · 2 Ev Rutinleri › Haftalık · 3 Davranışlar ve Olaylar · 4 Yeni hedef davranış · 5 Takvim › seans hazırlığı ·
6 Rapor ve aileye gönderme · 7 Aileyi davet et · 8 Ayarlar › Ekip. Örnek aile "Deniz" (deneme verisinde Nazlı'nın adı değiştirilir), veriler uydurma.

```bash
bash preview/build.sh                                  # preview/out/clinic.html
cp preview/out/clinic.html tools/store-shots/mercek-v2/out/clinic.html   # ya da SHOT_URL=file://…/clinic.html
node tools/store-shots/mercek-v2/run.js phone <klasör>/iphone [01 …]     # 390 × 844 ×3, telefon düzeni
node tools/store-shots/mercek-v2/run.js ipad  <klasör>/ipad  [01 …]      # 900 × 1000 ×1,5, sol menülü düzen
node tools/store-shots/mercek-v2/render.js             # başlıklı panorama → slice.py → kareler
```

- `run.js` çekimden sonra ekrandaki metni denetler (eğitim, modül, Kütüphane, Kaynak, Nazlı, macera, ClinicApp, hata metni yok) ve kenarda,
  yüzen alt menünün kenarında kesilen yazı olup olmadığına bakar (`fits.js`, `framefit.js`). Kaydırma değerleri deneme verisine bağlıdır; veri
  değişince `D01`… ortam değişkenleriyle yeniden ayarlanır.
- `render.js` yolları çalışma klasörüne göredir (`FONTS`, `SHOTS`): başka yerde çalıştırırken düzelt. Yazı tipi Poppins (Moyo mağaza setiyle aynı).
- Çekim sırasında deneme verisine yapılanlar: Deniz'in klinik etiketi boş, bildirimler okunmuş, "Gönderilen raporlar" için beş eski rapor.
- Alt menü gizlenmez; açılan pencereler uygulamanın çizdiği gibi çekilir (ekleme stil yok). Görseller alt ajanda gözle kontrol edilir.
