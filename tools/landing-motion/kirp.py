# Telefona özel kırpımlar (kullanıcı kararı 22 Kasım 2026, "Telefona özel kırp"): yapılandırmadaki her satır için kaynak görüntünün
# (sol, üst, sağ, alt) kutusunu kırpar, en çok `en` piksel genişliğe indirir ve webp (kalite 86) yazar.
# Kullanım: python3 tools/landing-motion/kirp.py <kirp.json> [kaynak klasörü]
#   kirp.json: [{"kaynak": "...png|webp", "kutu": [l, t, r, b], "cikti": "yol.webp", "en": 900, "not": "..."}]; yollar json'un klasörüne göre,
#   "kaynak" göreli değilse ikinci bağımsız değişkendeki klasörden (ör. kare.js çıktısı) okunur.
import json, os, sys
from PIL import Image
cfg = sys.argv[1]; base = os.path.dirname(os.path.abspath(cfg)); kaynak_dir = sys.argv[2] if len(sys.argv) > 2 else base
for r in json.load(open(cfg, encoding='utf-8')):
    src = r['kaynak']
    src = os.path.join(base, src) if src.startswith(('.', 'img/', '../')) else os.path.join(kaynak_dir, src)
    im = Image.open(src).convert('RGB').crop(tuple(r['kutu']))
    en = r.get('en', 900)
    if im.width > en: im = im.resize((en, round(im.height * en / im.width)), Image.LANCZOS)
    out = os.path.join(base, r['cikti']); os.makedirs(os.path.dirname(out), exist_ok=True)
    im.save(out, 'WEBP', quality=86, method=6)
    print(f"{r['cikti']}: {im.width}×{im.height}, {os.path.getsize(out) // 1024} KB")
