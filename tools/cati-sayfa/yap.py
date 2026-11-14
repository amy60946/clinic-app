import re, html as H
LOGO = open('inline-moyo.svg').read().strip()
LOGO = re.sub(r' role="img" aria-label="[^"]*"', ' aria-hidden="true" focusable="false"', LOGO).replace(' xmlns="http://www.w3.org/2000/svg"', '')
MERCEK = 'https://claude.ai/artifact/H2hwv9mqx9CDtjjEsYP6UE#mercek'
IMG = {'oyun': ('img/oyun-tablet.webp', 'Çocuğun tabletinde Moyo Oyun: bugünün macerası "Dişlerini fırçala" ve "Yaptım" düğmesi', 'Çocuğun tableti · Moyo Oyun · örnek gösterim', ''),
       'ebeveyn': ('img/ebeveyn-telefon.webp', 'Ebeveynin telefonunda Moyo: "Nazlı macerayı tamamladı" bildirimi ve onay', 'Sizin telefonunuz · Moyo Ebeveyn · örnek gösterim', 'telefon'),
       'uzman': ('img/uzman-davranis.webp', 'Uzmanın panelinde Moyo Mercek: hedef davranış kartı, stratejiler ve ebeveynin bildirdiği olaylar', 'Uzmanın paneli · Moyo Mercek · örnek veri', 'panel', 'img/uzman-davranis-dar.webp')}
DONGU = """<svg viewBox="0 12 520 490" role="img" aria-label="Döngü: çocuk oynar, aile onaylar, uzman görür ve önerir"><defs><marker id="ok" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#51E56A"/></marker></defs><rect x="0" y="12" width="520" height="490" rx="36" fill="#2D294E"/><g fill="none" stroke="#51E56A" stroke-width="6" stroke-linecap="round" marker-end="url(#ok)"><path d="M338.9 128.2 A180 180 0 0 1 439.9 296.3"/><path d="M360.7 439.2 A180 180 0 0 1 164.6 442.6"/><path d="M80.4 302.6 A180 180 0 0 1 175.5 131.1"/></g><g font-family="Outfit, sans-serif" text-anchor="middle" fill="#FFFFFF"><circle cx="260.0" cy="110.0" r="64" fill="#16113A" stroke="#51E56A" stroke-width="3"/><text x="260.0" y="104.0" font-size="25" font-weight="800">Çocuk</text><text x="260.0" y="132.0" font-size="21" fill="#C9C6E6">oynar</text><circle cx="415.9" cy="380.0" r="64" fill="#16113A" stroke="#51E56A" stroke-width="3"/><text x="415.9" y="374.0" font-size="25" font-weight="800">Aile</text><text x="415.9" y="402.0" font-size="21" fill="#C9C6E6">onaylar</text><circle cx="104.1" cy="380.0" r="64" fill="#16113A" stroke="#51E56A" stroke-width="3"/><text x="104.1" y="366.0" font-size="25" font-weight="800">Uzman</text><text x="104.1" y="392.0" font-size="20" fill="#C9C6E6">görür,</text><text x="104.1" y="414.0" font-size="20" fill="#C9C6E6">önerir</text><text x="260" y="292" font-size="46" font-weight="800" fill="#0FD354">moyo</text><text x="260" y="326" font-size="21" fill="#C9C6E6">her hafta yeniden</text></g></svg>"""
def hikaye(adimlar):
    yaz, kart, nok, lis = [], [], [], []
    for i, ad in enumerate(adimlar):
        key, rol, h2, p = ad[:4]; sorun = ad[4] if len(ad) > 4 else ''; liste = ad[5] if len(ad) > 5 else []
        ek = f'<span class="sorun"><b>Sorun:</b> {sorun}</span>' if sorun else ''
        ol = ('<ol>' + ''.join(f'<li>{x}</li>' for x in liste) + '</ol>') if liste else ''
        yaz.append(f'<div class="hk-yazi"><span class="rol">{rol}</span>{ek}<h2>{h2}</h2><p>{p}</p>{ol}</div>')
        if key == 'dongu':
            kart.append(f'<figure class="hk-kart dongu">{DONGU}<figcaption>Moyo ekosistemi</figcaption></figure>'); vis = f'<div class="dongu">{DONGU}</div>'
        else:
            src, alt, cap, cls = IMG[key][:4]; dar = IMG[key][4] if len(IMG[key]) > 4 else ''
            pic = (f'<picture><source media="(max-width: 820px)" srcset="{dar}">' if dar else '') + f'<img class="{cls}" src="{src}" alt="{H.escape(alt)}">' + ('</picture>' if dar else '')
            kart.append(f'<figure class="hk-kart {cls}">{pic}<figcaption>{cap}</figcaption></figure>'); vis = pic
        parca_ = [x.strip() for x in rol.split('·')]; ad_ = next((x for x in parca_ if x.startswith('Moyo')), parca_[0])
        nok.append(f'<li><a href="#ekosistem" aria-label="{i + 1}. adım: {ad_}"><span class="n">{i + 1}</span><span class="ad">{ad_}</span></a></li>')
        lis.append(f'<article><div><span class="rol" style="color:var(--yesil);font-weight:600;font-size:14px">{rol}</span>{ek.replace("class=\"sorun\"", "class=\"sorun\" style=\"display:block\"")}<h2 style="font-size:30px;margin-top:10px">{h2}</h2><p style="color:var(--koyu-yazi-2);margin-top:12px">{p}</p>{ol.replace("<ol>", "<ol style=\"margin-top:12px;padding-left:20px;color:var(--koyu-yazi-2)\">")}</div>{vis}</article>')
    return (f'<section class="hikaye statik" id="ekosistem" style="--adim:{len(adimlar)}" aria-label="Moyo nasıl birlikte çalışır"><div class="hk-sahne ic">'
            f'<div class="hk-yazilar">{"".join(yaz)}</div><div class="hk-kartlar" aria-hidden="true">{"".join(kart)}</div>'
            f'<ol class="hk-nokta" aria-label="Adımlar">{"".join(nok)}</ol><a class="hk-atla" href="#sonraki">Ayrıntılara geç ↓</a>'
            f'<div class="hk-liste">{"".join(lis)}</div></div></section>')
def sayfa(baslik, menu, sag, acilis, govde, ek=''):
    return f'''<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{baslik}</title><link rel="stylesheet" href="ortak.css"></head><body>
<header class="ust"><div class="ic"><a class="logo" href="#" aria-label="Moyo">{LOGO}{ek}</a><nav class="menu" aria-label="Ana menü">{menu}</nav><div class="sag">{sag}</div></div></header>
<main>{acilis}{govde}</main>
<footer class="alt-bilgi"><div class="ic"><span>© 2026 Moyo</span><span>Önizleme · metinler taslak · görsellerde örnek veri</span></div></footer>
<script src="hikaye.js"></script></body></html>'''
def acilis(etiket, h1, alt, dugmeler, not_='', cls=''):
    return f'<section class="acilis {cls}"><div class="ic">' + (f'<p class="etiket">{etiket}</p>' if etiket else '') + f'<h1>{h1}</h1><p class="alt">{alt}</p><div class="dugmeler">{dugmeler}</div>{not_}</div></section>'
yer = lambda n: ''.join(f'<div class="kart"><h3>{t}</h3><div class="yer"></div><div class="yer k"></div></div>' for t in n)

PARENT_STEPS = [
  ('oyun', 'Moyo Oyun · çocuğunuz için', 'Söylemekten yorulduysanız, oyun hatırlatsın.', 'Günlük rutinler ve sorumluluklar oyunda maceraya dönüşür. Çocuğunuz görevini tamamladıkça sanal dostu Okti büyür.'),
  ('ebeveyn', 'Moyo Ebeveyn · sizin için', 'Hatırlatan değil, onaylayan siz olun.', 'Görev tamamlanınca telefonunuza bildirim gelir; bir dokunuşla onaylarsınız. Günü, haftayı ve ayı tek bakışta görürsünüz.'),
  ('uzman', 'Moyo Mercek · uzmanınız için', 'Seans bitince süreç durmasın.', 'İzin verirseniz uzmanınız evdeki kayıtları görür ve size uygun ebeveyn eğitimi gönderir. Paylaşımı istediğiniz an durdurursunuz.')]
ROLE_STEPS = [
  ('oyun', 'Çocuk · Moyo Oyun', 'Rutin, bir oyuna dönüşür.', 'Görevler oyunda macera olur; çocuk tamamladıkça sanal dostu büyür. Reklam ve satın alma yok.'),
  ('ebeveyn', 'Aile · Moyo Ebeveyn', 'Evdeki emek görünür olur.', 'Hatırlatmayı uygulama yapar. Ebeveyn tamamlanan görevi onaylar, ilerlemeyi gün gün görür.'),
  ('uzman', 'Uzman · Moyo Mercek', 'Seans dışındaki hafta da görünür.', 'Ailenin izniyle uzman evdeki kayıtları görür, ebeveyn eğitimi atar ve seansa hazırlıklı gelir.')]
fine = '<p style="font-size:14px;color:var(--koyu-yazi-2);margin-top:14px">7 gün ücretsiz, kart gerekmez; sonra aylık — TL, dönem sonunda kendiliğinden yenilenir.</p>'

# A: ebeveyn sayfası (moyoapp.com.tr ebeveynin sayfası olarak kalır)
a = sayfa('A · Moyo Ebeveyn sayfası',
  '<a href="#ekosistem">Nasıl birlikte çalışır</a><a href="#sonraki">Faydalar</a><a href="#nasil">Nasıl kullanılır</a><a href="#">Güvenlik</a><a href="#">Fiyat</a><a class="kitle" href="%s" target="_blank" rel="noopener">Uzmanlar için ↗</a>' % MERCEK,
  '<a class="hap cizgi k" href="#">Giriş yap</a><a class="hap dolu k" href="#">Ücretsiz kaydol</a>',
  acilis('Moyo · DEHB, otizm ve davranışsal zorluklar yaşayan çocukların aileleri için', 'DEHB, otizm ve davranışsal zorluklar yaşayan çocuklar için gelişim ve alışkanlık geliştirme ekosistemi',
         'Oyun çocuğunuza, takip size, yol göstermek uzmanınıza.', '<a class="hap dolu b" href="#">Ücretsiz kaydol</a><a class="hap cizgi b" href="#ekosistem">Nasıl çalışır?</a>', fine),
  hikaye(PARENT_STEPS) +
  f'<section class="bant" id="sonraki"><div class="ic"><div class="bas"><p class="ust-etiket">moyo Ebeveyn\'in faydaları</p><h2>Bugünkü dört fayda, yeni metinle</h2><p><span class="not-on">Önizleme notu</span> Başlıklar bugünkü sayfadan; metinler acı nokta + çözüm diliyle yeniden yazılacak, "%90" gibi belgesiz ifadeler çıkacak.</p></div><div class="kartlar4">{yer(["Günlük rutini birkaç dakikada kurun", "Hatırlatmayı Moyo yapsın", "Görevleri tamamlama isteği", "Sorumluluğu adım adım üstlenme"])}</div></div></section>'
  f'<section class="bant sis" id="nasil"><div class="ic"><div class="bas"><p class="ust-etiket">Nasıl kullanılır</p><h2>Üç adım</h2></div><div class="kartlar3">{yer(["1 · Alanları seçin", "2 · Oyun motivasyonu", "3 · Alışkanlık ve beceri"])}</div></div></section>')
# B: ekosistem + iki kitle tek sayfada
sek = '''<section class="bant" id="sonraki"><div class="ic"><div class="bas"><p class="ust-etiket">Size ne kazandırır?</p><h2>Ebeveyn ya da uzman, ikisine de</h2></div>
<div class="sekmeler" role="tablist" aria-label="Kitle"><button role="tab" id="k-e" aria-controls="p-e" aria-selected="true">Ebeveynseniz</button><button role="tab" id="k-u" aria-controls="p-u" aria-selected="false">Uzmansanız</button></div>
<div id="p-e" role="tabpanel" aria-labelledby="k-e"><div class="kartlar3"><div class="kart"><h3>Daha az tekrar, daha az tartışma</h3><p>Hatırlatmayı uygulama yapar; siz yalnız onaylarsınız.</p></div><div class="kart"><h3>Rutin, çocuğun kendi oyunu olur</h3><p>Görevler oyunda macera; çocuk ilerlemesini kendisi takip eder.</p></div><div class="kart"><h3>Uzmanınızla aynı sayfada</h3><p>İzninizle evdeki kayıtlar uzmanınıza ulaşır; seansta baştan anlatmazsınız.</p></div></div><div class="dugmeler" style="display:flex;justify-content:center;margin-top:28px"><a class="hap dolu b" href="#">Ücretsiz kaydol</a></div></div>
<div id="p-u" role="tabpanel" aria-labelledby="k-u" hidden><div class="kartlar3"><div class="kart"><h3>Seans dışını tahmin etmeyin</h3><p>Evdeki kayıtlar, ailenin izniyle panelinize düşer.</p></div><div class="kart"><h3>Ev programı aileye ulaşır</h3><p>Ebeveyn eğitimini atarsınız; hatırlatmayı uygulama yapar.</p></div><div class="kart"><h3>Seansa hazırlıklı gelin</h3><p>Raporu ve ilerleme notunu kayıtlardan hazırlarsınız.</p></div></div><div class="dugmeler" style="display:flex;justify-content:center;margin-top:28px"><a class="hap dolu b" href="%s" target="_blank" rel="noopener">Moyo Mercek'i inceleyin ↗</a></div></div></div></section>''' % MERCEK
b = sayfa('B · Ekosistem ve iki kitle tek sayfada',
  '<a href="#ekosistem">Nasıl işler</a><a href="#sonraki">Ebeveynler</a><a href="#sonraki">Uzmanlar</a><a href="#">Güvenlik</a><a href="#">Fiyat</a>',
  '<a class="hap cizgi k" href="#">Giriş yap</a><a class="hap dolu k" href="#">Ücretsiz kaydol</a>',
  acilis('DEHB, otizm ve davranışsal zorluklar yaşayan çocuklar, aileleri ve uzmanları için', 'Çocuk oynar, aile takip eder, uzman yol gösterir.',
         'Moyo; çocuğun oyununu, ailenin uygulamasını ve uzmanın panelini aynı rutinde buluşturur.', '<a class="hap dolu b" href="#sonraki">Ebeveyn olarak başlayın</a><a class="hap cizgi b" href="#sonraki">Uzman olarak deneyin</a>'),
  hikaye(ROLE_STEPS) + sek +
  f'<section class="bant sis"><div class="ic"><div class="bas"><p class="ust-etiket">Ebeveynler için ayrıntı</p><h2>moyo Ebeveyn\'in faydaları ve kullanımı</h2><p><span class="not-on">Önizleme notu</span> Ebeveyn ayrıntısı bu sayfada kalır; uzman ayrıntısı Moyo Mercek sitesinde.</p></div><div class="kartlar4">{yer(["Günlük rutini birkaç dakikada kurun", "Hatırlatmayı Moyo yapsın", "Görevleri tamamlama isteği", "Sorumluluğu adım adım üstlenme"])}</div></div></section>')
# C: çatı sayfa, döngülü anlatım (kullanıcı istekleri 12 Kasım 2026: kitle düğmeleri yok; sistem nasıl çalışır, hangi soruna çözüm;
# joonhealth.co içeriği bire bir: kopyalama yasağı kalktı, ortak CLAUDE.md kural 7). Joon'un bölüm sırası ve cümleleri Türkçe;
# bizde doğru olmayanlar (kullanıcı sayısı, puan, basın, araştırma sonuçları, yorumlar, koçluk, klinik direktör) yok, yerlerine bizim olgularımız.
CATI_STEPS = [
  ('ebeveyn', 'Önce · Moyo Ebeveyn', 'Evinizin düzenini geri kazanın', 'Kaosa elveda, düzenli rutinlere merhaba! Maceraları ve yaşa uygun hazır rutinleri kurun; tamamlanınca telefonunuza bildirim gelir, bir dokunuşla onaylarsınız.',
   'Her gün aynı tartışma: hatırlatmak, ikna etmek, pazarlık etmek.'),
  ('oyun', 'Sonra · Moyo Oyun', 'Yaşam becerileri üzerinde çalışırken çocuğunuzu motive edin', 'Hatırlatmayı biz yapalım, siz çocuğunuzla ilişkinize odaklanın!',
   'Hep hatırlatan siz oluyorsunuz.',
   ['Oyun, çocuğunuza günlük maceralarını hatırlatır; tamamladıkça dostu Okti büyür', 'Ebeveyn eğitimleriyle davranışları anlamayı ve evde uygulanacak stratejileri öğrenin', 'Çocuğunuzun yaşına uygun rutin ve macera önerileri alın']),
  ('uzman', 'Gerektiğinde, kolayca · Moyo Mercek', 'Sizi anlayan uzmanınızla çalışın', 'Uzmanınız en önemli adımlara öncelik vermenize ve odaklanmanıza yardım etsin. Ailenin izniyle evdeki kayıtları görür, ebeveyn eğitimi atar ve seansa hazırlıklı gelir; aile paylaşımı istediği an durdurur.',
   'Uzman, seanslar arasında evde ne olduğunu göremiyor.'),
  ('dongu', 'Hepsi birlikte', 'Her hafta kendini besleyen bir döngü', 'Çocuk oynar, aile onaylar, uzman görür ve önerir; önerisi ertesi gün yine oyunda bir macera olur.')]
FIYAT_NOT = '<p class="ince">Moyo Oyun ücretsiz. Moyo Ebeveyn 7 gün ücretsiz, sonra aylık — TL; dönem sonunda kendiliğinden yenilenir.</p>'
parca = '''<section class="bant" id="sonraki"><div class="ic"><div class="bas"><p class="ust-etiket">Sistemin parçaları</p><h2>Üç uygulama, tek düzen</h2><p>Her biri bir kişinin işini kolaylaştırır; birlikte çalışınca döngü kapanır.</p></div><div class="kartlar3">
<div class="kart urun"><h3><small>Çocuk için</small>moyo Oyun</h3><p class="sorun2">Rutini oyuna çevirir; ödül oyunun içinde.</p><p>Çocuk hesabı gerekmez; cihaz kısa süreli bir kodla bağlanır. Reklam ve satın alma yok.</p><a href="a.html">Nasıl oynanır →</a></div>
<div class="kart urun"><h3><small>Aile için</small>moyo Ebeveyn</h3><p class="sorun2">Hatırlatmayı uygulamaya bırakır, ilerlemeyi gösterir.</p><p>Maceraları ve rutinleri kurar, tamamlananları onaylar, uzmanınızla neyi paylaşacağınızı siz seçersiniz.</p><a href="a.html">Ebeveyn sayfası →</a></div>
<div class="kart urun"><h3><small>Uzman için</small>moyo Mercek</h3><p class="sorun2">Seans dışındaki haftayı görünür kılar.</p><p>Ailenin izniyle evdeki kayıtları görür, ebeveyn eğitimi atar, rapor ve ilerleme notunu kayıtlardan hazırlar.</p><a href="%s" target="_blank" rel="noopener">Uzman sayfası ↗</a></div></div></div></section>
<section class="bant sis"><div class="ic"><div class="bas"><p class="ust-etiket">Güven</p><h2>Çocuğun verisi ailenindir</h2></div><div class="kartlar4">
<div class="kart"><h3>Reklam yok</h3><p>Oyunda reklam ve satın alma yoktur.</p></div><div class="kart"><h3>Yabancılarla iletişim yok</h3><p>Çocuğunuz yalnızca ailesine mesaj gönderebilir.</p></div>
<div class="kart"><h3>Çocuk hesabı gerekmez</h3><p>Çocuğunuzun e-postası ve şifresi olmaz. Cihaz kısa süreli bir kodla bağlanır.</p></div><div class="kart"><h3>Veriler sizin kontrolünüzde</h3><p>Uzmanla paylaşım yalnızca sizin onayınızla açılır. Hesabınızı istediğiniz zaman silebilirsiniz.</p></div></div></div></section>
<section class="bant"><div class="ic"><div class="bas"><p class="ust-etiket">Sıkça sorulanlar</p><h2>Sorular</h2><p>Sorunuzun yanıtını burada göremediyseniz bize <a href="https://moyoapp.com.tr/destek">destek sayfasından</a> yazın.</p></div><div class="sss">
<details><summary>Hesap açmam gerekiyor mu?</summary><p>İlerlemeyi takip etmek ve çocuğunuzun oyununu hesabınıza bağlamak için bir ebeveyn hesabı açmanız gerekir. Çocuğunuzun hesabı olmaz; cihaz kısa süreli bir kodla bağlanır.</p></details>
<details><summary>Kişisel bilgilerimi kullanıyor musunuz?</summary><p>Neyi neden topladığımızı Aydınlatma Metni'nde yazıyoruz. Uzmanla paylaşım yalnızca sizin onayınızla açılır; hesabınızı istediğiniz zaman silebilirsiniz.</p></details>
<details><summary>Kendi maceralarımı oluşturabilir miyim?</summary><p>Evet. Önerilerin ve hazır rutinlerin yanında kendi maceranızı da yazabilirsiniz.</p></details>
<details><summary>Oyun çocuklar için güvenli mi?</summary><p>Oyunda reklam ve satın alma yoktur. Çocuğunuz yalnızca ailesine mesaj gönderebilir; e-postası ve şifresi olmaz.</p></details>
<details><summary>Uzmanım yoksa kullanabilir miyim?</summary><p>Evet. Moyo Oyun ve Moyo Ebeveyn tek başına çalışır; uzmanınızı istediğiniz zaman eklersiniz.</p></details>
<details><summary>Moyo tanı koyar mı?</summary><p>Hayır. Moyo rutinleri ve kayıtları bir arada tutar; tanı koymaz, tedavi yerine geçmez.</p></details>
<details><summary>Ücreti nedir?</summary><p>Moyo Oyun ücretsizdir. Moyo Ebeveyn'i 7 gün ücretsiz deneyebilirsiniz; sonra aylık — TL ya da yıllık — TL, dönem sonunda kendiliğinden yenilenir. Uzmanlar için Moyo Mercek ayrı paketlerle sunulur.</p></details>
</div></div></section>''' % MERCEK
basamak = ('<ol class="basamak">'
  '<li><b>1 · Kendi başınıza</b>Düzenli kalmanızı sağlayan ebeveyn uygulamamız ve çocuğunuzu ilgili tutan oyunumuzla başlayın.</li>'
  '<li><b>2 · İhtiyaç duyduğunuzda</b>Uzmanınızın atadığı ebeveyn eğitimleriyle destek alın.</li>'
  '<li><b>3 · Daha karmaşık zorluklarda</b>Uzmanınız Moyo Mercek ile sürece katılır.</li></ol>')
c = sayfa('C · Çatı sayfa (döngülü anlatım)',
  '<a href="#ekosistem">Nasıl çalışır</a><a class="kitle" href="a.html">Ebeveynler için</a><a class="kitle" href="%s" target="_blank" rel="noopener">Uzmanlar için ↗</a><a href="#guven">Güvenlik</a><a href="#sss">Sorular</a>' % MERCEK,
  '<a class="hap cizgi k" href="#">Giriş yap</a><a class="hap dolu k" href="#">Ücretsiz deneyin</a>',
  acilis('', 'DEHB, otizm ve davranışsal zorluklar yaşayan çocuklar için gelişim ve alışkanlık geliştirme ekosistemi',
         'Bir çocuğu büyütmek bir köy ister; biz de sizinkini kurmanıza yardım etmek için buradayız.',
         '<a class="hap dolu b" href="#">Ücretsiz deneyin</a><a class="hap cizgi b" href="#ekosistem">Nasıl çalışır? ↓</a>', FIYAT_NOT, 'c') +
  '<div class="giris-bant"><div class="ic"><p class="ust-etiket">Hizmetimiz</p><h2>Sürekli değişen ebeveynlik zorlukları için esnek bir destek sistemi</h2><p>Nerede olursanız olun sizi oradan alır, her durumda en iyi yolu bulmanıza yardım ederiz.</p>' + basamak + '</div></div>',
  hikaye(CATI_STEPS) + parca.replace('<section class="bant sis">', '<section class="bant sis" id="guven">', 1).replace('<section class="bant"><div class="ic"><div class="bas"><p class="ust-etiket">Sıkça', '<section class="bant" id="sss"><div class="ic"><div class="bas"><p class="ust-etiket">Sıkça', 1))
for n, s in [('a', a), ('b', b)]: open(n + '.html', 'w').write(s)
print('ok')
