# Mağaza ekran görüntüleri (App Store)

Önizlemenin deneme verisinden iPad 13" (2752×2064, yatay) ve iPhone 6.9" (1320×2868, dikey) görüntüleri üretir. Uygulama kodu değişmez: deneme verisi tarayıcı deposunda betikle düzenlenir (`editdb.js`), iOS yazıları geçici bir kopyada açılır (`native-build.sh`). Son set ve sıra: "ClinicApp mağaza paketi" belgesi (https://claude.ai/artifact/QMAZxWZ4VwASBpu6PZAY3s).

Bu klasörde, sırayla (Playwright + Chromium kurulu olmalı; Python'da Pillow):

```bash
bash native-build.sh ipad && bash native-build.sh iphone
node capture.js ipad && node capture.js iphone
python3 finalize.py && python3 contact.py
```

Çıktı `final/` (PNG, saydamlık yok). Deneme verisi bugüne göre kurulur; davranış kayıtları ve "2,1 saat" gibi değerler çekim gününe göre kayabilir, son görüntüler gözle kontrol edilir (görsel inceleme alt ajanda).
