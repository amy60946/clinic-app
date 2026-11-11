#!/usr/bin/env python3
"""Önizleme derlemesinden alınan ekran görüntülerini tanıtım sayfası görsellerine keser (webp).

Kaynak görüntüler: DSF=2 NOEMU=1 W=1440 H=900 ONLY=training OUT=<D> node tools/qa/crawl.js   (masaüstü, 2x)
                   DSF=3 NOEMU=1 W=393 ONLY=training OUT=<M> node tools/qa/crawl.js          (telefon, 3x)
Kullanım: python3 tools/landing-alt/shots.py <D> <M>
Kutular ekranın kendi CSS pikselinde (masaüstü 1440x900, telefon 393 genişlik): x, y, genişlik, yükseklik.
"""
import sys
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
D, M = Path(sys.argv[1]), Path(sys.argv[2])
# anahtar: (masaüstü dosya, kutu) , (telefon dosya, kutu)
PICK = {
    'hero':  (('21-training-summary.png', (0, 0, 1344, 840)), ('21-training-summary.png', (0, 0, 393, 760))),
    's1':    (('02-library-item.png', (37, 0, 1366, 854)), ('01-library.png', (0, 0, 393, 760))),
    's2':    (None, ('25-training-preview-page.png', (0, 78, 393, 760))),
    's3':    (('30-behavior-abc.png', (312, 168, 1048, 655)), ('30-behavior-abc.png', (0, 348, 393, 760))),
    's4':    (('21-training-summary.png', (336, 75, 1000, 625)), ('21-training-summary.png', (0, 471, 393, 760))),
}

def cut(path, box, scale, size, out):
    im = Image.open(path).convert('RGB')
    x, y, w, h = [v * scale for v in box]
    h = min(h, im.height - y)
    im = im.crop((x, y, x + w, y + h)).resize(size, Image.LANCZOS)
    im.save(out, 'WEBP', quality=82, method=6)
    print(out.name, im.size, out.stat().st_size // 1024, 'KB')

if __name__ == '__main__':
    out = HERE / 'assets'; out.mkdir(exist_ok=True)
    for key, (d, m) in PICK.items():
        if d: cut(D / d[0], d[1], 2, (1600, 1000), out / f'{key}-d.webp')
        if m: cut(M / m[0], m[1], 3, (786, 1520), out / f'{key}-m.webp')
