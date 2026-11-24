# İmleci kayıttan sonra çizer (MOTION_IMLEC=sonra, 24 Kasım 2026): kayıtta sayfadaki imleç gizlidir; her video karesine imlecin
# planlanan yeri (kit.js sequence → imlec.json: [x, y, son basmadan bu yana ms]) ve basma halkası çizilir. Kare kaçsa da imleç akıcı kayar.
# Kullanım: python3 imlec.py <seq> <çıktı> <imlec.json> <imlec.png> <görsel/kare pikseli> <kare/CSS pikseli>
import json, os, sys
from PIL import Image, ImageDraw

seq, out, plan_f, sprite_f, ratio, scale = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], float(sys.argv[5]), float(sys.argv[6])
plan = json.load(open(plan_f))
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    os.remove(os.path.join(out, f))

sp = Image.open(sprite_f).convert('RGBA')
sp = sp.resize((round(sp.width / ratio), round(sp.height / ratio)), Image.LANCZOS)
HX, HY = 13 * scale, 11 * scale                                   # okun ucu (SVG kutusu 8 px içeride, ok ucu 5 × 3)
basik = sp.resize((round(sp.width * .88), round(sp.height * .88)), Image.LANCZOS)   # basarken ok ucunun çevresinde %88


def halka(yas):
    # inject.js .__lm-ring: 24 px, 2 px kenar rgba(15,27,61,.55), dolgu rgba(15,27,61,.10); 450 ms'de 1 → 1,92 kat, saydamlık .95 → 0
    p = min(1, yas / 450)
    e = 1 - (1 - p) ** 3
    r = 12 * (1 + .92 * e) * scale
    a = .95 * (1 - e)
    S = 4
    n = int(r * 2 + 6)
    im = Image.new('RGBA', (n * S, n * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c = n * S / 2
    d.ellipse([c - r * S, c - r * S, c + r * S, c + r * S], fill=(15, 27, 61, int(255 * .10 * a)), outline=(15, 27, 61, int(255 * .55 * a)), width=int(2 * scale * S))
    return im.resize((n, n), Image.LANCZOS), n / 2


names = sorted(os.listdir(seq))
assert len(names) == len(plan), (len(names), len(plan))
for name, (x, y, yas) in zip(names, plan):
    src = os.path.join(seq, name)
    im = Image.open(src).convert('RGBA')
    px, py = x * scale, y * scale
    if 0 <= yas < 450:
        h, c = halka(yas)
        im.alpha_composite(h, (round(px - c), round(py - c)))
    if 0 <= yas < 95:
        im.alpha_composite(basik, (round(px - HX * .88), round(py - HY * .88)))
    else:
        im.alpha_composite(sp, (round(px - HX), round(py - HY)))
    dst = os.path.join(out, name)
    if name.endswith('.png'):
        im.convert('RGB').save(dst)
    else:
        im.convert('RGB').save(dst, 'JPEG', quality=95, subsampling=0)
print(len(names), 'kare')
