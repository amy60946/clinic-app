# Arayüz ve şema denetimi (QA)

Önizleme web'de çalıştığı için iPhone'un yerleşim motorundaki (Yoga) farkları ve sahte deneme veritabanının gerçek
Supabase'den farklarını göstermez (5 Kasım 2026'da iki hata böyle kaçtı: telefonda çöken Takip Planı başlığı, PostgREST
"more than one relationship" hatası). Bu araçlar ikisini de yakalar.

## 1. Telefon/iPad arayüz taraması

```
bash preview/build.sh                      # preview/out/clinic.html
W=393 node tools/qa/crawl.js               # iPhone 15/16 (375: SE/mini, 820: iPad dikey; iPad için H=1180)
```

Dört deneme hesabıyla (uzman@, ekip@, ada@, bitti@) ana ekran, pencereler, Kaynak kütüphanesi, danışanın bütün
bölümleri (Ebeveyn Eğitimi ve Davranışlar ve Olaylar dahil, iki "Ebeveyn deneyimini önizle" akışı uçtan uca), takvim ve
ayarlar gezilir. Yalnız kütüphane + eğitim + davranış adımları için `ONLY=training` (masaüstü: `W=1440 H=900`). Her adımda `yoga-emu.js` iOS'u taklit eder:
- çok satırlı flex kapsayıcıda satırlar gerilmez (Yoga `alignContent: flex-start`),
- `flex: 1` (temel 0) öğe, satır yönündeki kapsayıcının içerik genişliğine katkı vermez,
- metin (Text) kendiliğinden daralmaz (Yoga `flexShrink: 0`),
sonra ezilen (sözcük ortasından kırılan), ekrandan taşan, kartın kenarında kesilen ve üst üste binen yazılar
listelenir. Çıktı: adım başına `temiz` ya da bulgu; ekran görüntüleri ve `api.json` işletim sisteminin geçici
klasöründe `clinicapp-qa/out-<genişlik>/` altında (`OUT=` ile değişir). Görüntüleri bir alt ajana baktır (ana pencereye değil).

## 2. Veritabanı istekleri ↔ gerçek şema

```
bash tools/qa/db.sh <ortak yolu>                      # qa_canli (uygulanmış göçler) + qa_onerili (+ proposed)
python3 tools/qa/api-check.py <out>/api.json          # gezintide yapılan her istek: tablo, sütun, gömme, işlev, parametre
python3 tools/qa/rpc-static.py                        # koddaki bütün supabase.rpc('…', {…}) çağrıları
```

"Canlı şemada sorun, önerilerle de sorun" altında bir satır varsa gerçek hatadır. "Yalnız canlıda yok" satırları
bekleyen öneri SQL'ine bağlıdır; uygulama orada eski sunucu davranışına düşmelidir. Önizleme istek kaydı
`preview/demo-supabase.ts` içindeki `window.__apiLog` kancasıyla (yalnız betik verince) tutulur.
