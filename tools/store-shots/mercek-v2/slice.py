import os, sys
from PIL import Image
K = os.path.dirname(os.path.abspath(__file__))
for dev, (w, h) in {'iphone': (1206, 2622), 'ipad': (2064, 2752)}.items():
    p = os.path.join(K, f'pano-{dev}.png')
    if not os.path.exists(p): continue
    im = Image.open(p).convert('RGB'); os.makedirs(os.path.join(K, dev), exist_ok=True)
    n = im.size[0] // w
    assert im.size == (w * n, h) and n == 8, im.size
    for i in range(n):
        im.crop((i * w, 0, (i + 1) * w, h)).save(os.path.join(K, dev, f'{dev}_{i + 1:02d}.jpg'), quality=90)
    print(dev, 'ok')
