# maske.py: oyunun deneme sürümündeki "Ebeveyn (deneme)" düğmesini (mağaza sürümünde yok) görevler panosu karelerinde çevresinden doldurur.
# Düğme panoya bağlı: pano açılırken (100–108. kareler) aşağıdan kayıp büyüyerek gelir. Her karede panonun üst kenarı (pt: tam krem satır)
# bulunur, düğmenin satırları ona göre hesaplanır: iPhone [pt-82, pt-6] × [790, 1130], iPad [pt-113, pt-8] × [575, 1024].
# Doldurma: her satırda soldaki ve sağdaki gökyüzü sütunu arasında doğrusal geçiş (pano zemini dikey gökyüzü geçişi).
import numpy as np
CFG = {(1920, 886): dict(wx=(600, 1320), x=(790, 1130), dy=(82, 6), serit=(495, 590)),
       (1600, 1200): dict(wx=(480, 1000), x=(575, 1024), dy=(113, 8), serit=(125, 248))}
# serit: pano zemininin üst kenarındaki ince açık renkli şerit (satır 0–5); o da yatay geçişle gökyüzüyle doldurulur

def panel_top(a, wx, ymax=500):
    r, b = a[:ymax, wx[0]:wx[1], 0].astype(int), a[:ymax, wx[0]:wx[1], 2].astype(int)
    full = ((r > b + 20) & (r > 180)).mean(1) >= 0.9
    ys = np.where(full)[0]
    return int(ys[0]) if len(ys) else None

def kutu(a):
    """Bu karede maskelenecek kutu (x0, y0, x1, y1) ya da None (pano yoksa / düğme görünmüyorsa)."""
    c = CFG[(a.shape[1], a.shape[0])]
    pt = panel_top(a, c['wx'])
    if pt is None or pt > 200: return None, pt
    y0, y1 = 0, pt - c['dy'][1]          # üst kenara kadar (kenarda ince şerit kalmasın)
    x0, x1 = c['x']
    # iki yandaki sütun gökyüzü olmalı (pano henüz saydamken düğme görünmez, maske de yok)
    for x in (x0 - 1, x1 + 1):
        col = a[y0:y1 + 1, x].astype(int)
        if (col[:, 2] > col[:, 0] + 15).mean() < 0.99: return None, pt
    return (x0, y0, x1, y1), pt

def doldur(a, k):
    x0, y0, x1, y1 = k
    out = a.copy().astype(np.float32)
    L = out[y0:y1 + 1, x0 - 1]; R = out[y0:y1 + 1, x1 + 1]
    t = np.linspace(0, 1, x1 - x0 + 3)[1:-1][None, :, None]
    out[y0:y1 + 1, x0:x1 + 1] = L[:, None, :] * (1 - t) + R[:, None, :] * t
    return np.clip(out + 0.5, 0, 255).astype(np.uint8)

def uygula(a):
    k, pt = kutu(a)
    if not k: return a, None
    b = doldur(a, k)
    sx = CFG[(a.shape[1], a.shape[0])]['serit']
    return doldur(b, (sx[0], 0, sx[1], 6)), k
