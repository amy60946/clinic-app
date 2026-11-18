# İşaretli simgeler (kullanıcı kararı 18 Kasım 2026): işaret (1E) yalnız uygulama simgesinde ve profil resminde, karenin %60'ı;
# tarayıcı sekmesinde (köşesi yuvarlak, maskesiz) %68. Moyo: lacivert #16113A zemin + yeşil #0FD354 işaret.
# Moyo Mercek (kullanıcı seçimi 18 Kasım 2026, "B"): beyaz zemin + lacivert işaret, aynı oranlar.
# İşaretin çizimi Marketing setinden (kaynak/moyo-isaret.svg, kutu 200 × 180). Moyo'nun ana dosyaları ve PNG'leri Marketing setinde
# ve parent-app marka kitindedir; burada tanıtım sayfalarının kullandığı SVG'ler ve Moyo Mercek uygulamasının PNG'leri üretilir.
#   python3 tools/logo/simge.py <çıktı klasörü>      → ikon-moyo.svg, favicon-moyo.svg, ikon-mercek.svg, favicon-mercek.svg
#   python3 tools/logo/simge.py <çıktı klasörü> png  → + Moyo Mercek uygulaması: assets/icon.png (1024, saydamlıksız),
#       assets/favicon.png (48), assets/splash-icon.png (1024, saydam zemin, beyaz "moyo Mercek"; app.json imageWidth 300)
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
open(os.path.join(OUT, 'ikon-mercek.svg'), 'w').write(kare(1024, 60, BEY, LAC, ad='Moyo Mercek simgesi'))
open(os.path.join(OUT, 'favicon-mercek.svg'), 'w').write(kare(100, 68, BEY, LAC, rx=22, ad='Moyo Mercek simgesi'))
if len(sys.argv) > 2 and sys.argv[2] == 'png':
    import io, cairosvg
    from PIL import Image
    A = os.path.join(H, '..', '..', 'assets')
    def png(svg, boy): return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode(), output_width=boy, output_height=boy)))
    png(kare(1024, 60, BEY, LAC), 1024).convert('RGB').save(os.path.join(A, 'icon.png'), optimize=True)       # iOS: saydamlık yok
    png(kare(100, 68, BEY, LAC, rx=22), 48).save(os.path.join(A, 'favicon.png'), optimize=True)
    # Açılış: yazı kuralı (işaret yalnız simgede) → koyu zeminde beyaz "moyo Mercek" kilidi, tuvalin %86'sı (gen.py çıktısı)
    kilit = open(os.path.join(H, '..', '..', 'site', 'assets', 'logo', 'moyo-mercek-beyaz.svg')).read()
    vx, vy, vw, vh = [float(v) for v in re.search(r'viewBox="([^"]+)"', kilit).group(1).split()]
    T = 1024; w = 0.86 * T; k = w / vw; h = vh * k
    ic = kilit[kilit.index('<path'):kilit.rindex('</svg>')]
    tuval = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d"><g transform="translate(%.2f %.2f) scale(%.6f) translate(%s %s)">%s</g></svg>'
             % (T, T, (T - w) / 2, (T - h) / 2, k, -vx, -vy, ic))
    png(tuval, T).save(os.path.join(A, 'splash-icon.png'), optimize=True)
print('ok', sorted(f for f in os.listdir(OUT) if 'ikon' in f or 'favicon' in f))
