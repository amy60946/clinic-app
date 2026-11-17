#!/usr/bin/env python3
# Çatı sayfanın (../c.html) sürükle-bırak "düzen ayarı" önizlemesi: sayfanın kendisi + duzen.js + duzen.css.
# Artifact'in ana sayfası bu dosyadır (veritabanı yalnız ana sayfada çalışır); stil, betik, yazı tipi ve görseller yanında dosya olarak yayınlanır.
#   python3 ../yap_c.py && python3 yap_duzen.py   ->  duzen.html + dosyalar.json (yayın için dosya eşlemesi)
import re, json, os
s = open('../c.html').read()
govde = s[s.index('<body'):s.index('</body>')]
govde = govde[govde.index('>') + 1:]
govde = re.sub(r'<script[^>]*></script>', '', govde)
html = ('<title>Moyo düzen ayarı</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
        + ''.join('<link rel="stylesheet" href="%s">' % c for c in ('ortak.css', 'c.css', 'beyaz.css', 'v4.css', 'duzen.css'))
        + '\n<script>document.body.classList.add("sayfa-c", "beyaz");</script>\n' + govde
        + ''.join('<script src="%s"></script>' % j for j in ('hikaye.js', 'eko.js', 'kompakt.js', 'menu.js', 'duzen.js')) + '\n')
open('duzen.html', 'w').write(html)
dosya = {f: '../' + f for f in ('ortak.css', 'c.css', 'beyaz.css', 'v4.css', 'hikaye.js', 'eko.js', 'kompakt.js', 'menu.js')}
dosya.update({'duzen.css': 'duzen.css', 'duzen.js': 'duzen.js'})
for g in sorted(set(re.findall(r'(?:src|href)="(img/[^"]+)"', html))): dosya[g] = '../' + g
for f in sorted(os.listdir('../fonts')): dosya['fonts/' + f] = '../fonts/' + f
json.dump(dosya, open('dosyalar.json', 'w'), indent=1)
print('ok duzen.html', len(html), len(dosya), 'dosya')
