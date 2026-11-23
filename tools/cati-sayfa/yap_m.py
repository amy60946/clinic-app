# Moyo (ebeveyn) tanıtım sayfası, Moyo Mercek sitesinin düzeniyle (kullanıcı isteği 14 Kasım 2026: "Moyo Mercek landing
# akışı/anlatımı Moyo app'i için uygula; app'in görsellerini kullan"). Çatı sayfa ekosistemi anlatır, bu sayfa ebeveynin ürününü.
# Tasarım dili m/site.css (Mercek sitesinin kopyası, dokunulmaz) + m/moyo.css; sayfaya özel davranış m/moyo.js.
# Çıktı: ebeveyn.html (göreli yollar; disa_aktar.py canlıya taşır). Fiyat sayfası yap_f.py (üst menü, alt bilgi ve <head> buradan).
#
# 18 Kasım 2026 turu (kullanıcı geri bildirimi): açılışta küçük alt satır + tek cümlelik deneme notu + kısa güven maddeleri,
# açılış görselinde oyun ↔ ebeveyn uygulaması ilişkisini anlatan dört vuruşluk anlatım, "Nasıl çalışır" parmakla kaydırılır,
# "Neden Moyo" üç "neden" kartı, Güvenlik ve Fiyat bölümleri sayfadan çıktı (guven.html, ebeveyn-fiyat.html), yeni alt bilgi.
# Alternatifler önizleme sözleşmesiyle (oniz.js; tur 4'te nlead · ndzn). Her [data-var] parçası kendi etiketinden
# bir tane daha içermez (span içinde span, figure içinde figure yok): canlıya aktarırken seçilmeyenler etiketiyle kesilebilir.
#
# 19 Kasım 2026, tur 2 (kullanıcının yanıtları): "Nasıl çalışır" başlığı a ile sabitlendi ("Rutinden takibe, beş adım.");
# beş adım: planla · yapsın, oyunda işaretlesin (onay bu adımda) · zor anı kaydet (yeni ekran img/e-davranis.webp) · ilerleme ·
# uzman. "Neden Moyo" yeni grup: üç başlık + üç kart takımı, başlığın altında sabit giriş cümlesi. Metinler yalnız e-metin.json'da.
# 2. adımın oyun ekranı açılış görseline göre değişir (anim a: c-oyun-onay; b ve c: c-oyun-liste), aynı ekran sayfada iki kez görünmez.
#
# 19 Kasım 2026, tur 3 (kullanıcının yanıtları): "alt" a ve "anim" a sabitlendi (öteki seçeneklerin metni, işareti, stili ve betiği
# silindi); bu sayfada "zor an" yerine "zorlanılan an"; telefonun altındaki "Moyo Ebeveyn" etiketi metni taşırıyordu (m/moyo.css).
# "Neden Moyo" başlığı ve kartları a ile sabitlendi; giriş cümlesi (nlead) ve bölümün tasarımı (ndzn: a akış bandı · b evde → uzman
# paneli · c üst kenarı renkli kartlar) önizlemede seçilir. Tasarımlar çatı sayfanın renkli 1-2-3 kartlarına benzemez (tur 3 kuralı).
#
# 19 Kasım 2026, tur 4 (kullanıcının yanıtları): "h1" a ile sabitlendi (açılış başlığı ve alt bilgideki slogan; grup ve b metni silindi).
# "Zorlanılan an" yerine "zorlandığı an" (cümlede "çocuğunuzun zorlandığı an"; kısa etikette "Zorlandığı anı kaydedin"). "Neden Moyo":
# giriş cümlesi (nlead) rutini ve notu NEDEN tuttuğunuzu söyler, "kayıt" ses kaydı gibi okunmaz ("not edersiniz", "yazılı not"); bölümün
# tasarımı (ndzn) her nedeni ilgili ekranın yakın çekimiyle gösterir: a üç yakın çekim · b tek telefon, kaydırdıkça bir işlevden ötekine
# yakınlaşır (m/moyo.js; hareket azaltmada ve betiksiz üç sabit kırpım) · c liste ve yanında küçük kırpım. Kırpımlar gerçek ekranlardan
# (img/e-nz-*.webp, 780 × 1688 = 390 × 844 nokta ×2; tools/cati-sayfa/cek düzeniyle çekildi), yalnızca CSS ile kırpılır (NZ_EKRAN).
#
# 19 Kasım 2026, tur 5 (kullanıcının yanıtları): "nlead" a ve "ndzn" a sabitlendi (gruplar, b ve c seçeneklerinin metni, işareti, stili ve
# betiği silindi; sayfada önizleme grubu kalmadı). Giriş kısaldı (iki "neden" ve faydası, iki kısa cümle). "Üç yakın çekim" yeniden: ekranlar
# kırpılmaz; her neden kendi panelinde, üstte küçük büyük harfli etiket, başlık ve tek cümle, altta telefonda uygulamanın bütün ekranı (panelin
# alt kenarı yalnızca telefonun altını keser) ve ekranın vurgulanan şeridi aynı yerde ~1,18 kat büyük, telefonun iki kenarından taşan kart
# olarak (kullanıcının iki örnek görselindeki vurgu biçimi; NZ). Kart aynı görselden kırpılır (CSS), ekrana girince bir kez yerine oturur.
import os, json, re, html as H
E = json.load(open('e-metin.json'))
e = H.escape
LOGO = open('inline-moyo-ebeveyn.svg').read().strip()   # kilit: "moyo" yazısı + ince "Ebeveyn" (tools/logo/gen.py; yazı 18 Kasım 2026 seçenek 6)
LOGO = re.sub(r' role="img" aria-label="[^"]*"', ' aria-hidden="true" focusable="false"', LOGO).replace(' xmlns="http://www.w3.org/2000/svg"', '')
APP = 'https://ebeveyn.moyoapp.com.tr/'
MERCEK = 'https://mercek.moyoapp.com.tr/'
KOK = 'https://moyoapp.com.tr'          # canlı adres (canonical ve og:url)
ANA, FIYAT = 'ebeveyn.html', 'ebeveyn-fiyat.html'
SITE, EKO = 'https://moyoapp.com.tr/', 'c.html'   # destek / yasal ve ekosistem; disa_aktar.py canlı yollara çevirir   # önizlemede göreli; canlıda /ebeveyn/ ve /ebeveyn/fiyat/
HAKKIMIZDA, GUVEN = 'hakkimizda.html', 'guven.html'   # kurumsal sayfalar (başka pencere kurar); canlıda /hakkimizda/ ve /guven/
APPS = {'ebeveyn': ('img/ikon-moyo.svg', 'Moyo Ebeveyn'), 'oyun': ('img/ikon-oyun.png', 'Moyo Oyun'), 'mercek': ('img/ikon-mercek.svg', 'Moyo Uzman')}
chip = lambda k: f'<span><img src="{APPS[k][0]}" alt="" width="22" height="22">{APPS[k][1]}</span>'
CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'


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
        <li><a href="{a}#nasil">Nasıl çalışır</a></li><li><a href="{a}#degerler">Neden Moyo</a></li><li><a href="{FIYAT}"{simdi}>Fiyat</a></li><li><a href="{a}#sss">SSS</a></li><li class="eko-ilk"><a class="eko-git" href="c.html">Moyo Ekosistemi</a></li><li><a class="eko-git" href="{MERCEK}">Uzmanlar için</a></li>
      </ul></nav>
      <div class="acts"><a class="pill pill-line" href="{APP}#giris">Giriş yap</a><a class="pill pill-cta" href="{APP}#kayit">Ücretsiz deneyin</a></div>
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
    <div class="about"><a class="logo" href="{a or "#top"}" aria-label="Moyo Ebeveyn ana sayfa">{LOGO}</a><p class="slogan">{e(E["h1"])}</p></div>
    <div><h2 class="fh">Ürün</h2><ul><li><a href="{a}#nasil">Nasıl çalışır</a></li><li><a href="{FIYAT}"{simdi}>Fiyat</a></li><li><a href="{a}#sss">Sık sorulanlar</a></li><li><a href="{EKO}">Moyo ekosistemi</a></li></ul></div>
    <div><h2 class="fh">Hesap</h2><ul><li><a href="{APP}#giris">Giriş yap</a></li><li><a href="{APP}#kayit">Ücretsiz deneyin</a></li><li><a href="{MERCEK}">Uzmanlar için</a></li></ul></div>
    <div><h2 class="fh">Kurumsal</h2><ul><li><a href="{HAKKIMIZDA}">Hakkımızda</a></li><li><a href="{GUVEN}">Güvenlik ve gizlilik</a></li><li><a href="{SITE}destek">Destek</a></li></ul></div>
    <div><h2 class="fh">Yasal</h2><ul><li><a href="{SITE}yasal/gizlilik">Gizlilik Politikası</a></li><li><a href="{SITE}yasal/kosullar-parentapp">Kullanım Koşulları</a></li><li><a href="{SITE}yasal/kvkk-basvuru">KVKK başvurusu</a></li></ul></div>
    <div class="legal"><span>© 2026 Moyo</span><span>Ekranlardaki adlar örnektir. Bu sayfa çerez, reklam pikseli ya da analiz aracı kullanmaz.</span></div>
  </div>
</footer>
<script src="m/site.js"></script>
<script src="m/moyo.js"></script>
</body>
</html>
'''


# ---------- Açılış görseli: oyun (Moyo Oyun) ile ebeveyn uygulaması (Moyo Ebeveyn) arasındaki ilişki ----------
# Sahne iki ölçüde çizilir (tek kaynak SAHNE): geniş (620×470: oyun solda, telefon sağda oyunun sağdaki "Oyun görevleri"
# panelini örter) ve dar (350×494, ≤ 520 px: oyun üstte, telefon altta ortada, oyunun alt satırlarını örter). Her parça
# sahne biriminde (x, y, g, y) kutu; CSS değişkenlerine yüzde olarak yazılır (--gx… geniş, --dx… dar). Ekran içi noktalar
# gerçek görüntülerden ölçüldü: e-rutinler "Dişlerini fırçala" satırı 30–570 × 637–748 (600×1298), e-onay "Onayla"
# 342–568 × 1160–1245, c-oyun-liste ilk satır 85–815 × 150–243 ve "Yaptım" 678–802 × 160–197 (1200×554).
# Yollar cihazların ALTINDA çizilir (yalnız koyu zemindeki parçası görünür); çip ise üstte, yolun tamamında yürür.
# y1/y2: çipin tam yolu (telefondaki satır → oyundaki satır; "Yaptım" → "Onayla"); s1/s2: durağan hâlde (hareket azaltma, betik yok)
# görünen ok uçlu yaylar (görünen parçaları). etk-*: uygulama adlarının dayandığı nokta: oyunun üst kenarı, telefonun alt kenarı
# (m/moyo.css etiketi bu noktadan sabit piksel uzaklıkta tutar: her ölçekte aygıtına aynı uzaklıkta).
SAHNE = {
    'g': {'boy': (620, 470),
          'oyun': (0, 93, 600, 277), 'tel': (421, 8, 199, 416.5), 'tel_pay': 6,
          'etk-oyun': (0, 93), 'etk-tel': (520.5, 424.5),
          'h-rutin': (433, 209.5, 175, 41), 'h-satir': (40, 166, 370, 51), 'h-yaptim': (335, 169, 70, 27), 'h-onay': (530, 372, 78, 34),
          'tik': (370, 182), 'n2': (283, 36.5), 'n4': (336.5, 417),
          'y1': 'M440 229C432 150 430 72 384 54Q260 6 146 72C124 92 120 150 122 191',
          'y2': 'M370 182C372 260 336 330 334 380Q338 432 400 426C450 422 520 410 548 389',
          's1': 'M410 60Q285 0 152 86', 's2': 'M300 376Q318 436 410 420'},
    'd': {'boy': (350, 494),
          'oyun': (0, 34, 350, 161.6), 'tel': (95, 120, 160, 334.5), 'tel_pay': 5,
          'etk-oyun': (0, 34), 'etk-tel': (175, 454.5),
          'h-rutin': (105, 281.5, 140, 33), 'h-satir': (22, 75, 219, 33), 'h-yaptim': (194, 77, 44, 18), 'h-onay': (182, 412, 63, 27.5),
          'tik': (215.8, 86.1), 'n2': (56.5, 266.5), 'n4': (300, 320.5),
          'y1': 'M112 298C80 300 52 290 48 250C44 200 50 140 62 92',
          'y2': 'M216 86C260 120 300 160 302 230C304 330 300 400 262 424C248 432 232 430 214 425',
          's1': 'M90 304Q40 280 56 202', 's2': 'M298 202Q320 330 262 420'},
}


def yer(ad):
    """Bir parçanın iki ölçüdeki yeri: style="--gx:…%;--gy:…%[;--gw;--gh]" (+ --d… dar)."""
    out = []
    for o, s in SAHNE.items():
        W, H = s['boy']
        v = s[ad]
        out += [f'--{o}x:{v[0] / W * 100:.3f}%', f'--{o}y:{v[1] / H * 100:.3f}%']
        if len(v) == 4:
            out += [f'--{o}w:{v[2] / W * 100:.3f}%', f'--{o}h:{v[3] / H * 100:.3f}%']
        if ad == 'tel':
            out.append(f'--{o}p:{s["tel_pay"] / W * 100:.3f}%')
    return f' style="{";".join(out)}"'


SAHNE_STIL = ';'.join(f'--{o}a:{s["boy"][0]} / {s["boy"][1]}' for o, s in SAHNE.items())


def yollar():
    out = ''
    for o, boy in (('g', 'genis'), ('d', 'dar')):
        s = SAHNE[o]
        ok = f'ok-{o}'
        hareket = f'<path class="y y1" d="{s["y1"]}"/><path class="y y2" d="{s["y2"]}"/>'
        out += (f'<svg class="ma-yol {boy}" viewBox="0 0 {s["boy"][0]} {s["boy"][1]}" preserveAspectRatio="none" aria-hidden="true" focusable="false">'
                f'<defs><marker id="{ok}" viewBox="0 0 10 10" refX="7.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto"><path class="ok" d="M2 1.6 8 5 2 8.4"/></marker></defs>'
                f'{hareket}<path class="s s1" d="{s["s1"]}" marker-end="url(#{ok})"/><path class="s s2" d="{s["s2"]}" marker-end="url(#{ok})"/></svg>')
    return out


def etiketler():
    return ''.join(f'<span class="ma-etk {c}"{yer("etk-" + c)}><img src="{APPS[k][0]}" alt="" width="20" height="20">{APPS[k][1]}</span>' for c, k in (('oyun', 'oyun'), ('tel', 'ebeveyn')))


A = E['anim']
OYUN = lambda src, ek='': f'<img{ek} src="{src}" alt="" width="1200" height="554">'
TEL = lambda src, ek='': f'<img{ek} src="{src}" alt="" width="600" height="1298">'
DUR = ('<svg class="i-pause" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.6" height="12" rx="1"/><rect x="9.4" y="2" width="3.6" height="12" rx="1"/></svg>'
       '<svg class="i-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.2v11.6c0 .8.9 1.3 1.6.8l8.6-5.8c.6-.4.6-1.2 0-1.6L5.6 1.4C4.9.9 4 1.4 4 2.2z"/></svg>')
TIK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 8.4l3 3 6.4-6.8"/></svg>'
halka = lambda ad, no: f'<i class="ma-halka {ad}" data-no="{no}"{yer(ad)}></i>'
# Betik hareketi başlatınca her madde düğmeye dönüşür (dokununca o adıma gider); betiksiz ya da hareket azaltmada düz liste.
adimlar = ''.join(f'<li data-b="{k}"><b>{k + 1}</b><span>{e(t)}</span></li>' for k, t in enumerate(A['adimlar']))
# Dört vuruş (kullanıcı kararı tur 3, "anim" a): ① telefonda rutin ② adım oyuna gider ③ çocuk "Yaptım"a dokunur ④ onay telefona gelir,
# oyunda taş görünür.
# Ekranlar gerçek: Rutinler ve inceleme (Moyo Ebeveyn), bugünün maceraları ve "Taş geldi!" (Moyo Oyun); üstlerine yalnız çip, halka ve ok çizilir.
# JS yoksa ya da hareket azaltma açıksa "duruk" hâl kalır: dört numara, iki ok, altında dört satırlık anlatım.
anim = f'''<figure class="ma duruk" data-ma>
          <div class="ma-kutu">
            <div class="ma-sahne" style="{SAHNE_STIL}" role="img" aria-label="{e(A["anlatim"])}">
              {yollar()}
              {etiketler()}
              <div class="ma-oyun"{yer("oyun")}>{OYUN("img/c-oyun-liste.webp")}{OYUN("img/c-oyun-odul.webp", ' class="ust" loading="lazy"')}</div>
              <div class="ma-tel"{yer("tel")}><div class="ma-ekran">{TEL("img/e-rutinler.webp")}{TEL("img/e-onay.webp", ' class="ust" loading="lazy"')}</div></div>
              {halka("h-rutin", 1)}{halka("h-satir", 2)}{halka("h-yaptim", 3)}{halka("h-onay", 4)}
              <i class="ma-tik"{yer("tik")}>{TIK}</i>
              <b class="ma-no n2"{yer("n2")}>2</b><b class="ma-no n4"{yer("n4")}>4</b>
              <span class="ma-cip" data-k="1"><span class="c1">{e(A["cip"])}</span><span class="c2">{TIK}{e(A["cip_donus"])}</span></span>
            </div>
            <button type="button" class="ma-dur" data-state="playing" aria-label="Duraklat" hidden>{DUR}</button>
          </div>
          <ol class="ma-adim" aria-label="Moyo Oyun ile Moyo Ebeveyn nasıl birlikte çalışır">{adimlar}</ol>
        </figure>'''

# ---------- Nasıl çalışır: beş sekme, Moyo'nun gerçek ekranları (örnek veri) ----------
ADIM = E['adimlar']
tabs = ''.join(f'<button type="button" role="tab" id="nc-t{k}" aria-controls="nc-p{k}" aria-selected="{"true" if k == 0 else "false"}"{"" if k == 0 else " tabindex=\"-1\""}><b>{k + 1}</b><span>{e(a["sekme"])}</span></button>' for k, a in enumerate(ADIM))
def gorsel(g, ek=''):
    kind, src, alt_ = g
    if kind in ('tel', 'kirp'):
        # telefon sürümü (23 Kasım 2026): ≤ 699 px'te aynı ekranın 390 × 700 boylu, 820 px'lik kopyası (img/<ad>-m.webp varsa), kart genişliğinde
        mob = src.replace('.webp', '-m.webp')
        kaynak = f'<source media="(max-width: 699px)" srcset="{mob}" width="820" height="1472">' if os.path.exists(mob) else ''
        return f'<figure class="tel{" kirp" if kind == "kirp" else ""}"{ek}><picture>{kaynak}<img src="{src}" alt="{e(alt_)}" width="600" height="1298" loading="lazy"></picture><figcaption>Örnek veri</figcaption></figure>'
    # oyun ekranı telefonda iPad oranında (4:3) çekim (img/<ad>-m.webp varsa): yatay telefon ekranı 350 px'te okunmuyordu
    mob = src.replace('.webp', '-m.webp')
    kaynak = f'<source media="(max-width: 699px)" srcset="{mob}" width="1200" height="900">' if os.path.exists(mob) else ''
    return f'<figure class="shot"{ek}><picture>{kaynak}<img src="{src}" alt="{e(alt_)}" width="1200" height="554" loading="lazy"></picture><figcaption>Örnek veri</figcaption></figure>'


# 2. adımın oyun ekranı c-oyun-onay: açılış anlatımı c-oyun-liste'yi gösterir, aynı ekran sayfada iki kez görünmez.
medya = lambda a: gorsel(a['gorsel'])
pan = ''.join(f'''        <div class="nc-p" role="tabpanel" id="nc-p{k}" aria-labelledby="nc-t{k}"{"" if k == 0 else " hidden"}>
          <div class="nc-text"><p class="step-k">{e(a["ust"])}</p><h3>{e(a["baslik"])}</h3><p>{e(a["metin"])}</p><p class="nc-apps">{"".join(chip(x) for x in a["uygulama"])}</p></div>
          <div class="nc-media{" genis" if a["gorsel"][0] == "genis" else ""}">{medya(a)}</div>
        </div>
''' for k, a in enumerate(ADIM))

# ---------- Neden Moyo: başlık, giriş ve üç "neden" (tur 5: yalnızca "Üç yakın çekim", yeniden tasarım) ----------
# Kartlar e-metin.json neden_kartlar: [ekran, başlık, metin, rozet] (tur 5'te rozet boş: uzman panelinin etiketi "Moyo Uzman · isteğe bağlı").
# Her neden kendi panelinde: üstte küçük büyük harfli etiket (uygulama · ekran ya da "isteğe bağlı"), kısa başlık ve tek cümle; altta telefonda uygulamanın BÜTÜN ekranı (gerçek ekran, örnek
# veri; kırpılmaz, panelin alt kenarı yalnızca telefonun altını keser) ve ekranın vurgulanan şeridi, aynı yerde ve aynı görselden, CIKMA kat
# büyük, telefonun iki kenarından taşan kart olarak (kullanıcının iki örnek görseli: satır ekrandan kalkmış gibi). Ekranlar 780 × 1688
# (390 × 844 nokta ×2); telefon nokta cinsinden 418 × 872 (kenar 14). cikma: şeridin dikey yeri (y, yükseklik; nokta), şerit hep ekranın tam
# genişliği: kart büyüyünce telefonun iki yanından da ~%5 taşar.
#   rutin: "Hazır rutin" (Rutin ekle › Güne hazır sabah): ilk iki adım saatleriyle (07:00 Odanın perdesini aç, 07:05 Yatağını topla)
#   kayit: "Davranış kaydı ekle": "Ne yaşandı?" alanı (şerit "Sonrasında ne oldu?"dan, dolayısıyla "Sesli anlat"tan önce biter)
#   uzman: Moyo Uzman telefonda, danışan › Ev rutinleri › Haftalık: "Yatağını topla" adımının son 7 günü
NZ = {
    'rutin': {'src': 'img/e-nz-plan.webp', 'app': 'ebeveyn', 'cikma': (376, 142)},
    'kayit': {'src': 'img/e-nz-not.webp', 'app': 'ebeveyn', 'cikma': (384, 95)},
    'uzman': {'src': 'img/e-nz-uzman.webp', 'app': 'mercek', 'cikma': (491, 80)},
}
TEL_G, TEL_Y, KENAR, CIKMA = 418, 872, 14, 1.18
ND, NE = E['neden_kartlar'], E['neden_ekran']
bagla = lambda t: re.sub(r' (\S+)$', ' \\1', t) if t.count(' ') >= 2 else t   # son iki sözcük aynı satırda (19 Kasım QA)
urun = lambda t: re.sub(r'Moyo (Uzman|Ebeveyn|Oyun)', 'Moyo \\1', t)   # ürün adı satır sonunda bölünmesin
# Giriş: geniş ekranda her cümle kendi satırında; "neyin işe yaradığını" bölünmez (ikinci cümle iki nokta üst üsteden sonra satır atlar)
neden_giris = f'<p class="intro nd-giris">{" ".join(f"<span>{e(urun(x))}</span>" for x in re.split(r"(?<=[.])\s+", E["neden_giris"]))}</p>'.replace('neyin işe yaradığını', 'neyin\u00a0işe\u00a0yaradığını')


def cikma_stil(y, h):
    """Kartın telefon kutusundaki yeri (yüzde) ve içindeki görselin kayması: şeridin ortası yerinde kalır, kart CIKMA kat büyür."""
    g, yk = 390 * CIKMA, h * CIKMA
    return (f'--k0:{1 / CIKMA:.4f};left:{(TEL_G - g) / 2 / TEL_G * 100:.3f}%;width:{g / TEL_G * 100:.3f}%;'
            f'top:{(KENAR + y + h / 2 - yk / 2) / TEL_Y * 100:.3f}%;height:{yk / TEL_Y * 100:.3f}%')


def nz_panel(k, t, p, r):
    y, h = NZ[k]['cikma']
    ikon, ad = APPS[NZ[k]['app']]
    return (f'<li class="nzp-kart"><div class="nzp-yazi"><p class="nzp-etk"><img src="{ikon}" alt="" width="20" height="20">'
            f'<span>{urun(ad)} · {e(NE[k]["yer"])}</span></p><h3>{e(bagla(t))}</h3><p class="nzp-p">{e(urun(p))}</p></div>'
            f'<div class="nzp-sahne"><figure class="nzp"><div class="nzp-tel"><div class="nzp-ekran">'
            f'<img src="{NZ[k]["src"]}" alt="{e(NE[k]["alt"])}" width="780" height="1688" loading="lazy"></div></div>'
            f'<div class="nzp-cikma" style="{cikma_stil(y, h)}" aria-hidden="true"><img src="{NZ[k]["src"]}" alt="" width="780" height="1688" loading="lazy"'
            f' style="top:{-y / h * 100:.3f}%"></div></figure></div></li>')


neden = '<ul class="nzp-uc">' + ''.join(nz_panel(*x) for x in ND) + '</ul>'
ekosis = ''.join(f'<div class="eko-git"><img src="{APPS[k][0]}" alt="" width="48" height="48"><h3>{APPS[k][1]}</h3><p>{e(p)}</p></div>' for k, p in E['ekosistem'])
sss = ''.join(f'<details><summary>{q[0]}</summary><p>{q[1]}</p></details>' for q in E['sss'])

html = f'''{bas(E["baslik"], E["aciklama"], "/ebeveyn/")}
<body class="sayfa-moyo">
{ust("ana")}
<main id="main">
  <section class="hero" aria-labelledby="h-hero">
    <div class="wrap wide mhero">
      <div class="mhero-yazi">
        <p class="eyebrow">Ebeveynler için</p>
        <h1 id="h-hero">{e(E["h1"])}</h1>
        <p class="sub">{e(E["alt"])}</p>
        <div class="actions"><a class="btn btn-cta" href="{APP}#kayit">Ücretsiz deneyin</a><a class="btn btn-line" href="#nasil">Nasıl çalışır?</a></div>
        <p class="fine">{E["ince"]}</p>
        <ul class="trust" aria-label="Temel ilkeler">{"".join(f"<li>{CHECK}{x}</li>" for x in E["isaretler"])}</ul>
      </div>
      <div class="hero-media mhv">
        {anim}
      </div>
    </div>
  </section>

  <section class="sec sec-white" id="nasil" aria-labelledby="h-nasil">
    <div class="wrap">
      <div class="head"><p class="eyebrow">Nasıl çalışır</p><h2 id="h-nasil">{e(E["nasil"])}</h2></div>
      <div class="nc" data-nc>
        <div class="nc-tabs" role="tablist" aria-label="Moyo'nun adımları">{tabs}</div>
        <p class="nc-etiket" aria-hidden="true">{e(ADIM[0]["sekme"])}</p>
{pan}      </div>
    </div>
  </section>

  <section class="sec sec-soft" id="degerler" aria-labelledby="h-deger">
    <div class="wrap">
      <div class="head"><p class="eyebrow">Neden Moyo</p><h2 id="h-deger">{e(E["neden_baslik"]).replace("zorlandığı anlar", "zorlandığı\u00a0anlar")}</h2>{neden_giris}</div>
      {neden}
      <p class="nd-bag"><a href="{HAKKIMIZDA}">{E["neden_bag"]} <span aria-hidden="true">→</span></a></p>
    </div>
  </section>

  <section class="sec sec-dark" aria-labelledby="h-eko">
    <div class="wrap">
      <div class="head"><p class="eyebrow">Moyo ekosistemi</p><h2 id="h-eko">{e(E["ekosistem_baslik"])}</h2><p class="intro">{e(E["ekosistem_giris"])}</p></div>
      <div class="ekos">{ekosis}</div>
      <p class="eko-link"><a href="{EKO}">Ekosistemi görün →</a></p>
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
        <h2 id="h-son">{e(E["kapanis"])}</h2>
        <div class="actions"><a class="btn btn-cta" href="{APP}#kayit">Ücretsiz deneyin</a><a class="btn btn-line" href="{APP}#giris">Giriş yap</a></div>
        <p class="fine">{e(E["kapanis_ince"])}</p>
      </div>
    </div>
  </section>
</main>

{alt("ana")}'''

if __name__ == '__main__':
    assert 'istediğiniz' not in html and 'seanslar aras' not in html and '—' not in html and 'zorlanılan' not in html.lower(), 'yasaklı ifade ya da uzun tire kaldı'
    gorunen = re.sub(r'<[^>]+>', ' ', re.sub(r'<(script|style|svg)\b.*?</\1>', ' ', html, flags=re.S))
    for yasak in ('oyunda yapar', 'oyunda yapsın', 'oyunda yapmak', 'tek platform', 'tek plan', 'tek kayıt', 'buluş', 'evde başlayın',
                  'her şeyi', 'döngü kapanır', 'kurun', 'kurarsınız', 'kurduğunuz', 'kurulur', 'kurar,', ' yalnız ', 'zor an', 'zorlanılan'):
        assert yasak not in gorunen.lower(), f'yasaklı ifade: {yasak}'
    open('ebeveyn.html', 'w').write(html); print('ok ebeveyn.html')
