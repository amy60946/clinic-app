# Moyo Oyun videoları v3 (24 Kasım 2026): mağaza önizlemeleri (iPhone 1920×886, iPad 1600×1200, doğal çözünürlük) ve tanıtım videosu v3
# (1280×720). tools/oyun-tanitim/kurgu2.py'den türedi; kareler Python'da birleştirilir (maske, yerleşim, etiket, balon, geçiş), ffmpeg'e
# ham kare olarak gider. Müzik tek parça: muzik_v3.py videonun tam uzunluğunda bir kez üretilir, sahnelere bölünmez.
# Kullanım: python3 -I kurgu_v3.py senaryo.json çıktı.mp4
import json, os, sys, subprocess, re, math
import numpy as np
from multiprocessing import Pool
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from etiket import kapsul
import maske

SEN = json.load(open(sys.argv[1])); CIK = sys.argv[2]
KOK = os.path.dirname(os.path.abspath(sys.argv[1]))
W, H = SEN['boyut']; FPS = 30
XF = round(SEN.get('gecis', 0.35) * FPS)                 # geçiş kare sayısı
BANT = SEN.get('bant')                                     # {"y": 64, "h": 591}: oyun görüntüsü bu şeritte, üst/alt siyah
FONT = '/workspace/amy60946/game-app/Assets/_Pofi/Resources/Fonts/Baloo2-ExtraBold.ttf'
ARA = CIK + '.ara'; os.makedirs(ARA, exist_ok=True)
def ff(*a): subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], check=True)
def yol(p): return p if os.path.isabs(p) else os.path.join(KOK, p)

def balon(metin, x, y, hx, hy, K=1.0):
    """Açıklama balonu (kurgu2.py ile aynı): krem kapsül, kahve yazı, hedefe (hx, hy) giden çizgi + nokta. (x, y) sol üst köşe."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    f = ImageFont.truetype(FONT, int(30 * K)); tw = d.textlength(metin, font=f)
    w, h = int(tw + 40 * K), int(54 * K)
    cx = x + (w if hx > x + w else 0 if hx < x else w // 2); cy = y + h // 2
    d.line((cx, cy, hx, hy), fill=(255, 255, 255, 235), width=max(3, int(4 * K)))
    r = int(9 * K); d.ellipse((hx - r, hy - r, hx + r, hy + r), fill=(255, 255, 255, 240), outline=(0x6B, 0x3F, 0x0E, 230), width=3)
    g = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(g).rounded_rectangle((x, y + 6, x + w, y + h + 6), radius=h // 2, fill=(40, 22, 4, 140))
    im.alpha_composite(g.filter(ImageFilter.GaussianBlur(7)))
    k = Image.new('RGBA', (w, h)); kd = ImageDraw.Draw(k)
    for yy in range(h):
        tt = yy / (h - 1); kd.line((0, yy, w, yy), fill=tuple(int(a + (b - a) * tt) for a, b in zip((0xFF, 0xF7, 0xE0), (0xF2, 0xD7, 0x9A))) + (255,))
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius=h // 2, fill=255)
    im.paste(k, (x, y), m)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((x - 2, y - 2, x + w + 1, y + h + 1), radius=h // 2 + 2, outline=(0x6B, 0x3F, 0x0E, 200), width=2)
    d.rounded_rectangle((x, y, x + w - 1, y + h - 1), radius=h // 2, outline=(255, 255, 255, 235), width=3)
    d.text((x + int(20 * K), y + int(6 * K)), metin, font=f, fill=(0x6B, 0x3F, 0x0E, 255))
    return im, (x, y, x + w, y + h)

def katman(im):
    """RGBA tuval → (x0, y0, rgb float, alfa float) yalnız dolu kutuda (hız için)."""
    bb = im.getbbox(); a = np.asarray(im.crop(bb), np.float32) / 255.0
    return (bb[0], bb[1], a[..., :3] * 255.0, a[..., 3:4])

# ---- sahneler: kare listesi, yerleşim, katmanlar
SAH = []
for i, s in enumerate(SEN['sahneler']):
    d = yol(s['klasor']); n = len([f for f in os.listdir(d) if f.endswith('.png') and f[:4].isdigit()])
    a, b = s.get('kirp', [0, n - 1]); b = min(b, n - 1)
    kareler = []
    don = {f: round(sn * FPS) for f, sn in s.get('dondur', [])}
    for f in range(a, b + 1):
        kareler.append(f); kareler += [f] * don.get(f, 0)
    sure = len(kareler) / FPS
    kat = []
    for et in s.get('etiketler', []):
        ol = et.get('olcek', SEN.get('etiket_olcek', 1280 / 1920))
        im = kapsul(et['metin'], et.get('ust'), W, H, olcek=ol, yer=et.get('yer', 'sol-alt'), alt=et.get('alt'), sol=et.get('sol'))
        kat.append((katman(im), et['bas'], min(et['son'], sure)))
    for c in s.get('balonlar', []):
        im, kutu = balon(c['metin'], *c['kutu'], *c['hedef'], K=SEN.get('balon_olcek', 1.0))
        if kutu[2] > W - 4 or kutu[0] < 4: print('UYARI: balon taşıyor', c['metin'], kutu)
        kat.append((katman(im), c['bas'], min(c['son'], sure)))
    SAH.append(dict(d=d, kareler=kareler, yer=s.get('yerlesim', 'tam'), kirp_y=s.get('kirp_y', 0), karart=s.get('alt_karart'), maske=s.get('maske', False), kat=kat,
                    ad=s.get('bolum', ''), xs=round(s['gecis'] * FPS) if 'gecis' in s else XF))
SON = SEN.get('son', {})
if SON.get('tut'):                                           # son kareyi tut (soluk kapanış için)
    SAH[-1]['kareler'] += [SAH[-1]['kareler'][-1]] * round(SON['tut'] * FPS)
BAS = []; t = 0                                            # sahne i, önceki sahneyle SAH[i]['xs'] kare üst üste biner
for i, s in enumerate(SAH):
    if i: t -= s['xs']
    BAS.append(t); t += len(s['kareler'])
TOPLAM = t
GIRIS = round(SEN.get('giris_karar', 0) * FPS)            # baştan siyahtan açılış (kare)
SOLUK = round(SON.get('soluk', 0) * FPS)                   # sonda siyaha kararma (kare)

_cache = {}
def kaynak(si, f):
    key = (si, f)
    if key in _cache: return _cache[key]
    s = SAH[si]; im = Image.open(os.path.join(s['d'], f'{f:04d}.png')).convert('RGB')
    a = np.asarray(im)
    if s['maske']: a, _ = maske.uygula(a)
    if s['yer'] == 'tam':
        assert a.shape[1] == W and a.shape[0] == H, (s['d'], a.shape)
        tuv = a.astype(np.float32)
    else:
        tuv = np.zeros((H, W, 3), np.float32)
        if s['yer'] == 'bant':                               # tümü şeride sığar (oran korunur: 1920×886 → 1280×591)
            r = np.asarray(Image.fromarray(a).resize((W, BANT['h']), Image.LANCZOS), np.float32)
        else:                                                # 'bant-kirp': 1280×720 kaynaktan şerit yüksekliğinde satırlar
            r = a[s['kirp_y']:s['kirp_y'] + BANT['h']].astype(np.float32)
            if s['karart']:                                  # şeridin altında kesilen düğmeler (çubuk, Zıpla) siyaha yumuşakça kaybolur
                f0, f1 = s['karart']                         # [başlangıç satırı, tam siyah satırı] (şerit içinde)
                yy = np.arange(r.shape[0], dtype=np.float32)
                m = np.clip((f1 - yy) / (f1 - f0), 0, 1) ** 1.3
                r *= m[:, None, None]
        tuv[BANT['y']:BANT['y'] + BANT['h']] = r
    if len(_cache) > 6: _cache.pop(next(iter(_cache)))
    _cache[key] = tuv
    return tuv

def sahne_kare(si, j):
    s = SAH[si]; img = kaynak(si, s['kareler'][j]).copy(); tl = j / FPS
    for (x0, y0, rgb, al), t0, t1 in s['kat']:
        k = min(1.0, max(0.0, (tl - t0) / 0.3), max(0.0, (t1 - tl) / 0.3))
        if k <= 0: continue
        h, w = al.shape[:2]; reg = img[y0:y0 + h, x0:x0 + w]; aa = al * k
        img[y0:y0 + h, x0:x0 + w] = reg * (1 - aa) + rgb * aa
    return img

def kare(n):
    act = [i for i in range(len(SAH)) if BAS[i] <= n < BAS[i] + len(SAH[i]['kareler'])]
    if len(act) == 1: img = sahne_kare(act[0], n - BAS[act[0]])
    else:
        i, j = act[0], act[1]; w = (n - BAS[j] + 1) / (SAH[j]['xs'] + 1)
        img = sahne_kare(i, n - BAS[i]) * (1 - w) + sahne_kare(j, n - BAS[j]) * w
    g = 1.0
    if GIRIS and n < GIRIS: g = min(g, (n + 1) / (GIRIS + 1))
    if SOLUK and n >= TOPLAM - SOLUK: g = min(g, (TOPLAM - n - 1) / SOLUK)
    if g < 1: img = img * g
    return np.clip(img + 0.5, 0, 255).astype(np.uint8).tobytes()

if __name__ == '__main__':
    print('kare', TOPLAM, 'süre', round(TOPLAM / FPS, 3), 'sn; sahne başları', [round(b / FPS, 2) for b in BAS])
    # 1) görüntü: ham kareler → neredeyse kayıpsız ara dosya (BT.709)
    ara = os.path.join(ARA, 'ara.mp4')
    if os.environ.get('YALNIZ_SES') == '1' and os.path.exists(ara): print('görüntü ara dosyası yeniden kullanılıyor')
    else:
     enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-crf', '8', '-preset', 'fast',
                            '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', ara], stdin=subprocess.PIPE)
     with Pool(4) as p:
        for k, buf in enumerate(p.imap(kare, range(TOPLAM), chunksize=6)):
            enc.stdin.write(buf)
            if k % 150 == 0: print('  kare', k, flush=True)
     enc.stdin.close(); assert enc.wait() == 0
    sure = TOPLAM / FPS
    # 2) müzik: tek parça, videonun uzunluğunda; son vuruş istenen ana denk gelir
    mz = SEN.get('muzik', {})
    son_t = None
    if 'son_vurus' in mz:
        sv = mz['son_vurus']; son_t = BAS[sv['sahne'] if sv['sahne'] >= 0 else len(SAH) + sv['sahne']] / FPS + sv['t']
    ham = os.path.join(ARA, 'muzik-ham.wav')
    cmd = ['python3', '-I', os.path.join(HERE, 'muzik_v3.py'), ham, f'{sure + 0.6:.3f}', '--giris', str(mz.get('giris', 1))]
    if son_t: cmd += ['--son', f'{son_t:.3f}']
    print(subprocess.run(cmd, check=True, capture_output=True, text=True).stdout.strip())
    ac = f"afade=t=in:d={mz.get('ac', 0.3)},afade=t=out:st={sure - mz.get('kapa', 1.2):.3f}:d={mz.get('kapa', 1.2)}"
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', ham, '-t', f'{sure:.3f}', '-af', ac + ',loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    m = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', r.stderr).group(0))
    ln = (f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
          f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    muz = os.path.join(ARA, 'muzik.wav')
    ff('-i', ham, '-t', f'{sure:.3f}', '-af', ac + ',' + ln, '-ar', '48000', '-ac', '2', muz)
    # 3) son kodlama: iki geçişli H.264 (High), AAC; boyut sınırına göre bit hızı
    ses = SEN.get('ses', '256k'); sk = int(ses[:-1]) * 1000
    hedef = SEN.get('hedef_mb', 14.2) * 8e6 / sure
    bit = int((hedef - sk - 40000) * 0.97); tavan = int(bit * SEN.get('tavan_kat', 1.6))
    log = os.path.join(ARA, 'x264')
    ortak = ['-c:v', 'libx264', '-b:v', str(bit), '-maxrate', str(tavan), '-bufsize', str(tavan * 2), '-preset', 'slow', '-profile:v', 'high',
             '-level', SEN.get('level', '4.0'), '-g', '60', '-pix_fmt', 'yuv420p', '-r', str(FPS),
             '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']
    ff('-i', ara, *ortak, '-pass', '1', '-passlogfile', log, '-an', '-f', 'mp4', os.devnull)
    ff('-i', ara, '-i', muz, '-map', '0:v', '-map', '1:a', *ortak, '-pass', '2', '-passlogfile', log,
       '-c:a', 'aac', '-b:a', ses, '-ar', '48000', '-ac', '2', '-movflags', '+faststart', '-t', f'{sure:.3f}', CIK)
    json.dump({'sure': round(sure, 3), 'sahneler': [[s['ad'], round(BAS[i] / FPS, 2)] for i, s in enumerate(SAH)],
               'son_vurus': round(son_t, 3) if son_t else None, 'bit': bit}, open(CIK + '.json', 'w'), ensure_ascii=False, indent=1)
    print('tamam', CIK, os.path.getsize(CIK), 'bayt', round(sure, 2), 'sn')
