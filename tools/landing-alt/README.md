# Tanıtım sayfası etkileşim alternatifleri

Kullanıcı isteği (11 Kasım 2026): "landing page için animasyonlu / interaktif / kaydırdıkça güncellenen alternatifler; içerik aynı,
deneyim farklı; başarılı şirketlerden benchmark; karışık olmasın, işlev önde; önizleme olarak paylaş."

Kaynak tek: `site/index.html`. `build.py` yazıları oradan ayrıştırır (aynı kalır) ve yalnız "Platform Nasıl Çalışır?" bölümünü
(C'de ayrıca açılış görselini) üç biçimde yeniden kurar:

| Dosya | Deneyim |
|---|---|
| `out/a.html` | Kaydırdıkça: yazı kayar, ekran sabit kalıp adımla değişir (telefonda görsel üstte sabit) |
| `out/b.html` | Tıkladıkça: beş adım akordeon; yazı ve ekran yerinde değişir, "Sonraki adım" |
| `out/c.html` | Kendiliğinden: açılışta beş adımı sırayla gösteren tur (duraklat / adım seç), satırlar kaydırınca belirir |
| `out/now.html` | Bugünkü sayfa (karşılaştırma) |

```
python3 tools/landing-alt/shots.py <masaüstü görüntü klasörü> <telefon görüntü klasörü>   # assets/*.webp (kaynak: tools/qa/crawl.js DSF=2 / DSF=3)
python3 tools/landing-alt/build.py                                                      # out/
node tools/landing-alt/check.js <çıktı klasörü>                                          # işlev denetimi + ekran görüntüleri
```

Önizleme sayfası `host.html` (sekmeler + karşılaştırma); `out/` ile birlikte yayınlanır. `out/` depoya girmez (üretilir).
Bu klasör tanıtım sitesinin derlemesine girmez (`site/build.sh` yalnız `site/index.html` ve `site/assets` kopyalar).
Kurallar: betik çalışmasa da bütün içerik okunur; kaydırma hızına ve yönüne dokunulmaz; kendiliğinden oynayan içerikte
duraklat düğmesi var; "hareketi azalt" ayarında geçiş ve oynatma yok.

## Önizleme ve benchmark (11 Kasım 2026)

Önizleme: https://claude.ai/artifact/8MxFqNYz7J5hXoWMrBC9CP (sekmeler: Karşılaştırma · A · B · C · Şimdiki). Yeniden yayın:
`out/index.html` sayfa, `out/` altındaki öteki dosyalar yanında.

Karşılaştırma metni, öneri ve benchmark `data.json`'da. Benchmark 11 Kasım 2026'da `bench/probe.js` (sekme grupları,
kendiliğinden oynayan videolar, sayfanın kendi yazdığı ölçek cümleleri) ve `bench/pin.js` (kaydırırken yerinde kalan büyük bölümler)
ile 1440 px'te toplandı: `node tools/landing-alt/bench/probe.js <adres> …`. Bulgular:

- **Kendiliğinden (C):** Notion, Loom, Slack, Airtable, Apple (AirPods Pro), SimplePractice: açılışta kendiliğinden oynayan ürün
  gösterimi, çoğunda duraklat düğmesi.
- **Tıkladıkça (B):** Calendly (dört adımlı akış), Shopify, Apple, monday.com, Jane: sekmeli gösterim; 9 saniyede kendiliğinden
  ilerleyen yok.
- **Kaydırdıkça (A):** stil dosyaları açılabilen dokuz sayfada büyük sabitlenen bölüm bulunamadı (Calendly'de yalnız yerinde kalan
  bir başlık). Stripe, Linear, Slack, Shopify, monday.com'da stil dosyaları oturumdan açılamadı, denetlenemedi.
- NN/g: Scrolljacking 101 (2023), Auto-Forwarding Carousels, Accordions Annoy Users & Reduce Visibility (2013), The Role of
  Animation and Motion in UX (2020).

Öneri: C, ikinci B; A kanıtı en zayıf olan. Karar kullanıcıda; seçilen `site/index.html`'e işlenir, yayın kullanıcı onayıyla.

> 12 Kasım 2026: `site/index.html` yeni düzene geçti (önizleme https://claude.ai/artifact/4g3viopCTWujHervSVzpWt; gerçek ürün kayıtları `site/assets/motion`, `tools/landing-motion`). `build.py` eski sayfa yapısını okur; yeni sayfa seçilirse bu klasör tarihçedir.
