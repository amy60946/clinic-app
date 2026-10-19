# ClinicApp — Claude için çalışma notları

ClinicApp, uzman (klinik psikolog, ergoterapist, ABA/BCBA, çocuk terapisti) için web + iPad paneli. Üç üründen biri:

| Ürün | Kim kullanır | Depo | Durum |
|---|---|---|---|
| **Pofi Adası** (GameApp) | Çocuk (6–12, oyun) | `amy60946/pofi-adasi` (Unity 6, C#) | TestFlight hattı hazır |
| **ParentApp** | Ebeveyn (aile aboneliği) | `amy60946/parent-app` (Expo / React Native) | TestFlight'a yüklendi (19 Ekim 2026) |
| **ClinicApp** | Uzman (klinisyen başına ücret) | `amy60946/clinic-app` (bu depo) | Başlangıç |

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
- Adlandırma: "Fidan" adı hiçbir yerde kullanılmaz (taslak addı). Ürün adları: Pofi Adası (GameApp), ParentApp, ClinicApp.

## Ürün kararları (kullanıcı onaylı)

- **İş modeli (19 Ekim 2026):** gelir hem aile aboneliğinden (ParentApp) hem klinik kanalından (ClinicApp, klinisyen başına aylık ücret). Pofi Adası ücretsiz "çekiş motoru". Raporlama iki okuyucuya yazılır: ebeveyn ve uzman.
- **Tasarım:** ClinicApp, ParentApp'in sade ve işlevsel tasarım dilini izler (lacivert `#0F1B3D` ana renk, açık zemin, düz kartlar). Oyunun 3B "şeker" görselleri ClinicApp'te kullanılmaz.
- **Klinik sınırlar:** Hiçbir gösterge tanı, zekâ ya da dikkat puanı değildir. CAS2, MOXO gibi ölçek skorları üretilmez ve üretiliyormuş gibi gösterilmez. Geçerlik bir pilotla gösterilene kadar pazarlamada iddia kullanılmaz. Uzman çıktısı "gözlem toplar, tanı koymaz".
- **Rıza ve gizlilik:** Uzman bir çocuğun verisini yalnız ebeveynin verdiği açık rızayla görür; ebeveyn rızayı her an geri alır, erişim hemen biter. Uzman yalnız okur (görev, tamamlama, zor an/ABC kaydı) ve aileye görev **önerir**; ekleme kararı ebeveynindir. Posta ve coin defteri uzmanla paylaşılmaz. Klinik notları ve hedef puanları aileye görünmez.
- Çocuk uygulamasında üçüncü taraf analitik/reklam SDK'si yok. KVKK kapsamı ilk klinik müşterisine göre netleşecek (açık soru).

## Mevcut durum (19 Ekim 2026)

- Bu depo boş. Klinik sunucu önerisi şimdilik ParentApp deposundaki `claude/project-thread-vwahaf` dalında:
  `supabase/proposed/20261019000000_clinic.sql` (klinikler, uzmanlar, davet kodları, rıza bağlantısı, not, GAS, ABC, görev önerisi, aile aboneliği; satır düzeyi güvenlik) ve `supabase/test/test_clinic.sql`. **Henüz Supabase'e uygulanmadı.** `ortak` deposu kurulunca oraya taşınacak.
- ParentApp tarafında "Aile › Hesap › Uzmanım" (kodla paylaşım, paylaşımı durdurma, öneriyi görevlere ekleme, zor an kaydı) aynı dalda.
- Önizleme (uzman paneli + ParentApp, ortak deneme veritabanı): https://claude.ai/artifact/JkevesshtLTaZuJFrSrxNt
  Deneme girişleri sayfanın altında yazılı. Aynı URL'ye yeniden yayınla.
- Teknoloji kararı **bekliyor**. Öneri: Expo (React Native + web) — ParentApp ile bileşen, Supabase istemcisi ve tasarım paylaşımı; tek kod tabanıyla web ve iPad. Kullanıcı onaylamadan iskelet kurma.

## Referans dokümanlar (Claude Docs, kullanıcının "GameApp" projesinde)

- Joon iş modeli kanvası: https://claude.ai/code/artifact/df7eafa7-1e1e-4014-8a5f-7d88cb985485
- Pofi Adası oyun omurgası analizi (bölüm 6: ebeveyn/uzman raporları, bölüm 7: müşteri takip): https://claude.ai/code/artifact/3c82704c-e120-4d73-ba9f-a7ffdc75eeac
- Kullanıcının "Clinic-app" projesindeki araştırma sohbetleri bu oturumdan görünmez. Bir sonuca bakman gerekiyorsa kullanıcıdan o sonucu bir doküman olarak ürettirmesini ve bağlantısını iletmesini iste.
- Joon yalnız iş modeli/rakip referansıdır. İçerik, karakter, metin ve ekran düzeni kopyalanmaz.

## Açık sorular (kullanıcıyla karara bağlanacak)

1. ClinicApp teknolojisi (öneri: Expo + web).
2. Türkiye'deki ilk klinik müşterisi ve pilot ortağı (KVKK ve özellik önceliğini etkiler).
3. Klinik SQL'inin Supabase'e uygulanma zamanı (önce `ortak`'a taşınıp gözden geçirilecek).
4. Uzman raporunun ilk sürümünde hangi göstergeler olacak (omurga analizi bölüm 6).

## Güvenlik

- Uygulamaya ve depoya yalnız Supabase **publishable** anahtarı girer (`SUPABASE_PUBLISHABLE_KEY` secret). `sb_secret_` / `service_role` asla.
- Satır düzeyi güvenlik (RLS) her yeni tabloda zorunlu; testi `ortak` deposundaki SQL test düzeneğinde yazılır.
