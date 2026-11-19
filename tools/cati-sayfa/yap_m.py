# Moyo (ebeveyn) tanıtım sayfası, Moyo Mercek sitesinin düzeniyle (kullanıcı isteği 14 Kasım 2026: "Moyo Mercek landing
# akışı/anlatımı Moyo app'i için uygula; app'in görsellerini kullan"). Çatı sayfa ekosistemi anlatır, bu sayfa ebeveynin ürününü.
# Tasarım dili m/site.css (Mercek sitesinin kopyası, dokunulmaz) + m/moyo.css; sayfaya özel davranış m/moyo.js.
# Çıktı: ebeveyn.html (göreli yollar; disa_aktar.py canlıya taşır). Fiyat sayfası yap_f.py (üst menü, alt bilgi ve <head> buradan).
#
# 18 Kasım 2026 turu (kullanıcı geri bildirimi): açılışta küçük alt satır + tek cümlelik deneme notu + kısa güven maddeleri,
# açılış görselinde oyun ↔ ebeveyn uygulaması ilişkisini anlatan dört vuruşluk anlatım, "Nasıl çalışır" parmakla kaydırılır,
# "Neden Moyo" üç "neden" kartı, Güvenlik ve Fiyat bölümleri sayfadan çıktı (guven.html, ebeveyn-fiyat.html), yeni alt bilgi.
# Alternatifler önizleme sözleşmesiyle (oniz.js): alt · anim · nasil · neden. Her [data-var] parçası kendi etiketinden
# bir tane daha içermez (span içinde span, figure içinde figure yok): canlıya aktarırken seçilmeyenler etiketiyle kesilebilir.
import json, re, html as H
E = json.load(open('e-metin.json'))
e = H.escape
LOGO = open('inline-moyo-ebeveyn.svg').read().strip()   # kilit: "moyo" yazısı + ince "Ebeveyn" (tools/logo/gen.py; yazı 18 Kasım 2026 seçenek 6)
LOGO = re.sub(r' role="img" aria-label="[^"]*"', ' aria-hidden="true" focusable="false"', LOGO).replace(' xmlns="http://www.w3.org/2000/svg"', '')
APP = 'https://ebeveyn.moyoapp.com.tr/'
MERCEK = 'https://mercek.moyoapp.com.tr/'
KOK = 'https://moyoapp.com.tr'          # canlı adres (canonical ve og:url)
ANA, FIYAT = 'ebeveyn.html', 'ebeveyn-fiyat.html'   # önizlemede göreli; canlıda /ebeveyn/ ve /ebeveyn/fiyat/
HAKKIMIZDA, GUVEN = 'hakkimizda.html', 'guven.html'   # kurumsal sayfalar (başka pencere kurar); canlıda /hakkimizda/ ve /guven/
SVG = lambda d: f'<svg viewBox="0 0 24 24" aria-hidden="true">{d}</svg>'
I = {
    'rutin': '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M8 3.2v3.4M16 3.2v3.4M4 10h16M9 15l2.1 2.1 4-4.2"/>',
    'takip': '<path d="M4 19.5h16"/><path d="M4.5 15.5l4.6-4.6 3.6 2.9L19.5 7"/><path d="M15.4 7h4.1v4.1"/>',
    'uzman': '<circle cx="9" cy="8.4" r="3.1"/><path d="M3.4 19.2c.6-3 2.8-4.7 5.6-4.7s5 1.7 5.6 4.7"/><circle cx="17.2" cy="9.6" r="2.3"/><path d="M16.6 14.6c2.2.2 3.6 1.6 4 4"/>',
}
APPS = {'ebeveyn': ('img/ikon-moyo.svg', 'Moyo Ebeveyn'), 'oyun': ('img/ikon-oyun.png', 'Moyo Oyun'), 'mercek': ('img/ikon-mercek.svg', 'Moyo Uzman')}
chip = lambda k: f'<span><img src="{APPS[k][0]}" alt="" width="22" height="22">{APPS[k][1]}</span>'
CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'


def var(k, d, sarmal=lambda v, t: t):
    """Önizleme alternatifi: aynı yerde duran <span data-var="k:değer"> kardeşleri; önerilen dışındakiler hidden."""
    return ''.join(f'<span data-var="{k}:{v}"{"" if v == ONERI[k] else " hidden"}>{sarmal(v, t)}</span>' for v, t in d.items())


# Önizleme alternatifleri (oniz.js sözleşmesi; yalnız önizlemede, canlıya seçilen kalır)
ONIZ = [
    {'k': 'alt', 'ad': 'Açılış alt satırı', 'hedef': '.hero', 'oneri': 'a',
     'sec': [['a', 'Kurun, kaydedin, görün'], ['b', 'Oyunda yapar, siz kaydedersiniz'], ['c', 'Tek kısa cümle']]},
    {'k': 'anim', 'ad': 'Açılış görseli', 'hedef': '.hero', 'oneri': 'a',
     'sec': [['a', 'Dört adımlı anlatım'], ['b', 'İki ok, iki etiket'], ['c', 'Durağan görsel']]},
    {'k': 'nasil', 'ad': '"Nasıl çalışır" başlığı', 'hedef': '#nasil', 'oneri': 'a',
     'sec': [['a', 'Rutinden takibe, beş adım.'], ['b', 'Siz kurarsınız, çocuğunuz yapar…'], ['c', 'Tek başlık: Nasıl çalışır?']]},
    {'k': 'neden', 'ad': '"Neden Moyo" başlığı', 'hedef': '#degerler', 'oneri': 'a',
     'sec': [['a', 'Tahmin etmeyin, takip edin.'], ['b', 'Evde olanı görün…'], ['c', 'Rutin oyunda kurulur…']]},
]
ONERI = {g['k']: g['oneri'] for g in ONIZ}


# ---------- Ortak parçalar (fiyat sayfası da kullanır) ----------
def bas(baslik, aciklama, yol, oniz=None):
    """<head>: başlık, açıklama, Open Graph, stiller. yol: canlıdaki yol ('/ebeveyn/')."""
    assert len(aciklama) <= 155, f'meta description {len(aciklama)} karakter (en çok 155)'
    on = ''
    if oniz:
        on = ('\n<script type="application/json" id="oniz-gruplar">' + json.dumps(oniz, ensure_ascii=False, separators=(',', ':')) + '</script>'
              '\n<script src="oniz.js"></script>')
    return f'''<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(baslik)}</title>
<meta name="description" content="{e(aciklama)}">
<link rel="canonical" href="{KOK}{yol}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Moyo">
<meta property="og:locale" content="tr_TR">
<meta property="og:title" content="{e(baslik)}">
<meta property="og:description" content="{e(aciklama)}">
<meta property="og:url" content="{KOK}{yol}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#2D294E">
<link rel="icon" href="img/favicon-moyo.svg" type="image/svg+xml">
<link rel="stylesheet" href="m/site.css">
<link rel="stylesheet" href="m/moyo.css">
<script>document.documentElement.classList.add('js');</script>{on}
</head>'''


def ust(sayfa):
    """Üst menü. sayfa: 'ana' (bölümler aynı sayfada) ya da 'fiyat'."""
    a = '' if sayfa == 'ana' else ANA
    simdi = ' aria-current="page"' if sayfa == 'fiyat' else ''
    return f'''<a class="skip" href="#main">Ana içeriğe geç</a>
<header class="top" id="top">
  <div class="wrap nav">
    <a class="logo" href="{a or "#top"}" aria-label="Moyo Ebeveyn ana sayfa">{LOGO}</a>
    <div class="menu" id="menu">
      <nav aria-label="Ana menü"><ul>
        <li><a href="{a}#nasil">Nasıl çalışır</a></li><li><a href="{a}#degerler">Neden Moyo</a></li><li><a href="{FIYAT}"{simdi}>Fiyat</a></li><li><a href="{a}#sss">SSS</a></li><li><a href="{MERCEK}">Uzman mısınız?</a></li>
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
'''


def alt(sayfa):
    """Alt bilgi: logo + açılış başlığı, sütunlar Ürün · Hesap · Kurumsal · Yasal."""
    a = '' if sayfa == 'ana' else ANA
    simdi = ' aria-current="page"' if sayfa == 'fiyat' else ''
    return f'''<footer>
  <div class="wrap">
    <div class="about"><a class="logo" href="{a or "#top"}" aria-label="Moyo Ebeveyn ana sayfa">{LOGO}</a><p>{E["h1"]}.</p></div>
    <div><h2 class="fh">Ürün</h2><ul><li><a href="{a}#nasil">Nasıl çalışır</a></li><li><a href="{FIYAT}"{simdi}>Fiyat</a></li><li><a href="{a}#sss">Sık sorulanlar</a></li><li><a href="/">Moyo ekosistemi</a></li></ul></div>
    <div><h2 class="fh">Hesap</h2><ul><li><a href="{APP}#giris">Giriş yap</a></li><li><a href="{APP}#kayit">Ücretsiz deneyin</a></li><li><a href="{MERCEK}">Uzmanlar için</a></li></ul></div>
    <div><h2 class="fh">Kurumsal</h2><ul><li><a href="{HAKKIMIZDA}">Hakkımızda</a></li><li><a href="{GUVEN}">Güvenlik ve gizlilik</a></li><li><a href="/destek">Destek</a></li></ul></div>
    <div><h2 class="fh">Yasal</h2><ul><li><a href="/yasal/gizlilik">Gizlilik Politikası</a></li><li><a href="/yasal/kosullar-parentapp">Kullanım Koşulları</a></li><li><a href="/yasal/kvkk-basvuru">KVKK başvurusu</a></li></ul></div>
    <div class="legal"><span>© 2026 Moyo</span><span>Ekranlardaki adlar örnektir. Bu sayfa çerez, reklam pikseli ya da analiz aracı kullanmaz.</span></div>
  </div>
</footer>
<script src="m/site.js"></script>
<script src="m/moyo.js"></script>
</body>
</html>
'''


# ---------- Açılış görseli: oyun (Moyo Oyun) ile ebeveyn uygulaması (Moyo Ebeveyn) arasındaki ilişki ----------
# Sahne iki ölçüde çizilir: geniş (620×462: oyun solda, telefon sağda oyunun sağ panelini örter; yollar üst ve alt boşlukta)
# ve dar (350×536, ≤ 700 px: oyun üstte, telefon altta ortada; yollar telefonun iki yanında). Yollar cihazların ALTINDA
# çizilir: yalnız koyu zemindeki parçası görünür. y1/y2 çipin gittiği tam yol (telefondaki satır → oyundaki satır;
# "Yaptım" düğmesi → "Onayla" düğmesi), s1/s2 durağan hâlde ve "iki ok" seçeneğinde görünen ok uçlu yaylar.
YOL = {
    'genis': ('0 0 620 462',
              'M516 259C520 190 461 111 412 70Q313-12 215 105C176 152 158 180 152 204',
              'M376 195C376 270 301 349 322 387Q352 440 412 424C442 416 520 424 566 424',
              'M412 84Q280 30 152 99', 'M150 390Q280 427 402 411'),
    'dar': ('0 0 350 536',
            'M175 336C150 336 116 335 91 318Q50 290 64 194C69 160 84 120 88 89',
            'M216 84C216 120 280 156 286 194Q300 290 259 318C234 335 216 420 216 472',
            'M92 300Q46 262 58 201', 'M292 198Q304 262 266 300'),
}


def yollar(on, cip):
    out = ''
    for boy, (vb, y1, y2, s1, s2) in YOL.items():
        ok = f'ok-{on}{boy[0]}'
        hareket = f'<path class="y y1" d="{y1}"/><path class="y y2" d="{y2}"/>' if cip else ''
        out += (f'<svg class="ma-yol {boy}" viewBox="{vb}" preserveAspectRatio="none" aria-hidden="true" focusable="false">'
                f'<defs><marker id="{ok}" viewBox="0 0 10 10" refX="7.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto"><path class="ok" d="M2 1.6 8 5 2 8.4"/></marker></defs>'
                f'{hareket}<path class="s s1" d="{s1}" marker-end="url(#{ok})"/><path class="s s2" d="{s2}" marker-end="url(#{ok})"/></svg>')
    return out


def etiketler():
    return ''.join(f'<span class="ma-etk {c}"><img src="{APPS[k][0]}" alt="" width="20" height="20">{APPS[k][1]}</span>' for c, k in (('oyun', 'oyun'), ('tel', 'ebeveyn')))


A = E['anim']
OYUN = lambda src, ek='': f'<img{ek} src="{src}" alt="" width="1200" height="554">'
TEL = lambda src, ek='': f'<img{ek} src="{src}" alt="" width="600" height="1298">'
DUR = ('<svg class="i-pause" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.6" height="12" rx="1"/><rect x="9.4" y="2" width="3.6" height="12" rx="1"/></svg>'
       '<svg class="i-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.2v11.6c0 .8.9 1.3 1.6.8l8.6-5.8c.6-.4.6-1.2 0-1.6L5.6 1.4C4.9.9 4 1.4 4 2.2z"/></svg>')
TIK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 8.4l3 3 6.4-6.8"/></svg>'
adimlar = ''.join(f'<li><button type="button" data-b="{k}"><b>{k + 1}</b>{e(t)}</button></li>' for k, t in enumerate(A['adimlar']))
# a · dört vuruş: ① telefonda rutin ② adım oyuna gider ③ çocuk "Yaptım"a dokunur ④ onay telefona gelir, oyunda taş görünür.
# Ekranlar gerçek: Rutinler ve inceleme (Moyo Ebeveyn), bugünün maceraları ve "Taş geldi!" (Moyo Oyun); üstlerine yalnız çip, halka ve ok çizilir.
# JS yoksa ya da hareket azaltma açıksa "duruk" hâl kalır: dört numara, iki ok, altında dört satırlık anlatım.
anim_a = f'''<figure class="ma duruk" data-var="anim:a" data-ma>
          <div class="ma-kutu">
            <div class="ma-sahne" role="img" aria-label="{e(A["anlatim"])}">
              {yollar("a", True)}
              {etiketler()}
              <div class="ma-oyun">{OYUN("img/c-oyun-liste.webp")}{OYUN("img/c-oyun-odul.webp", ' class="ust"')}<i class="ma-halka h-satir"></i><i class="ma-halka h-yaptim" data-no="3"></i><i class="ma-tik">{TIK}</i></div>
              <div class="ma-tel"><div class="ma-ekran">{TEL("img/e-rutinler.webp")}{TEL("img/e-onay.webp", ' class="ust"')}<i class="ma-halka h-rutin" data-no="1"></i><i class="ma-halka h-onay"></i></div></div>
              <b class="ma-no n2">2</b><b class="ma-no n4">4</b>
              <span class="ma-cip"><span class="c1">{e(A["cip"])}</span><span class="c2">{TIK}{e(A["cip_donus"])}</span></span>
            </div>
            <button type="button" class="ma-dur" data-state="paused" aria-label="Oynat" hidden>{DUR}</button>
          </div>
          <ol class="ma-adim" aria-label="Moyo Oyun ile Moyo Ebeveyn nasıl birlikte çalışır">{adimlar}</ol>
        </figure>'''
# b · durağan iki ekran, iki yönde akan kesikli bağ ve iki etiket
anim_b = f'''<figure class="ma mb" data-var="anim:b" hidden>
          <div class="ma-kutu">
            <div class="ma-sahne" role="img" aria-label="{e(A["anlatim"])}">
              {yollar("b", False)}
              {etiketler()}
              <div class="ma-oyun">{OYUN("img/c-oyun-onay.webp", ' loading="lazy"')}</div>
              <div class="ma-tel"><div class="ma-ekran">{TEL("img/e-onay.webp", ' loading="lazy"')}</div></div>
              <span class="mb-etk e1">{e(A["git"])}</span><span class="mb-etk e2">{e(A["gel"])}</span>
            </div>
          </div>
        </figure>'''
# c · bugünkü durağan düzen (17 Kasım): oyunun ekranı, önünde ebeveynin telefonu
anim_c = f'''<figure class="mc" data-var="anim:c" hidden>
          <div class="mh" role="img" aria-label="Çocuğun oyununda bugünkü rutin adımları; önünde ebeveynin telefonunda onay ekranı. Örnek veri.">
            <img class="mh-oyun" src="img/c-oyun-onay.webp" alt="" width="1200" height="554" loading="lazy">
            <img class="mh-tel" src="img/e-onay.webp" alt="" width="600" height="1298" loading="lazy">
          </div>
        </figure>'''

# ---------- Nasıl çalışır: beş sekme, Moyo'nun gerçek ekranları (örnek veri) ----------
ADIM = [
    ('Rutini kurun', 'Moyo Ebeveyn · telefonunuzda', 'Rutini bir kez kurun, her gün kendiliğinden gelsin', 'Hazır rutinlerden seçin ya da kendiniz yazın: "Sabah rutini · 6 adım" gibi. Saatini ve günlerini siz belirlersiniz; eşiniz de aynı aileden yönetir.', ['ebeveyn'], ('tel', 'img/moyo-ekle.webp', 'Moyo Ebeveyn: yeni rutin adımı ekleme ekranı')),
    ('Oyunda yapsın', 'Moyo Oyun · çocuğunuzun tabletinde', 'Hatırlatmayı oyun yapar', 'Çocuğunuz bugünkü rutinini oyunda adım adım görür; her adım onun için bir macera. Bitirince "Yaptım"a dokunur, dostu Okti ona eşlik eder.', ['oyun'], ('genis', 'img/c-oyun-liste.webp', 'Moyo Oyun: çocuğun bugünkü rutin adımları, oyunda macera olarak')),
    ('Onaylayın', 'Moyo Ebeveyn · bildirimle', 'Tek dokunuşla onaylayın', 'Adım bitince telefonunuza bildirim gelir; onaylarsınız, çocuğunuz ödülünü oyunda toplar. Ödülleri siz belirlersiniz.', ['ebeveyn', 'oyun'], ('tel', 'img/moyo-onay.webp', 'Moyo Ebeveyn: çocuğun tamamladığı adımı onaylama ekranı')),
    ('İlerlemeyi görün', 'Moyo Ebeveyn · Gelişim', 'Günü, haftayı ve ayı tek yerden görün', 'Hangi rutinin kolay, hangisinin zor geçtiğini görürsünüz; zorlandığı anı ve verdiği tepkiyi kısa bir davranış kaydıyla not edersiniz.', ['ebeveyn'], ('tel', 'img/moyo-gelisim.webp', 'Moyo Ebeveyn: çocuğun günlük ve haftalık ilerlemesi')),
    ('Uzmanınızla', 'İsteğe bağlı · Moyo Uzman', 'Dilerseniz uzmanınızı dahil edin', 'Çalıştığınız uzman Moyo Uzman\'dan davet gönderir, siz onaylarsınız. Uzmanınız yalnız paylaştığınız çocuğun rutin ve davranış kayıtlarını görür; size kısa ebeveyn eğitimleri gönderir, rutin önerir. Eklemek sizin kararınız; paylaşımı dilediğiniz an durdurursunuz.', ['ebeveyn', 'mercek'], ('tel', 'img/moyo-uzman.webp', 'Moyo Ebeveyn: uzmandan gelen eğitim ve rutin önerileri')),
]
tabs = ''.join(f'<button type="button" role="tab" id="nc-t{k}" aria-controls="nc-p{k}" aria-selected="{"true" if k == 0 else "false"}"{"" if k == 0 else " tabindex=\"-1\""}><b>{k + 1}</b><span>{a[0]}</span></button>' for k, a in enumerate(ADIM))
def gorsel(g):
    kind, src, alt_ = g
    if kind in ('tel', 'kirp'):
        return f'<figure class="tel{" kirp" if kind == "kirp" else ""}"><img src="{src}" alt="{e(alt_)}" width="600" height="1298" loading="lazy"><figcaption>Örnek veri</figcaption></figure>'
    return f'<figure class="shot"><img src="{src}" alt="{e(alt_)}" width="1200" height="554" loading="lazy"><figcaption>Örnek veri</figcaption></figure>'
pan = ''.join(f'''        <div class="nc-p" role="tabpanel" id="nc-p{k}" aria-labelledby="nc-t{k}"{"" if k == 0 else " hidden"}>
          <div class="nc-text"><p class="step-k">{a[1]}</p><h3>{a[2]}</h3><p>{a[3]}</p><p class="nc-apps">{"".join(chip(x) for x in a[4])}</p></div>
          <div class="nc-media">{gorsel(a[5])}</div>
        </div>
''' for k, a in enumerate(ADIM))

# ---------- Neden Moyo: üç "neden" kartı ----------
neden = ''.join(f'<li><span class="ic">{SVG(I[k])}</span>{f"<span class=\"nd-rozet\">{r}</span>" if r else ""}<h3>{t}</h3><p>{p}</p></li>' for k, t, p, r in E['neden_kart'])
ekosis = ''.join(f'<div class="eko"><img src="{APPS[k][0]}" alt="" width="48" height="48"><h3>{APPS[k][1]}</h3><p>{p}</p></div>' for k, p in [
    ('oyun', 'Çocuk için: rutin oyunda maceraya dönüşür.'), ('ebeveyn', 'Aile için: kurar, onaylar, kaydeder, ilerlemeyi görür.'), ('mercek', 'Uzman için, isteğe bağlı: evdeki kayıtları görür, rutin önerir.')])
sss = ''.join(f'<details><summary>{q[0]}</summary><p>{q[1]}</p></details>' for q in E['sss'])

html = f'''{bas(E["baslik"], E["aciklama"], "/ebeveyn/", ONIZ)}
<body class="sayfa-moyo">
{ust("ana")}
<main id="main">
  <section class="hero" aria-labelledby="h-hero">
    <div class="wrap wide mhero">
      <div class="mhero-yazi">
        <p class="eyebrow">Ebeveynler için</p>
        <h1 id="h-hero">{E["h1"]}</h1>
        <p class="sub">{var("alt", E["alt"])}</p>
        <div class="actions"><a class="btn btn-cta" href="{APP}#kayit">Ücretsiz deneyin</a><a class="btn btn-line" href="#nasil">Nasıl çalışır?</a></div>
        <p class="fine">{E["ince"]}</p>
        <ul class="trust" aria-label="Temel ilkeler">{"".join(f"<li>{CHECK}{x}</li>" for x in E["isaretler"])}</ul>
      </div>
      <div class="hero-media mhv">
        {anim_a}
        {anim_b}
        {anim_c}
      </div>
    </div>
  </section>

  <section class="sec sec-white" id="nasil" aria-labelledby="h-nasil">
    <div class="wrap">
      <div class="head"><p class="eyebrow" data-var="nasil:a">Nasıl çalışır</p><p class="eyebrow" data-var="nasil:b" hidden>Nasıl çalışır</p><h2 id="h-nasil">{var("nasil", E["nasil"])}</h2></div>
      <div class="nc" data-nc>
        <div class="nc-tabs" role="tablist" aria-label="Moyo'nun adımları">{tabs}</div>
{pan}      </div>
    </div>
  </section>

  <section class="sec sec-soft" id="degerler" aria-labelledby="h-deger">
    <div class="wrap">
      <div class="head"><p class="eyebrow">Neden Moyo</p><h2 id="h-deger">{var("neden", E["neden"])}</h2></div>
      <ul class="nd">{neden}</ul>
      <p class="nd-bag"><a href="{HAKKIMIZDA}">{E["neden_bag"]} <span aria-hidden="true">→</span></a></p>
    </div>
  </section>

  <section class="sec sec-dark" aria-labelledby="h-eko">
    <div class="wrap">
      <div class="head"><p class="eyebrow">Moyo ekosistemi</p><h2 id="h-eko">Üç uygulama, tek rutin.</h2><p class="intro">Moyo Ebeveyn ve Moyo Oyun birlikte çalışır; dilerseniz uzmanınız Moyo Uzman ile katılır.</p></div>
      <div class="ekos">{ekosis}</div>
      <p class="eko-link"><a href="/">Ekosistemi görün →</a></p>
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
        <h2 id="h-son">{E["kapanis"]}</h2>
        <div class="actions"><a class="btn btn-cta" href="{APP}#kayit">Ücretsiz deneyin</a><a class="btn btn-line" href="{APP}#giris">Giriş</a></div>
        <p class="fine">{E["ince"]}</p>
      </div>
    </div>
  </section>
</main>

{alt("ana")}'''

if __name__ == '__main__':
    assert 'istediğiniz' not in html and 'seanslar aras' not in html and '—' not in html, 'yasaklı ifade ya da uzun tire kaldı'
    open('ebeveyn.html', 'w').write(html); print('ok ebeveyn.html')
