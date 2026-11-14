# 60/30/10 önizlemesi: canlı sürümlerin kopyası + tema.css. Kullanım:
#   python3 tools/tema-6031/yap.py <parent-app>/site/moyo <clinic-app>/site <ikon klasörü> <çıktı>
# Çıktı: cati/ (çatı + ebeveyn), mercek/ (site), ikon/, tema.css. Sayfalar ?alt=a|b ile temayı açar; parametresiz = canlıdaki.
import os, re, shutil, sys
MOYO, SITE, IKON, OUT = [os.path.abspath(a) for a in sys.argv[1:5]]
HERE = os.path.dirname(os.path.abspath(__file__))
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
shutil.copy(os.path.join(HERE, 'tema.css'), OUT)
shutil.copy(os.path.join(HERE, 'host.html'), os.path.join(OUT, 'onizleme.html'))
INJ = ('<link rel="stylesheet" href="{r}tema.css"><script>(function(){{var a=new URLSearchParams(location.search).get("alt");'
       'if(a)document.documentElement.setAttribute("data-alt",a);document.addEventListener("click",function(e){{var l=e.target.closest&&e.target.closest("a[href]");'
       'if(!l||!a)return;var h=l.getAttribute("href");if(/^(https?:|#|mailto:)/.test(h))return;l.setAttribute("href",h.replace(/(\\.html)(#|$)/,"$1?alt="+a+"$2"));}},true);}})();</script></head>')
def inject(html, rel):
    return html.replace('</head>', INJ.format(r=rel), 1)
# Çatı + Moyo Ebeveyn (canlı çıktı, kök yolları göreliye)
shutil.copytree(os.path.join(MOYO, 'c'), os.path.join(OUT, 'cati', 'c'))
c = open(os.path.join(MOYO, 'index.html')).read()
c = c.replace('"/c/', '"c/').replace('href="/ebeveyn/"', 'href="ebeveyn.html"').replace('href="/"', 'href="index.html"')
open(os.path.join(OUT, 'cati', 'index.html'), 'w').write(inject(c, '../'))
m = open(os.path.join(MOYO, 'ebeveyn', 'index.html')).read()
m = m.replace('"/c/', '"c/').replace('href="/"', 'href="index.html"')
open(os.path.join(OUT, 'cati', 'ebeveyn.html'), 'w').write(inject(m, '../'))
# Moyo Mercek sitesi
shutil.copytree(SITE, os.path.join(OUT, 'mercek'), ignore=shutil.ignore_patterns('build.sh', '*.md', '*.webm'))
for f in ('index.html', 'fiyat.html'):
    p = os.path.join(OUT, 'mercek', f); html = open(p).read(); open(p, 'w').write(inject(html, '../'))
shutil.copytree(IKON, os.path.join(OUT, 'ikon'))
n = sum(len(fs) for _, _, fs in os.walk(OUT))
print('ok', OUT, n, 'dosya')
