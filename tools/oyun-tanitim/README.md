# Moyo Oyun tanıtım videosu ve karşılama ekranı görüntüleri (22 Kasım 2026)

Kullanıcı isteği: "Moyo Oyun onboarding ekranları için oyunun içinden gerçek ekran videolarından/görüntülerinden tanıtım videosu ve
onboarding ekranları oluştur; haritada farklı yerler: sahil, tapınak, oyun kulübesi, uzay oyunu, kamp alanı, mağara (sis detayı olmadan)."
Önizleme: tanıtım videosu + çalışan karşılama ekranları (Artifact, bağlantı `ortak/DURUM.md` satırında). Oyun kodu değişmedi; ekranları
oyuna Oyun penceresi kurar, seslerini Marketing üretir.

## Kaynak

Oyunun WebGL derlemesi (`amy60946/game-app` `webgl-preview` dalı; 22 Kasım'da game-app 1d02656 = TestFlight 40). Oyun deposu yalnız okunur:

```bash
git clone --depth=1 https://github.com/amy60946/game-app <oyun>   # oyunun kendi notları: <oyun>/CLAUDE.md
git -C <oyun> fetch -q origin +webgl-preview:refs/remotes/origin/webgl-preview
mkdir -p <iş>/derleme && git -C <oyun> archive origin/webgl-preview | tar -x -C <iş>/derleme
```

`<iş>/site/Build/` içine `PofiAdasi.loader.js`, `framework.js.unityweb` → `PofiAdasi.framework.wasm`, parçaları birleşmiş
`data.unityweb` → `PofiAdasi.data.wasm`, `wasm.unityweb` → `PofiAdasi.code.wasm`; `index.html` ve `keyart.jpg` `<oyun>/tools/preview/`'dan.
`cd <iş>/site && python3 -m http.server 8765`.

## Çekim: `cap.js`

Oyunun kendi `tools/preview/shots.js`'inin genişletilmiş kopyası (SwiftShader ile başsız Chromium). Komutlar `;` ile:
`dbg <PofiDebug komutu>` · `wait ms` · `click x y` · `drag x1 y1 x2 y2 ms` · `shot ad` · `rec klasör saniye fps [x1 y1 x2 y2]`.
`rec` **sanal saatle** çeker: `performance.now`, `Date` ve `requestAnimationFrame` sayfaya eklenen betikle durdurulur, her kare tam 1/fps
ilerletilip ekran görüntüsü alınır. Bilgisayar yavaş olsa da (1280×720'de kare başına ~3 sn) video akıcı çıkar. İsteğe bağlı sürükleme
her kareye yumuşak eğriyle dağıtılır (kuşbakışı kaydırma). Ortam: `W`, `H`, `DSF`, `URL`, `LOG=1`.

Oyunun ayıklama komutları (`<oyun>/Assets/_Pofi/Scripts/Runtime/Core/DebugCommands.cs`): `showall 1` (ada kurulmadan önce: kilitli yerler
sissiz), `login B2B2B2` (sahte arka uç), `pick pet_13`, `story off`, `xp 3000` (Gezegen Koşusu açık), `hud 0` (arayüz gizli),
`cam <uzaklık> <en az eğim> <görüş eki> <bakış yükselmesi>` (varsayılan `1.35 0 4 0.4`; geniş `1.9 16 4 1.2`), `tp X Z YÖN`
(metre, derece; yön 0 = +z, 90 = +x), `walk X Z`, `maptoggle`, `minigame runner` + `run start` + `run auto 1`.

| Klip | Komut (geniş kamera G = `cam 1.9 16 4 1.2`, varsayılan D) | Kırpım (kare) |
|---|---|---|
| harita | `maptoggle`, `rec klip/harita 4 30 640 280 640 400` (kuzeye kayış) | 12–119 |
| sahil (Yüzme Koyu) | G, `tp 52 -32 120`, `walk 58 -34` | 0–95 |
| tapinak | G, `tp 36 20 345`, `walk 34.5 26` | 4–105 |
| kulube (Oyun Kulübesi, yıldız kapısı) | G, `tp 34 -10 340`, `walk 32 -4` | 16–117 |
| kosu (Gezegen Koşusu) | D, `minigame runner`, `run start`, `run auto 1` | 6–143 |
| kamp | D, `tp 46 -6 45`, `walk 51 -1` | 8–100 |
| magara | G, `tp -50 4 309`, `walk -56 9` | 8–119 |

Karşılama ekranı görüntüleri aynı noktalardan `W=1266 H=585 DSF=2` (2532 × 1170, iPhone yatay) `shot` ile; koşu için önce
`rec … 2.5 10` (oyun ilerlesin), sonra `shot`.

Bilinen: kamerayla Okti arasına giren kaya ve ağaç oyunun kendi davranışıyla yarı saydam görünür; sığ sudaki köpük kenarları köşeli;
mağara modeli açık ağızlı değil, kaya yığını gibi okunur (etiket "Mağara" der).

## Kurgu: `kurgu.py`, `etiket.py`, `kirpim.json`

```bash
python3 -I tools/oyun-tanitim/kurgu.py <klip kökü> <çıktı> <beyaz logo.png>   # tanitim.mp4, tanitim.webp, bolum.json
```

Her klip `kirpim.json` aralığıyla, oyunun krem kapsülüyle mekân etiketi (`etiket.py`; GoldKit krem `#FFF7E0 → #F2D79A`, yazı `#6B3F0E`,
Baloo 2 ExtraBold `<oyun>/Assets/_Pofi/Resources/Fonts/`), 0,4 sn geçişler, kapanış kartı (son karenin bulanığı + beyaz "moyo Oyun" kilidi
`tools/cati-sayfa/inline-moyo-oyun.svg` + "Okti ile Pofi Adası"), baştan siyahtan açılış ve sonda kararma, oyunun kendi müziği
(`<oyun>/Assets/_Pofi/Resources/Audio/music_island_pcm.bytes`: 22050 Hz, mono, 16 bit, kodla bestelendi). Video iki geçişli ~2,3 Mb/sn
(1280 × 720, 30 kare/sn, ~25 sn, ~8 MB). Betikteki oyun yolları `/workspace/amy60946/game-app`; başka yerde klonlandıysa değiştir.
