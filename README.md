# ClinicApp

Uzman (klinik psikolog, ergoterapist, ABA/BCBA, çocuk terapisti) için web + iPad paneli. Expo (React Native + web), ParentApp ile aynı yapı ve tasarım dili.

Veritabanı sözleşmesi bu depoda değil: [`amy60946/ortak`](https://github.com/amy60946/ortak) (klinik bölümü: `sozlesme/veritabani.md` §4, `sozlesme/akislar.md` §5).

## Şu an neler var

- Uzman girişi, kaydı (yeni klinik açar ya da ekip koduyla katılır), şifre yenileme.
- Panel: klinik bilgisi, aileye paylaşım kodu üretme, ebeveynin rıza verdiği danışanların listesi.
- Klinik SQL'i Supabase'e uygulanmadıysa panel "Klinik veritabanı henüz kurulmadı" der.

## Çalıştırma (geliştirici için)

1. `.env.example` dosyasını `.env` adıyla kopyala, Supabase adresini ve **publishable** anahtarı yaz (secret/service_role asla).
2. `npm install`
3. `npm run web` (tarayıcı) ya da `npm start` (iPad'de Expo Go).
4. Tür denetimi: `npm run typecheck`
