# ClinicApp

Uzman (klinik psikolog, ergoterapist, ABA/BCBA, çocuk terapisti) için web + iPad paneli. Expo (React Native + web), ParentApp ile aynı yapı ve tasarım dili.

Veritabanı sözleşmesi bu depoda değil: [`amy60946/ortak`](https://github.com/amy60946/ortak) (klinik bölümü: `sozlesme/veritabani.md` §4, `sozlesme/akislar.md` §5).

## Şu an neler var

- Uzman girişi, kaydı (yeni klinik açar ya da ekip koduyla katılır), şifre yenileme.
- Danışan listesi, aileye paylaşım kodu, ekip daveti.
- Danışan ayrıntısı: Özet · Rutin · Zor anlar · Hedefler (GAS) · Notlar · Öneriler · Rapor (yazdır / PDF).
- Hiçbir gösterge tanı, zekâ ya da dikkat puanı değildir; sınırlar her ekranda ve raporda yazılıdır.

## Çalıştırma (geliştirici için)

1. `.env.example` dosyasını `.env` adıyla kopyala, Supabase adresini ve **publishable** anahtarı yaz (secret/service_role asla).
2. `npm install`
3. `npm run web` (tarayıcı) ya da `npm start` (iPad'de Expo Go).
4. Tür denetimi: `npm run typecheck` · gösterge testleri: `npm test`
