# Başlıklı mağaza görselleri (App Store ürün sayfası)

Üç tasarım yönü (4 Kasım 2026, kullanıcı isteği "App Store sayfası görselleri, global benchmark, 3 alternatif"; benchmark ve karşılaştırma: https://claude.ai/artifact/JWYr1vPJqEzdogLu8vVmCV):

| Dosya | Yön | Kareler |
|---|---|---|
| `altA.html` | A · Klinik sakinlik (Linear, Spruce, SimplePractice): açık zemin, solda başlık + gri alt satır, çerçevesiz ekran kartı | 7 |
| `altB.html` | B · Lacivert marka alanı (Slack, monday, Doctoralia): lacivert zemin, ortalı başlık, iPhone + telefondaki parçanın büyütülmüşü | 7 |
| `altC.html` | C · Tek döngü (SimplePractice, ClassDojo, Spruce): uzman → aile → çocuk → uzman adımları; 2–3. kare etiketli çizim | 6 |
| `ipad.html` | Üç yönün iPad 13" (yatay) ilk karesi | 3 |

Kareler gerçek ClinicApp ekranından (önizleme derlemesi + `../editdb.js` uydurma verisi) üretilir; metinler HTML'de. Sırayla (bu klasörde):

```bash
bash ../native-build.sh iphone && bash ../native-build.sh ipad
SHOT_TIME=2026-11-09T09:40:00+03:00 H=1800 node cap.js
SHOT_TIME=2026-11-09T09:40:00+03:00 node cap-ipad.js
node render.js altA && node render.js altB && node render.js altC
DSF=2 node render.js ipad
```

- `SHOT_TIME` "şimdi"yi sabitler (pazartesi sabahı: grafiklerin son haftası tam, veri her çekimde aynı).
- `cap.js` ekranları 440×1800 (×3) çeker ve her yazının ve kartın yerini `raw/boxes.json`'a yazar; şablonlar kırpmayı bu kutulara göre yapar, `kit.js` pencereyi satır ortasından kesmeyecek kadar kaydırır.
- Çıktı `out/<yön>/0n.png` (iPhone 1320×2868, iPad 2752×2064, RGB). Görsel kontrol alt ajanda (ortak CLAUDE.md kural 8).
- Kurallar: Apple 2.3.3 (karelerin çoğu uygulamanın kendisi), 2.3.7 (fiyat yok), 2.3.9 (uydurma veri); `ortak/hukuk/45` (sağlık/sonuç iddiası, sayı, yorum, rozet, "ücretsiz" yok). Yayından önce metin Marketing penceresinde §7.1 kontrolü.
