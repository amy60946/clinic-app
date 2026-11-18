# PNG → webp, verilen genişliğe küçültür. Kullanım: python3 kucult.py <girdi.png> <çıktı.webp> <genişlik>
import sys
from PIL import Image
src, out, w = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert('RGB')
h = round(im.height * w / im.width)
im.resize((w, h), Image.LANCZOS).save(out, 'WEBP', quality=86, method=6)
print('ok', out, f'{w}x{h}')
