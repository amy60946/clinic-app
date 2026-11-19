# Moyo Ebeveyn fiyat sayfası (kullanıcı isteği 18 Kasım 2026: fiyat ana sayfadan ayrı sayfaya; canlıda /ebeveyn/fiyat/).
# Yapı Mercek sitesinin fiyat sayfasıyla aynı sırada (site/fiyat.html): açılış → plan kartları → karşılaştırma → kısa SSS →
# deneme kapanışı. Üst menü, alt bilgi ve <head> yap_m.py'den (aynı tasarım: m/site.css + m/moyo.css + m/moyo.js).
# Metin f-metin.json; yalnız doğrulanmış olgular (kaynaklar dosyanın "_kaynak" alanında).
# Tur 3 (19 Kasım 2026, kullanıcı kararları): fiyat kesinleşene kadar yer tutucu Premium 349 TL / ay, gerçek fiyat gibi gösterilir; yanında
# dönem, kendiliğinden yenileme ve App Store'dan iptal yazar; "Taslak fiyat" etiketi yalnızca önizlemede (<!-- ONIZ:BAS/SON -->,
# disa_aktar.py canlıya taşımaz). Yıllık rakam yazılmaz ("Yıllık seçenek uygulamada"). "Ücretsiz" ve "14 gün" yeşil: koyu açılışta
# marka yeşili yazı (8,3:1), beyaz kartta --c-ok yazı (5,3:1) ve yeşil zeminli koyu yazılı rozet. Açılış kısaldı, deneme bandı ve
# "Moyo Ebeveyn'de" maddeleri çıktı (söyledikleri artık açılışta ve kartlarda; aynı cümle iki kez geçmesin): plan kartları fiyatlarıyla
# 1440×900 ve 1366×768'de kaydırmadan, 390×844'te ilk kartın adı ve fiyatı ilk ekranda görünür.
# Kullanım: cd tools/cati-sayfa && python3 yap_f.py  → ebeveyn-fiyat.html
import json, re
import yap_m as M

F = json.load(open('f-metin.json'))
e = M.e
EVET = '<td class="yes"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span class="sr">Var</span></td>'
YOK = '<td class="no"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 12h10"/></svg><span class="sr">Yok</span></td>'
hucre = lambda v: EVET if v is True else YOK if v is False else f'<td>{e(v)}</td>'
liste = lambda xs: ''.join(f'<li>{e(x)}</li>' for x in xs)

U, P = F['ucretsiz'], F['premium']
tablo = ''.join(
    f'''          <tbody>
            <tr class="grp"><th scope="rowgroup" colspan="3">{e(g)}</th></tr>
''' + ''.join(f'            <tr><th scope="row">{e(r[0])}</th>{hucre(r[1])}{hucre(r[2])}</tr>\n' for r in satirlar) + '          </tbody>\n'
    for g, satirlar in F['tablo'])
sss = ''.join(f'<details><summary>{e(q)}</summary><p>{e(a)}</p></details>' for q, a in F['sss'])

# Alt bilgideki slogan ana sayfanın açılış başlığıdır: "h1" grubu burada da seçilebilir (19 Kasım QA; canlıda ebeveyn.html'nin seçimi geçer)
ONIZ = [dict(M.H1_GRUP, hedef='footer', ad='Alt bilgideki slogan (ana sayfanın açılış başlığı)')]
html = f'''{M.bas(F["baslik"], F["aciklama"], "/ebeveyn/fiyat/", ONIZ)}
<body class="sayfa-moyo sayfa-fiyat">
{M.ust("fiyat")}
<main id="main">
  <section class="ph" aria-labelledby="h-fiyat">
    <div class="wrap">
      <p class="eyebrow">Fiyatlar</p>
      <h1 id="h-fiyat">{F["h1"]}</h1>
      <p class="sub">{e(F["alt"])}</p>
    </div>
  </section>

  <section class="sec sec-soft" aria-label="Planlar">
    <div class="wrap">
      <div class="plans">
        <article class="plan" aria-labelledby="h-ucretsiz">
          <h2 id="h-ucretsiz">{e(U["ad"])}</h2>
          <p class="who">{e(U["kim"])}</p>
          <p class="note">{e(U["not"])}</p>
          <p class="price"><span class="amount fy-yesil">{e(U["tutar"])}</span></p>
          <div class="fy-kosul"><p>{e(U["alt"])}</p></div>
          <a class="btn btn-ink block" href="{M.APP}#kayit">Ücretsiz deneyin</a>
          <ul>{liste(U["madde"])}</ul>
        </article>

        <article class="plan plus" aria-labelledby="h-premium">
          <h2 id="h-premium">{e(P["ad"])} <span class="fy-rozet">{e(P["rozet"])}</span></h2>
          <p class="who">{e(P["kim"])}</p>
          <p class="note">{e(P["not"])}</p>
          <p class="price"><span class="amount">{e(P["tutar"])}</span> <span class="unit">{e(P["birim"])}</span><!-- ONIZ:BAS --> <span class="draft">{e(P["taslak"])}</span><!-- ONIZ:SON --></p>
          <div class="fy-kosul"><p>{e(P["donem"])}</p><p>{e(P["yenileme"])}</p></div>
          <a class="btn btn-cta block" href="{M.APP}#kayit">14 gün ücretsiz deneyin</a>
          <ul>{liste(P["madde"])}</ul>
        </article>
      </div>

      <div class="fy-oyun">
        <img src="{M.APPS["oyun"][0]}" alt="" width="56" height="56">
        <div><h2>{e(F["oyun"][0])} <span>{e(F["oyun"][1])}</span></h2><p>{e(F["oyun"][2])}</p></div>
      </div>
    </div>
  </section>

  <section class="sec sec-white" aria-labelledby="h-cmp">
    <div class="wrap">
      <div class="cmp">
        <table aria-labelledby="h-cmp">
          <caption><h2 id="h-cmp">Planları karşılaştırın</h2><p class="fy-tnot">{e(F["tablo_not"])}</p></caption>
          <thead>
            <tr>
              <th scope="col">Özellik</th>
              <th scope="col"><b>{e(U["ad"])}</b><span>Deneme bitince</span></th>
              <th scope="col"><b>{e(P["ad"])}</b><span>Aylık ya da yıllık</span></th>
            </tr>
          </thead>
{tablo}        </table>
      </div>
    </div>
  </section>

  <section class="sec sec-soft" id="sss" aria-labelledby="h-sss">
    <div class="wrap">
      <div class="head"><p class="eyebrow">Sık sorulanlar</p><h2 id="h-sss">Kısaca</h2></div>
      <div class="faq">{sss}</div>
    </div>
  </section>

  <section class="sec sec-white" aria-labelledby="h-dene">
    <div class="wrap">
      <div class="closing">
        <h2 id="h-dene">{e(F["kapanis"])}</h2>
        <div class="actions"><a class="btn btn-cta" href="{M.APP}#kayit">Ücretsiz deneyin</a><a class="btn btn-line" href="{M.APP}#giris">Giriş</a></div>
        <p class="fine">{e(F["kapanis_ince"])}</p>
      </div>
    </div>
  </section>
</main>

{M.alt("fiyat")}'''
html = html.replace('App Store', 'App&nbsp;Store')   # görünen metinde "App / Store" diye bölünmesin (tur 3)

if __name__ == '__main__':
    assert 'istediğiniz' not in html and '—' not in html, 'yasaklı ifade ya da uzun tire'
    assert html.count('Taslak fiyat') == 1 and re.search(r'<!-- ONIZ:BAS --> <span class="draft">Taslak fiyat</span><!-- ONIZ:SON -->', html), 'taslak etiketi yalnızca önizlemede'
    gorunen = re.sub(r'<[^>]+>', ' ', re.sub(r'<(script|style|svg)\b.*?</\1>', ' ', html, flags=re.S))
    for yasak in ('kurun', 'kurarsınız', ' yalnız ', 'zor an', 'tek platform'):
        assert yasak not in gorunen.lower(), f'yasaklı ifade: {yasak}'
    assert html.count('<h1') == 1
    open('ebeveyn-fiyat.html', 'w').write(html); print('ok ebeveyn-fiyat.html')
