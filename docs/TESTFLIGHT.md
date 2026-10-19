# ClinicApp — iOS (iPad + iPhone) ve TestFlight

ClinicApp tek kod tabanıdır: aynı Expo projesi hem **web** (tarayıcı) hem **iOS** uygulaması olarak derlenir. iPad'de geniş, iPhone'da tek sütun düzen.

| | ClinicApp | ParentApp |
|---|---|---|
| Kim kullanır | Uzman | Ebeveyn |
| Bundle ID | `com.clinicapp.uzman` | `com.parentapp.ios` |
| Cihaz | iPad + iPhone, dikey ve yatay | iPhone, dikey |
| Bağlantı şeması | `clinicapp://` | `parentapp://` |
| Derleme | `.github/workflows/ios-testflight.yml` → `tools/ci/ios-testflight.sh` (ParentApp'teki düzeneğin aynısı) | aynı |

## Bir kez yapılacaklar

1. **Bundle ID:** developer.apple.com → Certificates, IDs & Profiles → **Identifiers** → **+** → App IDs → App →
   Description `ClinicApp`, Bundle ID (Explicit) `com.clinicapp.uzman` → Continue → Register.
   (`com.clinicapp.ios` Apple'da başkasına ait olduğu için kullanılamadı, 19 Ekim 2026.)
2. **Uygulama kaydı:** appstoreconnect.apple.com → **Apps** → **+** → **New App**: Platform iOS, Name `ClinicApp`
   (ad alınmışsa ör. `ClinicApp Uzman`), Primary Language Türkçe, Bundle ID `com.clinicapp.uzman`, SKU `clinicapp`, User Access Full Access.
3. **Secret'lar:** github.com/amy60946/clinic-app → Settings → Secrets and variables → Actions → **New repository secret**.
   ParentApp deposuna eklenenlerin **aynısı** (secret'lar depo başınadır):

| Secret | Değer |
|---|---|
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` (asla `sb_secret_`) |
| `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`, `APPLE_TEAM_ID` | App Store Connect API anahtarı ve takım kimliği |

4. **Supabase şifre/doğrulama bağlantıları:** Supabase → Authentication → **URL Configuration** → Redirect URLs → **Add URL** → `clinicapp://**`
   (ParentApp'in `parentapp://**` satırı kalır).
5. **Derleme:** github.com/amy60946/clinic-app → **Actions** → **iOS (TestFlight)** → **Run workflow**. ~20–30 dk.
6. **Deneme:** App Store Connect → ClinicApp → **TestFlight** → Internal Testing → kendini ekle → iPad/iPhone'daki TestFlight uygulamasından yükle.

## Sonraki sürümler

- Elle: Actions → iOS (TestFlight) → Run workflow. Ya da `main`'e gelen commit mesajına `[ios]` yaz.
- Derleme numarası her çalıştırmada otomatik artar; sürüm (`app.json` → `version`) elle değişir.

## Not: GitHub Mac dakikaları

`clinic-app` deposu **özel** (private). Özel depolarda GitHub'ın Mac makinesi ücretsiz kotadan **10 kat** sayılır
(ücretsiz planda ayda ~200 Mac dakikası ≈ 6–8 derleme). ParentApp ve GameApp depoları herkese açık olduğu için orada sınır yok.
