# Canlıya taşıma (kullanıcı isteği 14 Kasım 2026: "şifre girişli sistemi aktif tutarak live'a al"):
# çatı sayfa (c.html) ve Moyo ebeveyn sayfası (ebeveyn.html) → parent-app/site/moyo/ (moyoapp.com.tr, Worker moyo-site).
#   /            ← c.html     (önizleme seçicileri çıkar, bağlantılar gerçek adreslere, varlıklar /c/ altında)
#   /ebeveyn/    ← ebeveyn.html
#   /c/…         ← css, js, yazı tipleri, kullanılan görseller
# parent-app site/build-cf.sh site, site/moyo'yu dist-site'ın üstüne kopyalar. Kilit (Cloudflare Access) alan adında; dokunulmaz.
# Kullanım: cd tools/cati-sayfa && python3 disa_aktar.py ../../../parent-app/site/moyo
import os, re, shutil, subprocess, sys
OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '../../../parent-app/site/moyo')
APP = 'https://ebeveyn.moyoapp.com.tr/'
MERCEK = 'https://mercek.moyoapp.com.tr/'
for g in ('yap_c.py', 'yap_m.py'):
    subprocess.run([sys.executable, g], check=True, stdout=subprocess.DEVNULL)
import yap_c  # noqa: E402  (önizleme adresi için)

def cut(s, start, end_tag):
    i = s.find(start)
    if i < 0: return s
    j = s.index(end_tag, i) + len(end_tag)
    return s[:i] + s[j:]

FOOT = ('<footer class="alt-bilgi"><div class="ic"><span>© 2026 Moyo</span><span class="ab-yasal">'
        '<a href="/yasal/gizlilik">Gizlilik Politikası</a><a href="/yasal/kosullar-parentapp">Kullanım Koşulları</a>'
        '<a href="/yasal/kvkk-basvuru">KVKK başvurusu</a><a href="/destek">Destek</a></span>'
        '<span>Ekranlardaki adlar örnektir. Bu sayfa çerez, reklam pikseli ya da analiz aracı kullanmaz.</span></div></footer>')

c = open('c.html').read()
c = cut(c, '<div class="alt-secici"', '</div>')                       # önizleme: alt başlık seçici
c = re.sub(r'<span class="alt-sec" data-alt="[23]" hidden>.*?</span>', '', c)
c = cut(c, '<div class="nk-secici"', '</div>')                         # önizleme: telefon/iPad düzeni seçici
c = c.replace('<a class="hap cizgi k" href="#">Giriş yap</a>', f'<a class="hap cizgi k" href="{APP}#giris">Giriş yap</a>')
c = c.replace('href="#">Ücretsiz deneyin</a>', f'href="{APP}#kayit">Ücretsiz deneyin</a>')
c = c.replace(yap_c.MERCEK, MERCEK).replace('href="ebeveyn.html"', 'href="/ebeveyn/"').replace('https://moyoapp.com.tr/destek', '/destek')
c = c.replace('<a class="logo" href="#"', '<a class="logo" href="/"')
c = re.sub(r'<footer class="alt-bilgi">.*?</footer>', FOOT, c, flags=re.S)
c = c.replace('<title>Moyo · Çatı sayfa</title>', '<title>Moyo · Çocuk, aile ve uzman için rutin platformu</title>'
              '<meta name="description" content="Moyo; evde sizi, oyunda çocuğunuzu ve dilerseniz çalıştığınız uzmanı aynı rutinde buluşturur. Moyo Oyun, Moyo Ebeveyn ve Moyo Mercek.">')
for a in ('ortak.css', 'c.css', 'beyaz.css', 'hikaye.js', 'dongu.js', 'kompakt.js'):
    c = c.replace(f'"{a}"', f'"/c/{a}"')
c = c.replace('src="img/', 'src="/c/img/').replace('href="img/', 'href="/c/img/')
assert 'href="#"' not in c, 'boş bağlantı kaldı'
assert 'claude.ai' not in c and 'Önizleme' not in c, 'önizleme izi kaldı'

m = open('ebeveyn.html').read()
m = m.replace('"m/', '"/c/m/').replace('src="img/', 'src="/c/img/').replace('href="img/', 'href="/c/img/')
assert 'claude.ai' not in m

os.makedirs(os.path.join(OUT, 'ebeveyn'), exist_ok=True)
for d in ('c',):
    shutil.rmtree(os.path.join(OUT, d), ignore_errors=True)
os.makedirs(os.path.join(OUT, 'c', 'img'))
open(os.path.join(OUT, 'index.html'), 'w').write(c)
open(os.path.join(OUT, 'ebeveyn', 'index.html'), 'w').write(m)
for a in ('ortak.css', 'c.css', 'beyaz.css', 'hikaye.js', 'dongu.js', 'kompakt.js'):
    shutil.copy(a, os.path.join(OUT, 'c', a))
shutil.copytree('fonts', os.path.join(OUT, 'c', 'fonts'))
shutil.copytree('m', os.path.join(OUT, 'c', 'm'))
used = set(re.findall(r'/c/img/([\w.-]+)', c + m))
for f in sorted(used):
    shutil.copy(os.path.join('img', f), os.path.join(OUT, 'c', 'img', f))
print('ok', OUT, '·', len(used), 'görsel')
