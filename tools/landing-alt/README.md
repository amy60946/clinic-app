# Tanıtım sayfası etkileşim alternatifleri

Kullanıcı isteği (11 Kasım 2026): "landing page için animasyonlu / interaktif / kaydırdıkça güncellenen alternatifler; içerik aynı,
deneyim farklı; başarılı şirketlerden benchmark; karışık olmasın, işlev önde; önizleme olarak paylaş."

Kaynak tek: `site/index.html`. `build.py` yazıları oradan ayrıştırır (aynı kalır) ve yalnız "Platform Nasıl Çalışır?" bölümünü
(C'de ayrıca açılış görselini) üç biçimde yeniden kurar:

| Dosya | Deneyim |
|---|---|
| `out/a.html` | Kaydırdıkça: yazı kayar, ekran sabit kalıp adımla değişir (telefonda görsel üstte sabit) |
| `out/b.html` | Tıkladıkça: altı adım akordeon; yazı ve ekran yerinde değişir, "Sonraki adım" |
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
