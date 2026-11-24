# (v3 kopyası: alt/sol konum seçeneği eklendi) Mekân etiketi: oyunun krem kapsülü (GoldKit Cream: #FFF7E0 → #F2D79A, yazı #6B3F0E), Baloo 2 ExtraBold. Saydam PNG, 1920×1080 kare.
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
FONT = '/workspace/amy60946/game-app/Assets/_Pofi/Resources/Fonts/Baloo2-ExtraBold.ttf'
def kapsul(metin, ust=None, W=1920, H=1080, olcek=1.0, yer='sol-alt', alt=None, sol=None):
    # alt: alt kenardan boşluk (px, varsayılan 72×ölçek); sol: soldan boşluk (sol-alt için)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    f = ImageFont.truetype(FONT, int(64 * olcek)); fu = ImageFont.truetype(FONT, int(40 * olcek))
    d = ImageDraw.Draw(im)
    tw = d.textlength(metin, font=f); uw = d.textlength(ust, font=fu) if ust else 0
    px, py = int(44 * olcek), int(18 * olcek)
    w = int(max(tw, uw) + 2 * px); h = int(64 * olcek * 1.25 + (40 * olcek * 1.15 if ust else 0) + 2 * py)
    x0 = (int(72 * olcek) if sol is None else sol) if yer == 'sol-alt' else (W - w) // 2; y0 = H - h - (int(72 * olcek) if alt is None else alt)
    # gölge
    g = Image.new('RGBA', (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
    gd.rounded_rectangle((x0, y0 + 8, x0 + w, y0 + h + 8), radius=h // 2 if not ust else int(40 * olcek), fill=(40, 22, 4, 150))
    g = g.filter(ImageFilter.GaussianBlur(9)); im.alpha_composite(g)
    # krem dikey geçiş
    k = Image.new('RGBA', (w, h)); kd = ImageDraw.Draw(k)
    for yy in range(h):
        t = yy / max(1, h - 1); c = tuple(int(a + (b - a) * t) for a, b in zip((0xFF, 0xF7, 0xE0), (0xF2, 0xD7, 0x9A)))
        kd.line((0, yy, w, yy), fill=c + (255,))
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius=h // 2 if not ust else int(40 * olcek), fill=255)
    im.paste(k, (x0, y0), m)
    d = ImageDraw.Draw(im)
    r = h // 2 if not ust else int(40 * olcek); k2 = max(2, int(2 * olcek))
    d.rounded_rectangle((x0 - k2, y0 - k2, x0 + w - 1 + k2, y0 + h - 1 + k2), radius=r + k2, outline=(0x6B, 0x3F, 0x0E, 200), width=k2)
    d.rounded_rectangle((x0, y0, x0 + w - 1, y0 + h - 1), radius=r, outline=(255, 255, 255, 235), width=max(2, int(3 * olcek)))
    y = y0 + py - int(6 * olcek)
    if ust: d.text((x0 + px, y), ust, font=fu, fill=(0x86, 0x55, 0x1C, 255)); y += int(40 * olcek * 1.15)
    d.text((x0 + px, y), metin, font=f, fill=(0x6B, 0x3F, 0x0E, 255))
    return im
if __name__ == '__main__':
    out, metin = sys.argv[1], sys.argv[2]; ust = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else None
    kapsul(metin, ust).save(out)
