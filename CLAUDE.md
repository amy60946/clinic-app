# ClinicApp — Claude için çalışma notları

ClinicApp, uzman (klinik psikolog, ergoterapist, ABA/BCBA, çocuk terapisti) için web + iPad paneli. Üç üründen biri:

| Ürün | Kim kullanır | Depo | Durum |
|---|---|---|---|
| **GameApp** | Çocuk (oyun; yaş bantları A 6–8 · B 9–12, canlıda doğrulandı 21 Ekim 2026) | `amy60946/game-app` (Unity 6, C#) | TestFlight'a yüklendi |
| **ParentApp** | Ebeveyn (aile aboneliği) | `amy60946/parent-app` (Expo / React Native) | TestFlight'a yüklendi (19 Ekim 2026) |
| **ClinicApp** | Uzman (klinisyen başına ücret) | `amy60946/clinic-app` (bu depo) | Uzman paneli ilk sürüm (web + iOS); TestFlight'a yüklendi (19 Ekim 2026) |

Üçü **ayrı uygulama, tek Supabase projesi** (`https://uhelhxqgpcjemadhsifx.supabase.co`). Aralarındaki bütün etkileşim veritabanı üzerinden olur.

## Ortak kaynak: `amy60946/ortak` (tek doğruluk kaynağı)

- Veritabanı şeması (SQL göçleri), tablo/RPC listesi, durum adları, coin/XP kuralları, seviye tablosu, rıza kuralları, karar günlüğü `ortak` deposundadır. Bu oturuma eklenmemişse kullanıcıya söyle, tahminle ilerleme.
- **Her işe başlamadan önce** `ortak/CLAUDE.md`, `ortak/DURUM.md` ve ilgili `ortak/sozlesme/*` dosyalarını oku.
- **Kural:** Ortak bir şey değişecekse (yeni tablo/alan, yeni durum, yeni RPC, kural değişikliği) önce `ortak` güncellenir. Uygulamalar ancak ondan sonra buna göre değişir. ClinicApp deposunda ayrı şema kopyası tutulmaz.
- Her oturum sonunda `ortak/DURUM.md` günlüğüne bir satır yaz: tarih, ürün, ne değişti, diğer ürünleri etkiliyor mu.
- Diğer ürünlerin koduna yalnız okumak için bakılabilir. Onların deposuna yazmak gerekiyorsa önce kullanıcıya sor; ilgili ürünün kendi oturumu yapar.

## Kullanıcı ve iletişim

- Kullanıcı yazılımcı değil. **Türkçe**, sade dille, adım adım ve nereye tıklayacağını söyleyerek anlat.
- Şifre/anahtar/lisansı sohbete yapıştırmasını **asla** isteme. Bunlar GitHub → Settings → Secrets and variables → Actions'a eklenir.
- Belirsiz kararda tahmin etme, kısa soru sor. Kapsam dışına çıkma; öneriler not olarak yazılır ve sorulur.
- Önizleme yalnızca kullanıcı isteyince ya da büyük bir aşama bitince yayınlanır.
- Push yalnız oturumun belirlenen `claude/...` dalına yapılır. Kullanıcı istemedikçe PR açılmaz.
- Adlandırma: "Fidan" ve eski oyun adı hiçbir yerde kullanılmaz. Ürün adları: GameApp, ParentApp, ClinicApp.

## Ürün kararları (kullanıcı onaylı)

- **İş modeli (19 Ekim 2026):** gelir hem aile aboneliğinden (ParentApp) hem klinik kanalından (ClinicApp, klinisyen başına aylık ücret). GameApp ücretsiz "çekiş motoru". Raporlama iki okuyucuya yazılır: ebeveyn ve uzman.
- **Tasarım:** ClinicApp, ParentApp'in sade ve işlevsel tasarım dilini izler (lacivert `#0F1B3D` ana renk, açık zemin, düz kartlar). Oyunun 3B "şeker" görselleri ClinicApp'te kullanılmaz.
- **Klinik sınırlar:** Hiçbir gösterge tanı, zekâ ya da dikkat puanı değildir. CAS2, MOXO gibi ölçek skorları üretilmez ve üretiliyormuş gibi gösterilmez. Geçerlik bir pilotla gösterilene kadar pazarlamada iddia kullanılmaz. Uzman çıktısı "gözlem toplar, tanı koymaz".
- **Rıza ve gizlilik:** Uzman bir çocuğun verisini yalnız ebeveynin verdiği açık rızayla görür; ebeveyn rızayı her an geri alır, erişim hemen biter. Uzman yalnız okur (görev, tamamlama, zor an/ABC kaydı) ve aileye görev **önerir**; ekleme kararı ebeveynindir. Posta ve coin defteri uzmanla paylaşılmaz. Klinik notları ve hedef puanları aileye görünmez.
- Çocuk uygulamasında üçüncü taraf analitik/reklam SDK'si yok. KVKK kapsamı ilk klinik müşterisine göre netleşecek (açık soru).

## Mevcut durum (19 Ekim 2026)

- **Teknoloji: Expo (React Native + web)**, ParentApp ile aynı sürümler (Expo 57, RN 0.86, React 19.2). Gezinme kütüphanesi yok; ekranlar durumla seçiliyor (`App.tsx` → `HomeScreen` → `client/ClientScreen`).
- Klinik sunucusu `ortak/supabase/migrations/20261019000000_clinic.sql`, yaş bandı göçü ve `20261019140000_clinic_suggestion_details.sql` (öneri ayrıntı alanları, `clinic_update_suggestion`, `clinic_clients`) **Supabase'e uygulandı**. Uygulama bu sütunlar/RPC'ler yoksa yine eski sütunlara düşer ("veritabanı güncellemesi bekleniyor" uyarısı).
- `ortak/supabase/migrations/20261021100000_clinic_team_tracking.sql` (ekip koduyla sonradan katılma, davet eden, kullanım kaydı) ve ParentApp'in `20261019140000_parent_features.sql`'i (zor an sesi, gün bölümü) **Supabase'e uygulandı** (21 Ekim 2026); `push-apns` ClinicApp konusuyla yeniden yayınlandı.
- **Bildirimler (21 Ekim 2026):** satırları sunucu tetikleyicileri yazar (`notifications`, app='clinic': `clinic_shared`, `clinic_revoked`, `abc_event`, `suggestion_decided`, `team_joined`). `src/lib/notifications.ts` (ParentApp'inkiyle aynı; push kaydı `register_push_token(…,'clinic')`), `src/lib/notificationsContext.tsx` (liste + Realtime + 60 sn yoklama, çocuk başına okunmamış), `NotificationsSheet.tsx` (zil → liste; dokununca ilgili danışan ve sekme), `components/Bell.tsx`. Danışan satırında ve danışan başlığında zil; açılan sekmenin bildirimleri okunmuş sayılır. iOS push: `expo-notifications`, CI'da App ID'ye push yeteneği (`asc_sign.py ensure_push`), gönderim `ortak/supabase/functions/push-apns` (konu `com.clinicapp.uzman`).
- **Üyelik (22 Ekim 2026; canlıda kapalı, canlıya alma adımları `ortak/DURUM.md` Açık işler):** Bireysel (1 uzman) / Klinik (10 uzmana kadar) × aylık/yıllık, 7 gün ücretsiz deneme. Sunucu `ortak/supabase/proposed/20261022000000_clinic_billing.sql` + Edge Function `ortak/supabase/functions/clinic-billing`. `src/lib/billing.ts` (paketler, içerik listesi, fiyat, Edge Function çağrıları), `src/lib/store.ios.ts` (App Store, `expo-iap`, `appAccountToken` = klinik kimliği) / `store.ts` (web: yok), `src/lib/iyzicoForm.web.ts` (iyzico ödeme formu), `src/screens/MembershipScreen.tsx` (durum kartı, paketler, fatura bilgisi formu, yenilemeyi kapat, geri yükle). `HomeScreen`: deneme/üyelik satırı; `clinician_me().access` false ise panel yerine üyelik ekranı (ödeme duvarı); web dönüşü `?billing=ok`. Yalnız klinik sahibi satın alır. Eski sunucuda (`access`/`status` yok) `active`'e düşer.
- **Hesap silme:** ana ekran altında "Hesabı sil" (`delete_account`; tek kişilik klinik silinir, ekipte sahiplik en eski üyeye geçer — sunucu `migrations/20261021300000_security_pentest.sql`, uygulandı 22 Ekim 2026).
- **Güvenlik (22 Ekim 2026 sızma denemesi):** e-posta bağlantıları PKCE (`flowType: 'pkce'`; adresteki `access_token` ile oturum açılmaz, bağlantıdaki hata metni gösterilmez, kayıt doğrulaması oturum açtırmaz); rapor web'de betiksiz `iframe sandbox`; ekip kodu 8 karakter (6'lık eski kodlar da kabul); hatalı kod denemesi sunucuda sınırlı.
- **Kullanım kaydı:** `src/lib/track.ts` (birinci taraf; `track_session` + toplu `track_events`, kişisel veri yok). Olay adları `ortak/sozlesme/akislar.md` 9.
- **Ekranlar:** giriş/kayıt (yeni klinik ya da girişteki "Ekip kodum var"; giriş yapmış tek başına sahip Ekip bölümünden kodla katılabilir), danışan listesi (çocuk adı + etiket + ebeveyn adları `clinic_clients` RPC'sinden; 3'ten fazla danışanda arama), aile paylaşım kodu, ekip (sahip ekip kodu üretir, koltuk sınırı).
  Danışan ayrıntısı sekmeleri Dönem seçicisi gibi gri zeminli seçici (`TabGrid`, kullanıcı kararı 21 Ekim 2026): telefonda 4 + 3 iki satır, geniş ekranda tek satır, kaydırma yok; okunmamış bildirimi olan sekmede nokta: **Özet** (tamamlama, tam gün, hatırlatmadan önce başlama, "Yapamam", haftalık grafik, ebeveyn döngüsü) · **Rutin** (görev başına oran + ustalık, beceri alanı, "Yapamam" nedenleri, ret notları) · **Zor anlar** (ABC; ebeveynin seçtiği gün bölümü `day_part`, sesli kayıt `AbcVoice` — Storage `abc` imzalı bağlantı, `expo-audio`) · **Hedefler** (GAS −2…+2, haftalık) · **Notlar** (aile görmez) · **Öneriler** (ParentApp'in görev oluşturma akışıyla birebir: şablon seç → ayrıntılar; `SuggestionEditor.tsx`. `src/templates.ts`, `src/dates.ts`, `DateField` ParentApp'ten kopya, eşit tutulmalı. Bekleyen öneri `clinic_update_suggestion` ile güncellenir ya da geri çekilir) · **Rapor** (yazdırılabilir "Ev rutini gözlem raporu", ad/baş harf/etiket seçimi; web'de PDF, iPad'de `expo-print`). Uzman paylaşımı sonlandırabilir.
- **Göstergeler** `src/lib/metrics.ts` (saf fonksiyonlar, `npm test`): tekrar kuralı sunucudaki `task_occurs_on` ile aynı; oranlar **dünkü güne kadar** (bugün sayılmaz); dönem `windowStarts` = dünü içeren hafta dahil son 4/8 hafta; ustalık = tamamlanmış son 4 haftanın her biri ≥ %90. Sınırlar metni (`LIMITS_TEXT`) her göstergede ve raporda.
- Kaynak: araştırma belgesi "GameApp oyun omurgası analizi" bölüm 6 (uzman çıktıları). Henüz yok: ebeveyn derecelendirme ölçeği trendi ve müdahale değişikliği işaretleri (yeni tablo ister → önce `ortak`, kullanıcı onayı), çok adımlı görevde adım tamamlama (veri yok), "zamanında yapma" (görevde bitiş saati yok).
- Yerel deneme: `ortak` göçleri + deneme verisi yerel PostgreSQL'de, PostgREST ve küçük bir auth taklidiyle web derlemesi uçtan uca denendi (gerçek RLS). `expo export` ortam değişkenlerini önbellekler; adres değişince `--clear` kullan.
- ParentApp tarafında "Aile › Hesap › Uzmanım" ParentApp penceresinin işi; kabulde öneriye `task_id` yazması gerekiyor.
- **iOS (iPad + iPhone):** aynı kod; bundle `com.clinicapp.uzman`, şema `clinicapp://`, simge `assets/icon.png`. TestFlight: `.github/workflows/ios-testflight.yml` → `tools/ci/ios-testflight.sh` (ParentApp düzeneğinden türedi: macos-15, Xcode 26, `expo prebuild` + xcodebuild; arşiv de dışa aktarma da `asc_sign.py`'nin geçici App Store dağıtım sertifikası + profiliyle elle imzalanır, imza ayarı yalnız uygulama hedefine yazılır. Otomatik imza her çalıştırmada geliştirme sertifikası üretip hesap sınırını doldurduğu için kullanılmaz, 19 Ekim 2026). Kurulum ve secret'lar: `docs/TESTFLIGHT.md`. Web'e özgü kod yalnız `Platform.OS === 'web'` dalında ya da `.web.ts` dosyalarında.
- **Denetim:** `.github/workflows/check.yml` her push'ta tür denetimi, testler, web + iOS JS paketleri (Linux).
- **Önizleme** (uzman paneli + ParentApp yan yana, ortak deneme veritabanı, gerçek veriye bağlanmaz): https://claude.ai/artifact/JkevesshtLTaZuJFrSrxNt
  Üretim: `bash preview/build.sh` → `preview/out/clinic.html`; aynı URL'ye `preview/frame.html` sayfa, `clinic.html` dosya olarak yayınlanır (`app.html` ParentApp penceresinden, dokunulmaz). Deneme veritabanı `preview/demo-supabase.ts` ParentApp'inkinin kopyası + embed, sıralama ve uzman görünürlüğü; depo anahtarı iki önizlemede aynı kalmalı. Girişler: uzman@clinicapp.app (klinik sahibi) / ekip@clinicapp.app (ekip üyesi, davet eden görünür) / bitti@clinicapp.app (denemesi bitmiş, ödeme duvarı) / demo@parentapp.app, şifre 12345678. Önizlemede ödeme alınmaz (paket seçilince klinik hemen o pakete geçer). Önizleme ParentApp tetikleyici çalıştırmadığı için uzman bildirimleri `deriveClinicNotifications` ile satırlardan türetilir.

## Referans dokümanlar (Claude Docs, kullanıcının "GameApp" projesinde)

- Joon iş modeli kanvası: https://claude.ai/code/artifact/df7eafa7-1e1e-4014-8a5f-7d88cb985485
- GameApp oyun omurgası analizi (bölüm 6: ebeveyn/uzman raporları, bölüm 7: müşteri takip): https://claude.ai/code/artifact/3c82704c-e120-4d73-ba9f-a7ffdc75eeac
- Kullanıcının "Clinic-app" projesindeki araştırma sohbetleri bu oturumdan görünmez. Bir sonuca bakman gerekiyorsa kullanıcıdan o sonucu bir doküman olarak ürettirmesini ve bağlantısını iletmesini iste.
- Joon yalnız iş modeli/rakip referansıdır. İçerik, karakter, metin ve ekran düzeni kopyalanmaz.

## Açık sorular (kullanıcıyla karara bağlanacak)

1. Türkiye'deki ilk klinik müşterisi ve pilot ortağı (KVKK ve özellik önceliğini etkiler).
2. Uzman raporunun ilk sürümü yapıldı (bölüm 6'dan veriyle desteklenenler); ebeveyn ölçeği ve müdahale işaretleri onay bekliyor.
3. ClinicApp web sürümünün nerede yayınlanacağı (alan adı/barındırma) ve Supabase Auth yönlendirme adresleri.

## Güvenlik

- Uygulamaya ve depoya yalnız Supabase **publishable** anahtarı girer (`SUPABASE_PUBLISHABLE_KEY` secret). `sb_secret_` / `service_role` asla.
- Satır düzeyi güvenlik (RLS) her yeni tabloda zorunlu; testi `ortak` deposundaki SQL test düzeneğinde yazılır.
