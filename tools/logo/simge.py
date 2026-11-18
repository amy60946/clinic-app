# İşaretli simgeler (kullanıcı kararı 18 Kasım 2026): işaret (1E) yalnız uygulama simgesinde ve profil resminde, karenin %60'ı;
# tarayıcı sekmesinde (köşesi yuvarlak, maskesiz) %68. Moyo: lacivert #16113A zemin + yeşil #0FD354 işaret.
# İşaretin çizimi Marketing setinden (kaynak/moyo-isaret.svg, kutu 200 × 180). Ana dosyalar ve PNG'ler Marketing setindedir
# (amy60946/marketing marka/moyo-set-2026-11-18); burada yalnız tanıtım sayfalarının kullandığı SVG'ler üretilir.
#   python3 tools/logo/simge.py <çıktı klasörü>   → ikon-moyo.svg (60), favicon-moyo.svg (68, köşe 22)
#   python3 tools/logo/simge.py <klasör> oneri    → + ikon-mercek-oneri.svg (beyaz zemin + lacivert işaret; KARAR BEKLİYOR, yalnız önizleme)
import os, re, sys
H = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(H, 'kaynak', 'moyo-isaret.svg')).read()
ISARET = ''.join(re.findall(r'<path[^>]*/>', src)); IW, IH = 200, 180
LAC, YES, BEY = '#16113A', '#0FD354', '#FFFFFF'
def kare(T, f, zemin, renk, rx=0, ad='Moyo simgesi'):
    w = f / 100 * T; s = w / IW; h = IH * s
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" role="img" aria-label="%s"><rect width="%d" height="%d" rx="%s" fill="%s"/>'
            '<g fill="%s" transform="translate(%.2f %.2f) scale(%.5f)">%s</g></svg>\n' % (T, T, ad, T, T, rx, zemin, renk, (T - w) / 2, (T - h) / 2, s, ISARET))
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'ikon-moyo.svg'), 'w').write(kare(1024, 60, LAC, YES))
open(os.path.join(OUT, 'favicon-moyo.svg'), 'w').write(kare(100, 68, LAC, YES, rx=22))
if len(sys.argv) > 2 and sys.argv[2] == 'oneri':
    open(os.path.join(OUT, 'ikon-mercek-oneri.svg'), 'w').write(kare(1024, 60, BEY, LAC, ad='Moyo Mercek simgesi (öneri)'))
print('ok', sorted(f for f in os.listdir(OUT) if 'ikon' in f or 'favicon' in f))
