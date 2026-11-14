# Moyo (ebeveyn) tanıtım sayfası, Moyo Mercek sitesinin düzeniyle (kullanıcı isteği 14 Kasım 2026: "Moyo Mercek landing
# akışı/anlatımı Moyo app'i için uygula; app'in görsellerini kullan"). Çatı sayfa ekosistemi anlatır, bu sayfa ebeveynin ürününü.
# Tasarım dili m/site.css (Mercek sitesinin kopyası) + m/moyo.css. Çıktı: ebeveyn.html (göreli yollar; disa_aktar.py canlıya taşır).
import json, re, html as H
E = json.load(open('e-metin.json'))
e = H.escape
LOGO = open('inline-moyo.svg').read().strip()
LOGO = re.sub(r' role="img" aria-label="[^"]*"', ' aria-hidden="true" focusable="false"', LOGO).replace(' xmlns="http://www.w3.org/2000/svg"', '')
APP = 'https://ebeveyn.moyoapp.com.tr/'
MERCEK = 'https://mercek.moyoapp.com.tr/'
SVG = lambda d: f'<svg viewBox="0 0 24 24" aria-hidden="true">{d}</svg>'
I = {
    'reklam': '<path d="M3 4h2.2l2.2 10.2h10.2L20 7H7"/><circle cx="9.5" cy="18.6" r="1.4"/><circle cx="16.5" cy="18.6" r="1.4"/><path d="M3 3l18 18"/>',
    'tek': '<path d="M7.5 8.5h9a4 4 0 0 1 3.9 3.2l.9 4.4a2.3 2.3 0 0 1-4 1.9L15.6 16H8.4l-1.7 2a2.3 2.3 0 0 1-4-1.9l.9-4.4a4 4 0 0 1 3.9-3.2z"/><path d="M8 11v3M6.5 12.5h3"/>',
    'kod': '<rect x="3.5" y="3.5" width="7" height="7" rx="1.3"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.3"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.3"/><path d="M13.5 13.5h3v3h-3zM17.5 17.5h3v3h-3z"/>',
    'kilit': '<path d="M12 3l7.5 3v5.6c0 4.6-3.2 8-7.5 9.4-4.3-1.4-7.5-4.8-7.5-9.4V6z"/><path d="M8.8 12.2l2.3 2.3 4.2-4.6"/>',
    'sil': '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    'kvkk': '<path d="M6 3h9l3 3v15H6z"/><path d="M9 12l2 2 4-4"/>',
}
APPS = {'ebeveyn': ('img/ikon-moyo.svg', 'Moyo Ebeveyn'), 'oyun': ('img/ikon-oyun.png', 'Moyo Oyun'), 'mercek': ('img/ikon-mercek.svg', 'Moyo Mercek')}
chip = lambda k: f'<span><img src="{APPS[k][0]}" alt="" width="22" height="22">{APPS[k][1]}</span>'

# Neden Moyo: Akış (Mercek sitesindeki seçilen düzen)
AKIS = [
    ('ebeveyn', 'Siz kurarsınız', 'Yaşa uygun hazır rutinden seçer, saatini ve günlerini belirlersiniz.', '<i class="ok"></i>Sabah rutini · 6 adım'),
    ('oyun', 'Çocuğunuz oyunda yapar', 'Hatırlatmayı oyun yapar; rutindeki her adım onun için bir macera.', '<i class="ok"></i>Bugün 4 / 6 adım'),
    ('ebeveyn', 'Siz onaylarsınız', 'Bildirimle onaylar, günü ve haftayı tek yerden görürsünüz.', '<i class="ev"></i>1 adım onay bekliyor'),
]
akis = ''.join(f'<li><span class="nv-app"><img src="{APPS[k][0]}" alt="" width="28" height="28">{APPS[k][1]}</span><h3>{t}</h3><p>{p}</p><span class="nv-chip">{c}</span></li>' for k, t, p, c in AKIS)

# Nasıl çalışır: beş sekme, Moyo'nun gerçek ekranları (örnek veri)
ADIM = [
    ('Rutini kurun', 'Moyo Ebeveyn · telefonunuzda', 'Rutini bir kez kurun, her gün kendiliğinden gelsin', 'Hazır rutinlerden seçin ya da kendiniz yazın: "Sabah rutini · 6 adım" gibi. Saatini ve günlerini siz belirlersiniz; eşiniz de aynı aileden yönetir.', ['ebeveyn'], ('tel', 'img/moyo-ekle.webp', 'Moyo Ebeveyn: yeni rutin adımı ekleme ekranı')),
    ('Oyunda yapsın', 'Moyo Oyun · çocuğunuzun tabletinde', 'Hatırlatmayı oyun yapar', 'Çocuğunuz bugünkü rutinini oyunda adım adım görür; her adım onun için bir macera. Bitirince "Yaptım"a dokunur, dostu Okti ona eşlik eder.', ['oyun'], ('genis', 'img/c-oyun-liste.webp', 'Moyo Oyun: çocuğun bugünkü rutin adımları, oyunda macera olarak')),
    ('Onaylayın', 'Moyo Ebeveyn · bildirimle', 'Tek dokunuşla onaylayın', 'Adım bitince telefonunuza bildirim gelir; onaylarsınız, çocuğunuz ödülünü oyunda toplar. Ödülleri siz belirlersiniz.', ['ebeveyn', 'oyun'], ('tel', 'img/moyo-onay.webp', 'Moyo Ebeveyn: çocuğun tamamladığı adımı onaylama ekranı')),
    ('İlerlemeyi görün', 'Moyo Ebeveyn · Gelişim', 'Günü, haftayı ve ayı tek yerden görün', 'Hangi rutinin kolay, hangisinin zor geçtiğini görürsünüz; zorlanılan anı kısa bir davranış kaydıyla not edersiniz.', ['ebeveyn'], ('tel', 'img/moyo-gelisim.webp', 'Moyo Ebeveyn: çocuğun günlük ve haftalık ilerlemesi')),
    ('Uzmanınızla', 'İsteğe bağlı · Moyo Mercek', 'Dilerseniz uzmanınız da seanslar arasını görsün', 'Çalıştığınız uzman Moyo Mercek\'ten davet gönderir, siz onaylarsınız. Size kısa ebeveyn eğitimleri gönderir, davranış kayıtlarınıza bakar, rutin önerir; eklemek sizin kararınız. Paylaşımı istediğiniz an durdurursunuz.', ['ebeveyn', 'mercek'], ('kirp', 'img/c-ebeveyn-uzman.webp', 'Moyo Ebeveyn: uzmandan gelen eğitim ve rutin önerileri')),
]
tabs = ''.join(f'<button type="button" role="tab" id="nc-t{k}" aria-controls="nc-p{k}" aria-selected="{"true" if k == 0 else "false"}"{"" if k == 0 else " tabindex=\"-1\""}><b>{k + 1}</b>{a[0]}</button>' for k, a in enumerate(ADIM))
def gorsel(g):
    kind, src, alt = g
    if kind in ('tel', 'kirp'):
        return f'<figure class="tel{" kirp" if kind == "kirp" else ""}"><img src="{src}" alt="{e(alt)}" width="600" height="1184" loading="lazy"><figcaption>Örnek veri</figcaption></figure>'
    return f'<figure class="shot"><img src="{src}" alt="{e(alt)}" width="1200" height="554" loading="lazy"><figcaption>Örnek veri</figcaption></figure>'
pan = ''.join(f'''        <div class="nc-p" role="tabpanel" id="nc-p{k}" aria-labelledby="nc-t{k}"{"" if k == 0 else " hidden"}>
          <div class="nc-text"><p class="step-k">{a[1]}</p><h3>{a[2]}</h3><p>{a[3]}</p><p class="nc-apps">{"".join(chip(x) for x in a[4])}</p></div>
          <div class="nc-media">{gorsel(a[5])}</div>
        </div>
''' for k, a in enumerate(ADIM))

GUVEN = [('reklam', 'Reklam ve satın alma yok'), ('tek', 'Tek oyunculu, yabancı yok'), ('kod', 'Oyun, Moyo Ebeveyn\'deki kodla bağlanır'),
         ('kilit', 'Uzman paylaşımını siz açar, siz kapatırsınız'), ('sil', 'Hesabınızı ve verilerinizi silebilirsiniz'), ('kvkk', 'KVKK başvurusu uygulamada')]
guven = ''.join(f'<li>{SVG(I[k])}{t}</li>' for k, t in GUVEN)
ekosis = ''.join(f'<div class="eko"><img src="{APPS[k][0]}" alt="" width="48" height="48"><h3>{APPS[k][1]}</h3><p>{p}</p></div>' for k, p in [
    ('oyun', 'Çocuk için: rutin oyunda maceraya dönüşür.'), ('ebeveyn', 'Aile için: kurar, onaylar, ilerlemeyi görür.'), ('mercek', 'Uzman için, isteğe bağlı: seanslar arasını görür.')])
fiyat = ''.join(f'<div class="fk"><p class="fk-ad">{f[0]}</p><p class="fk-fiyat">{f[1]}</p><p>{f[2]}</p></div>' for f in E['fiyat'])
sss = ''.join(f'<details><summary>{q[0]}</summary><p>{q[1]}</p></details>' for q in E['sss'])
CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'

html = f'''<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Moyo · Rutinler oyunda, onay sizde</title>
<meta name="description" content="Moyo: çocuğunuzun günlük rutinleri oyunda maceraya dönüşür; siz kurar, onaylar, ilerlemeyi görürsünüz. Dilerseniz çalıştığınız uzmanı da dahil edersiniz.">
<meta name="theme-color" content="#2D294E">
<link rel="icon" href="img/ikon-moyo.svg" type="image/svg+xml">
<link rel="stylesheet" href="m/site.css">
<link rel="stylesheet" href="m/moyo.css">
<script>document.documentElement.classList.add('js');</script>
</head>
<body class="sayfa-moyo">
<a class="skip" href="#main">Ana içeriğe geç</a>
<header class="top" id="top">
  <div class="wrap nav">
    <a class="logo" href="#top" aria-label="Moyo ana sayfa">{LOGO}</a>
    <div class="menu" id="menu">
      <nav aria-label="Ana menü"><ul>
        <li><a href="#nasil">Nasıl çalışır</a></li><li><a href="#guvenlik">Güvenlik</a></li><li><a href="#fiyat">Fiyat</a></li><li><a href="#sss">SSS</a></li><li><a href="{MERCEK}">Uzman mısınız?</a></li>
      </ul></nav>
      <div class="acts"><a class="pill pill-line" href="{APP}#giris">Giriş</a><a class="pill pill-cta" href="{APP}#kayit">Ücretsiz deneyin</a></div>
    </div>
    <a class="pill pill-cta nav-cta" href="{APP}#kayit">Ücretsiz deneyin</a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" aria-label="Menü">
      <svg class="bars" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <svg class="x" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </button>
  </div>
</header>

<main id="main">
  <section class="hero" aria-labelledby="h-hero">
    <div class="wrap">
      <p class="eyebrow">Ebeveynler için</p>
      <h1 id="h-hero">{E["h1"]}</h1>
      <p class="sub">{E["alt"]}</p>
      <div class="actions"><a class="btn btn-cta" href="{APP}#kayit">Ücretsiz deneyin</a><a class="btn btn-line" href="#nasil">Nasıl çalışır?</a></div>
      <p class="fine">{E["fiyat_not"].replace(" — TL", "")}</p>
    </div>
    <div class="wrap wide">
      <div class="hero-media mh" role="img" aria-label="Çocuğun oyununda bugünkü rutin adımları; önünde ebeveynin telefonunda onay ekranı. Örnek veri.">
        <img class="mh-oyun" src="img/c-oyun-onay.webp" alt="" width="1200" height="554">
        <img class="mh-tel" src="img/moyo-onay.webp" alt="" width="600" height="1184">
      </div>
    </div>
    <div class="wrap">
      <ul class="trust" aria-label="Temel ilkeler">{"".join(f"<li>{CHECK}{x}</li>" for x in E["isaretler"])}<li>{CHECK}Tek oyunculu oyun</li></ul>
    </div>
  </section>

  <section class="sec sec-white" id="degerler" aria-labelledby="h-deger">
    <div class="wrap">
      <div class="head"><p class="eyebrow">Neden Moyo</p><h2 id="h-deger">Hatırlatma oyundan, onay sizden.</h2></div>
      <ol class="nv nv-akis">{akis}</ol>
    </div>
  </section>

  <section class="sec sec-soft" id="nasil" aria-labelledby="h-nasil">
    <div class="wrap">
      <div class="head"><p class="eyebrow">Nasıl çalışır</p><h2 id="h-nasil">Moyo nasıl çalışır?</h2></div>
      <div class="nc" data-nc>
        <div class="nc-tabs" role="tablist" aria-label="Moyo'nun adımları">{tabs}</div>
{pan}      </div>
    </div>
  </section>

  <section class="sec sec-white" id="guvenlik" aria-labelledby="h-guv">
    <div class="wrap">
      <div class="head"><p class="eyebrow">Güvenlik</p><h2 id="h-guv">Çocuğun verisi ailenindir.</h2></div>
      <ul class="tiles">{guven}</ul>
      <nav class="docs" aria-label="Yasal metinler"><a href="/yasal/gizlilik">Gizlilik Politikası</a><a href="/yasal/kosullar-parentapp">Kullanım Koşulları</a><a href="/yasal/kvkk-basvuru">KVKK başvurusu</a></nav>
    </div>
  </section>

  <section class="sec sec-dark" aria-labelledby="h-eko">
    <div class="wrap">
      <div class="head"><p class="eyebrow">Moyo ekosistemi</p><h2 id="h-eko">Üç uygulama, tek rutin.</h2><p class="intro">Moyo Ebeveyn ve Moyo Oyun birlikte çalışır; dilerseniz uzmanınız Moyo Mercek ile katılır.</p></div>
      <div class="ekos">{ekosis}</div>
      <p class="eko-link"><a href="/">Ekosistemi görün →</a></p>
    </div>
  </section>

  <section class="sec sec-soft" id="fiyat" aria-labelledby="h-fiyat">
    <div class="wrap">
      <div class="head"><p class="eyebrow">Fiyat</p><h2 id="h-fiyat">Oyun ücretsiz, Moyo Ebeveyn 7 gün ücretsiz.</h2></div>
      <div class="fks">{fiyat}</div>
    </div>
  </section>

  <section class="sec sec-white" id="sss" aria-labelledby="h-sss">
    <div class="wrap">
      <div class="head"><p class="eyebrow">Sık sorulanlar</p><h2 id="h-sss">Kısaca</h2></div>
      <div class="faq">{sss}</div>
    </div>
  </section>

  <section class="sec sec-soft" aria-labelledby="h-son">
    <div class="wrap">
      <div class="closing">
        <h2 id="h-son">Çocuğunuzun günlük rutinine bugün başlayın</h2>
        <div class="actions"><a class="btn btn-cta" href="{APP}#kayit">Ücretsiz deneyin</a><a class="btn btn-line" href="{APP}#giris">Giriş</a></div>
        <p class="fine">{E["fiyat_not"].replace(" — TL", "")}</p>
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <div class="about"><a class="logo" href="#top" aria-label="Moyo">{LOGO}</a><p>Çocuk, aile ve uzman için rutin platformu.</p></div>
    <div><h2 class="fh">Ürün</h2><ul><li><a href="#nasil">Nasıl çalışır</a></li><li><a href="#fiyat">Fiyat</a></li><li><a href="#sss">Sık sorulanlar</a></li><li><a href="/">Moyo ekosistemi</a></li></ul></div>
    <div><h2 class="fh">Hesap</h2><ul><li><a href="{APP}#giris">Giriş yap</a></li><li><a href="{APP}#kayit">Ücretsiz deneyin</a></li><li><a href="{MERCEK}">Uzmanlar için</a></li></ul></div>
    <div class="legalcol"><h2 class="fh">Yasal</h2><ul><li><a href="/yasal/gizlilik">Gizlilik Politikası</a></li><li><a href="/yasal/kosullar-parentapp">Kullanım Koşulları</a></li><li><a href="/yasal/kvkk-basvuru">KVKK başvurusu</a></li><li><a href="/destek">Destek</a></li></ul></div>
    <div class="legal"><span>© 2026 Moyo</span><span>Ekranlardaki adlar örnektir. Bu sayfa çerez, reklam pikseli ya da analiz aracı kullanmaz.</span></div>
  </div>
</footer>
<script src="m/site.js"></script>
</body>
</html>
'''
open('ebeveyn.html', 'w').write(html); print('ok ebeveyn.html')
