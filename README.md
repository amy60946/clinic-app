# ClinicApp

Uzmanlar (psikolog, ergoterapist, özel eğitim öğretmeni) için aile ve çocuk takip paneli. Web'de ve iPhone/iPad'de çalışır (Expo).
Pofi Adası (çocuk oyunu) ve ParentApp (ebeveyn) ile **aynı Supabase arka ucunu** kullanır.

## Nasıl çalışır

1. Uzman ClinicApp'te hesap açar: yeni klinik kurar (14 gün deneme) ya da klinik sahibinin verdiği ekip koduyla ekibe katılır.
2. **Aile davet et** ile 6 haneli kod üretir (7 gün geçerli, tek kullanımlık).
3. Ebeveyn ParentApp'te **Aile › Hesap › Uzmanım** bölümüne kodu yazar, uzmanı görür, çocuğu seçer ve açık rıza verir.
4. Uzman o çocuğun görevlerini, tamamlanma saatlerini, "yapamam" nedenlerini ve ebeveynin kaydettiği zor anları (ABC) okur.
   Aile mesajları, fotoğraf/ses ve coin bakiyesi paylaşılmaz. Ebeveyn paylaşımı her an durdurabilir.
5. Uzman aileye görev önerir; ebeveyn kabul ederse görev oluşur ve çocuk Pofi Adası'nda görür.

Panelde: özet göstergeler (tamamlama, zamanında, düzenli gün, seri), 8 haftalık grafik, görev bazında durum,
beceri alanları, hedefe ulaşma ölçeği (GAS, haftalık −2…+2, T puanı), zor an kayıtları, yalnız klinikte görünen notlar,
yazdırılabilir rapor, ekip ve plan bilgisi.

Göstergeler ev ortamındaki kayıtların özetidir; tanı, norm ya da standart test puanı değildir (rapor bunu yazar).

## Sunucu

Tablolar, güvenlik kuralları ve fonksiyonlar ParentApp deposunda: `supabase/proposed/20261019000000_clinic.sql`
(test: `supabase/test/run.sh`). Henüz canlı Supabase'e uygulanmadı.

## Geliştirme

```bash
npm install
npm test            # ölçüm hesapları (src/lib/metrics.ts)
npm run typecheck
npm run web         # tarayıcıda
npm start           # Expo Go
```

`.env.example` dosyasını `.env` adıyla kopyalayıp Supabase adresini ve publishable anahtarını yaz (secret anahtar asla).

## Web önizlemesi (deneme veritabanı)

```bash
(cd ../parent-app && bash preview/build.sh)   # ParentApp'i yanına koymak için
bash preview/build.sh                          # preview/out/index.html
```

Önizleme gerçek sunucuya bağlanmaz; veriler tarayıcıda tutulur. Uzman ve ebeveyn uygulaması aynı sayfada aynı deneme verisini paylaşır.
Hazır hesaplar: `uzman@clinicapp.app` ve `demo@parentapp.app`, şifre `12345678`.
