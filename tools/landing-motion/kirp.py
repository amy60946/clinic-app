# Telefona özel kırpımlar (kullanıcı kararı 22 Kasım 2026, "Telefona özel kırp"): yapılandırmadaki her satır için kaynak görüntünün
# (sol, üst, sağ, alt) kutusunu kırpar, en çok `en` piksel genişliğe indirir ve webp (kalite 86) yazar.
# Kullanım: python3 tools/landing-motion/kirp.py <kirp.json> [kaynak klasörü]
#   kirp.json: [{"kaynak": "...png|webp", "kutu": [l, t, r, b] | "parcalar": [[l, t, r, b], …] + "ayrac": 4, "cikti": "yol.webp", "en": 900, "not": "..."}]; yollar json'un klasörüne göre,
#   "kaynak" göreli değilse ikinci bağımsız değişkendeki klasörden (ör. kare.js çıktısı) okunur.
import json, os, sys
from PIL import Image
cfg = sys.argv[1]; base = os.path.dirname(os.path.abspath(cfg)); kaynak_dir = sys.argv[2] if len(sys.argv) > 2 else base
for r in json.load(open(cfg, encoding='utf-8')):
    src = r['kaynak']
    src = os.path.join(base, src) if src.startswith(('.', 'img/', '../')) else os.path.join(kaynak_dir, src)
    kaynak_im = Image.open(src).convert('RGB')
    if 'parcalar' in r:
        # Yan yana birleşik kırpım (ör. adım adları + gün ızgarası: ekranda ~1300 px uzak): parçalar aynı satır aralığından,
        # aralarında `ayrac` px açık gri çizgi. Ekrandaki öğeler değişmez, yalnız aradaki sütunlar çıkar.
        ps = [kaynak_im.crop(tuple(k)) for k in r['parcalar']]; ay = r.get('ayrac', 4)
        im = Image.new('RGB', (sum(x.width for x in ps) + ay * (len(ps) - 1), max(x.height for x in ps)), (226, 228, 233))
        x0 = 0
        for x in ps: im.paste(x, (x0, 0)); x0 += x.width + ay
    else:
        im = kaynak_im.crop(tuple(r['kutu']))
    en = r.get('en', 900)
    if im.width > en: im = im.resize((en, round(im.height * en / im.width)), Image.LANCZOS)
    out = os.path.join(base, r['cikti']); os.makedirs(os.path.dirname(out), exist_ok=True)
    im.save(out, 'WEBP', quality=86, method=6)
    print(f"{r['cikti']}: {im.width}×{im.height}, {os.path.getsize(out) // 1024} KB")
