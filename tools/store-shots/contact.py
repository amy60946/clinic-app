# final/_contact.jpg: all 15 final screenshots as labelled thumbnails (<= 2 MB)
from PIL import Image, ImageDraw, ImageFont
import os
F = 'final'
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 20)
head = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 28)
ipad = sorted(f for f in os.listdir(F) if f.startswith('ipad-') and f.endswith('.png'))
iphone = sorted(f for f in os.listdir(F) if f.startswith('iphone-') and f.endswith('.png'))
PAD, LAB = 28, 34
TW, TH = 640, 480            # iPad thumb (4:3)
PW, PH = 300, 652            # iPhone thumb (1320:2868)
W = PAD + 4 * (TW + PAD)
H = PAD + 44 + 2 * (TH + LAB + PAD) + 44 + (PH + LAB + 18 + PAD)
sheet = Image.new('RGB', (W, H), (255, 255, 255))
d = ImageDraw.Draw(sheet)
y = PAD
d.text((PAD, y), 'iPad 13" (2752×2064)', font=head, fill=(15, 27, 61)); y += 44
for i, f in enumerate(ipad):
    x = PAD + (i % 4) * (TW + PAD)
    yy = y + (i // 4) * (TH + LAB + PAD)
    im = Image.open(f'{F}/{f}').convert('RGB'); im.thumbnail((TW, TH), Image.LANCZOS)
    sheet.paste(im, (x, yy)); d.rectangle([x - 1, yy - 1, x + im.width, yy + im.height], outline=(200, 204, 214))
    d.text((x, yy + im.height + 6), f, font=font, fill=(40, 40, 40))
y += 2 * (TH + LAB + PAD)
d.text((PAD, y), 'iPhone 6.9" (1320×2868)', font=head, fill=(15, 27, 61)); y += 44
gap = (W - PAD * 2 - 7 * PW) // 6
for i, f in enumerate(iphone):
    x = PAD + i * (PW + gap)
    im = Image.open(f'{F}/{f}').convert('RGB'); im.thumbnail((PW, PH), Image.LANCZOS)
    sheet.paste(im, (x, y)); d.rectangle([x - 1, y - 1, x + im.width, y + im.height], outline=(200, 204, 214))
    small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
    label = f
    if d.textlength(label, font=small) > PW + gap - 6:
        cut = label.rfind('-', 0, 26) + 1          # wrap after a hyphen
        lines = [label[:cut], label[cut:]]
    else:
        lines = [label]
    for k, line in enumerate(lines):
        d.text((x, y + im.height + 6 + 18 * k), line, font=small, fill=(40, 40, 40))
for q in (88, 82, 75, 68):
    sheet.save(f'{F}/_contact.jpg', quality=q, optimize=True)
    if os.path.getsize(f'{F}/_contact.jpg') <= 2_000_000: break
print(sheet.size, q, os.path.getsize(f'{F}/_contact.jpg'))
