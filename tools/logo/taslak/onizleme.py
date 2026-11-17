#!/usr/bin/env python3
# sekil.json -> onizleme.html (Artifact sayfası). Önce: python3 ciz.py
import json, re
S = json.load(open('sekil.json'))
YAZI = re.sub(r'\s+', ' ', open('../../cati-sayfa/inline-moyo.svg').read().strip())

def kubbe(k, renk='var(--mor)', vurgu=None, cls=''):
    v = S[k]
    return (f'<svg class="{cls}" viewBox="0 0 {v["w"]} {v["h"]}" role="img" aria-label="Logo {k.upper()}">'
            f'<path d="{v["d"]}" fill="{renk}" fill-rule="evenodd"/>' + (f'<path d="{v["v"]}" fill="{vurgu or renk}"/>' if v['v'] else '') + '</svg>')

def ikon(k, zemin='url(#gr)', vurgu=None, kare=False, cls=''):
    v = S[k]; p = 22
    W, H = v['w'] + 2 * p, v['h'] + 2 * p
    if kare:
        H = W; oy = (W - v['h']) / 2; rx = W * 0.225
    else:
        oy = p; rx = 16
    return (f'<svg class="{cls}" viewBox="0 0 {W} {H}" role="img" aria-label="Logo {k.upper()}"><rect width="{W}" height="{H}" rx="{rx}" fill="{zemin}"/>'
            f'<g transform="translate({p},{oy})"><path d="{v["d"]}" fill="#fff" fill-rule="evenodd"/>' + (f'<path d="{v["v"]}" fill="{vurgu}" fill-rule="evenodd"/>' if vurgu else '') + '</g></svg>')

def kart1(k, oneri=False):
    v = S[k]
    return f'''<article class="kart{' oneri' if oneri else ''}">
  <div class="sahne">{kubbe(k, cls='buyuk')}</div>
  <div class="kucukler" aria-label="Küçük boylar">
    <span class="k" style="--s:48px">{kubbe(k)}</span><span class="k" style="--s:28px">{kubbe(k)}</span><span class="k" style="--s:16px">{kubbe(k)}</span>
    <span class="k ters" style="--s:30px">{kubbe(k, '#fff', 'var(--mor)')}</span>
  </div>
  <h3><b>{k.upper()}</b> {v["ad"]}{'<em>Önerim</em>' if oneri else ''}</h3>
  <p>{v["aciklama"]}</p>
</article>'''

def kart2(k, oneri=False):
    v = S[k]
    return f'''<article class="kart{' oneri' if oneri else ''}">
  <div class="sahne">{ikon(k, cls='buyuk')}</div>
  <div class="kucukler" aria-label="Uygulama simgesi boyları">
    <span class="k" style="--s:60px">{ikon(k, kare=True)}</span><span class="k" style="--s:40px">{ikon(k, kare=True)}</span><span class="k" style="--s:24px">{ikon(k, kare=True)}</span>
  </div>
  <h3><b>{k.upper()}</b> {v["ad"]}{'<em>Önerim</em>' if oneri else ''}</h3>
  <p>{v["aciklama"]}</p>
</article>'''

marka = ''.join(f'<div class="m-oge"><div class="m-sahne">{x}</div><span>{ad}</span></div>' for x, ad in [
    (kubbe('1b', 'var(--lacivert)', 'var(--yesil)'), '1B'),
    (kubbe('1c', 'var(--lacivert)', 'var(--yesil)'), '1C'),
    (ikon('2a', 'var(--lacivert)', 'var(--yesil)', kare=True), '2A'),
    (ikon('2c', 'var(--lacivert)', 'var(--yesil)', kare=True), '2C'),
])
kilit = ''.join(f'<div class="kilit">{x}<span class="yazi">{YAZI}</span></div>' for x in [kubbe('1c', 'var(--lacivert)', 'var(--yesil)'), ikon('2c', 'var(--lacivert)', 'var(--yesil)', kare=True)])

html = f'''<title>Moyo logo taslakları</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&display=swap">
<style>
/* Düzen: tek sütun okuma sayfası; her logo için eşit kart ızgarası (büyük çizim, küçük boy sırası, tek satır açıklama). */
:root {{
  --zemin: #F6F5FA; --kagit: #FFFFFF; --yazi: #16113A; --yazi-2: #5A5676; --cizgi: #E2E0EC; --sahne: #FFFFFF;
  --mor: #5B45DE; --lacivert: #16113A; --yesil: #0FD354; --not: #FFF6DC; --not-yazi: #5C4300; --oneri: #0A8F3A;
  --govde: "Manrope", system-ui, -apple-system, "Segoe UI", sans-serif;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --zemin: #100D24; --kagit: #1A1636; --yazi: #F2F0FA; --yazi-2: #B3AFCB; --cizgi: #332E55; --sahne: #FFFFFF; --not: #3A2F0E; --not-yazi: #F6E3A6; --oneri: #3DDC7C; color-scheme: dark; }} }}
:root[data-theme="dark"] {{ --zemin: #100D24; --kagit: #1A1636; --yazi: #F2F0FA; --yazi-2: #B3AFCB; --cizgi: #332E55; --sahne: #FFFFFF; --not: #3A2F0E; --not-yazi: #F6E3A6; --oneri: #3DDC7C; color-scheme: dark; }}
* {{ box-sizing: border-box; }}
body {{ background: var(--zemin); color: var(--yazi); font-family: var(--govde); font-size: 16px; line-height: 1.5; }}
.sayfa {{ max-width: 1120px; margin: 0 auto; padding-block: 36px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 40px; }}
h1 {{ font-size: clamp(26px, 4vw, 38px); line-height: 1.12; margin: 0; font-weight: 800; letter-spacing: -.02em; text-wrap: balance; }}
h2 {{ font-size: 22px; line-height: 1.2; margin: 0; font-weight: 800; letter-spacing: -.01em; }}
.giris p, .bolum > p {{ margin: 10px 0 0; max-width: 68ch; color: var(--yazi-2); }}
.izgara {{ margin-top: 18px; display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 16px; }}
.izgara.uc {{ grid-template-columns: repeat(auto-fit, minmax(232px, 1fr)); }}
.kart {{ background: var(--kagit); border: 1px solid var(--cizgi); border-radius: 18px; padding: 14px; display: grid; gap: 12px; align-content: start; min-width: 0; }}
.kart.oneri {{ border-color: var(--oneri); box-shadow: 0 0 0 1px var(--oneri); }}
.sahne {{ background: var(--sahne); border-radius: 12px; aspect-ratio: 4 / 3; display: grid; place-items: center; padding: 22px; }}
.sahne .buyuk {{ width: 74%; height: auto; max-height: 100%; display: block; }}
.kucukler {{ display: flex; align-items: flex-end; gap: 14px; padding: 10px 12px; background: var(--sahne); border-radius: 12px; min-height: 76px; }}
.k {{ display: inline-grid; place-items: center; flex: none; }}
.k svg {{ width: var(--s); height: auto; display: block; }}
.k.ters {{ margin-left: auto; width: 52px; height: 52px; border-radius: 13px; background: var(--mor); }}
.kart h3 {{ margin: 0; font-size: 16px; line-height: 1.3; font-weight: 700; }}
.kart h3 b {{ font-weight: 800; color: var(--yazi-2); font-variant-numeric: tabular-nums; margin-right: 6px; }}
.kart h3 em {{ display: block; margin-top: 2px; font-style: normal; font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--oneri); }}
.kart p {{ margin: 0; font-size: 14.5px; color: var(--yazi-2); }}
.marka {{ margin-top: 18px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }}
.m-oge {{ display: grid; gap: 8px; justify-items: center; font-size: 13px; font-weight: 800; color: var(--yazi-2); }}
.m-sahne {{ width: 100%; background: var(--sahne); border: 1px solid var(--cizgi); border-radius: 14px; aspect-ratio: 1; display: grid; place-items: center; padding: 22%; }}
.m-sahne svg {{ width: 100%; height: auto; display: block; }}
.kilitler {{ margin-top: 16px; display: flex; flex-wrap: wrap; gap: 16px; }}
.kilit {{ flex: 1 1 280px; background: var(--sahne); border: 1px solid var(--cizgi); border-radius: 14px; padding: 26px 24px; display: flex; align-items: center; justify-content: center; gap: 16px; color: var(--lacivert); min-width: 0; }}
.kilit > svg {{ height: 46px; width: auto; flex: none; }}
.kilit .yazi svg {{ height: 34px; width: auto; display: block; }}
.kilit .logo-dot {{ fill: var(--yesil); }}
.notlar {{ display: grid; gap: 12px; }}
.notlar ul {{ margin: 0; padding-left: 20px; display: grid; gap: 8px; max-width: 72ch; }}
.uyari {{ background: var(--not); color: var(--not-yazi); border-radius: 14px; padding: 14px 18px; max-width: 72ch; }}
.uyari b {{ font-weight: 800; }}
</style>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="gr" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#9A5BF5"/><stop offset="1" stop-color="#6A49DC"/></linearGradient></defs></svg>
<main class="sayfa">
  <header class="giris">
    <h1>Moyo logo taslakları</h1>
    <p>Gönderdiğiniz iki taslağı istediğiniz yönde çizdim. Logo 1'de kubbenin içindeki beyaz boşluklar büyüteç oldu ve ikiye indi; kubbe üç bacakla "m" okunuyor. Logo 2'de alttaki çıkıntı üçe çıktı, bacaklar derinleşti. Her kartın altında aynı çizimin küçük boyları var.</p>
  </header>

  <section class="bolum" aria-labelledby="b1">
    <h2 id="b1">Logo 1 · Kubbe, iki büyüteç</h2>
    <p>Beyaz boşluğun ucu yuvarlak (büyütecin camı), aşağı inen kısım sapı. İki boşluk arasında kalan üç mor bacak "m" harfini verir.</p>
    <div class="izgara">{kart1('1a')}{kart1('1b')}{kart1('1c', True)}{kart1('1d')}{kart1('1e')}</div>
  </section>

  <section class="bolum" aria-labelledby="b2">
    <h2 id="b2">Logo 2 · Kare ikon, üç çıkıntı</h2>
    <p>Beyaz biçimin altı üç çıkıntıya bölündü; aradaki mor saplar daha yukarıdan başlıyor. Alt sırada uygulama simgesi olarak kare hâli.</p>
    <div class="izgara uc">{kart2('2a')}{kart2('2b')}{kart2('2c', True)}</div>
  </section>

  <section class="bolum" aria-labelledby="b3">
    <h2 id="b3">Moyo renkleriyle</h2>
    <p>Aynı çizimler bugünkü marka renkleriyle: lacivert gövde, yeşil vurgu. Altında "moyo" yazısıyla yan yana.</p>
    <div class="marka">{marka}</div>
    <div class="kilitler">{kilit}</div>
  </section>

  <section class="notlar" aria-labelledby="b4">
    <h2 id="b4">Notlar</h2>
    <div class="uyari"><b>Benzerlik:</b> ilk taslaktaki kubbe ve bacak biçimi, Kraken adlı kripto borsasının logosuyla neredeyse aynı. Büyüteçli sürümler ondan uzaklaşıyor ama dış çizgi hâlâ yakın. Bu yönü seçerseniz tescil öncesi marka araştırması gerekir.</div>
    <ul>
      <li><b>Önerim 1C ve 2C.</b> 1C'de bacaklar uzun olduğu için "m" en net burada okunuyor. 2C, Logo 1 ile aynı büyüteç fikrini taşıyor; ikisi bir aile gibi duruyor.</li>
      <li>İki yuvarlak baş, kubbede iki göz gibi de okunuyor; logo bir karaktere benziyor. Çocuklu bir ürün için artı sayılabilir, kurumsal durmasını isterseniz 1E daha sade.</li>
      <li>16 piksel ve altında büyüteç halkası kayboluyor; o boyda yalnız kubbe ve bacaklar kalıyor. Tarayıcı sekmesi gibi çok küçük yerlerde 1E kullanılabilir.</li>
      <li>Bunlar önizleme çizimi. Seçtiğiniz sürümü temiz vektör olarak yeniden çizer, uygulama simgesi ve yazılı kilit boylarını çıkarırım.</li>
    </ul>
  </section>
</main>
'''
open('onizleme.html', 'w').write(html)
print('ok', len(html))
