# denetim.py <video.mp4> <şablon.png> <x1,y1,x2,y2> [şerit_y,şerit_h] : görüntü/ses sayısal denetimi + 12 karelik kontak sayfası
#  - deneme düğmesi: her karede kutuda (±16 px kaydırarak) şablonla NCC; en yüksek değer ve eşiği geçen kareler
#  - siyah kare: oyun görüntüsü alanının ortalama parlaklığı (şerit varsa yalnız şerit); sahne geçişlerinde ve her yerde en düşük
#  - ses: tümleşik ses yüksekliği, gerçek tepe, 100 ms RMS en düşük değeri (baştaki 0,5 sn ve sondaki 1,5 sn hariç)
import sys, json, subprocess, os, numpy as np
from PIL import Image, ImageDraw, ImageFont
v, tp, box = sys.argv[1], sys.argv[2], [int(x) for x in sys.argv[3].split(',')]
bant = [int(x) for x in sys.argv[4].split(',')] if len(sys.argv) > 4 else None
pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_frames', '-of', 'json', v],
                               capture_output=True, text=True).stdout)['streams'][0]
W, H, N = pr['width'], pr['height'], int(pr['nb_frames'])
x1, y1, x2, y2 = box
T = np.asarray(Image.open(tp).convert('L'), np.float32); T = T - T.mean(); tn = np.sqrt((T * T).sum()); th, tw = T.shape
p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', v, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
fs = W * H * 3; ncc_max, hits, lum, picks = [], [], [], set(round(i * (N - 1) / 11) for i in range(12)); kare = {}
for n in range(N):
    a = np.frombuffer(p.stdout.read(fs), np.uint8).reshape(H, W, 3)
    g = a.mean(2).astype(np.float32)
    best = -1
    for dy in range(-16, 17, 4):
        for dx in range(-16, 17, 4):
            yy, xx = y1 + dy, x1 + dx
            if yy < 0 or xx < 0 or yy + th > H or xx + tw > W: continue
            R = g[yy:yy + th, xx:xx + tw]; R = R - R.mean(); d = np.sqrt((R * R).sum()) * tn
            if d > 0: best = max(best, float((R * T).sum() / d))
    ncc_max.append(best)
    if best > 0.5: hits.append((n, round(best, 2)))
    reg = g[bant[0]:bant[0] + bant[1]] if bant else g
    lum.append(float(reg.mean()))
    if n in picks: kare[n] = a.copy()
p.wait()
lum = np.array(lum)
print(f'{os.path.basename(v)}: {W}x{H}, {N} kare')
print(f'  deneme düğmesi: en yüksek NCC {max(ncc_max):.3f}; 0,5 üstü kare: {len(hits)} {hits[:8]}')
print(f'  parlaklık: en düşük {lum.min():.1f} (kare {int(lum.argmin())}); ilk kare {lum[0]:.1f}; son kare {lum[-1]:.1f}; 20 altı kareler: '
      f'{[int(i) for i in np.where(lum < 20)[0]][:40]}')
# ses
r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', v, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
s = r[r.rfind('Summary:'):]
I = s.split('I:')[1].split('LUFS')[0].strip(); TP = s.split('Peak:')[1].split('dBFS')[0].strip()
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', v, '-map', '0:a', '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], capture_output=True).stdout
au = np.frombuffer(raw, '<i2').astype(np.float64) / 32768; w = 800; k = len(au) // w
rms = 20 * np.log10(np.sqrt((au[:k * w].reshape(k, w) ** 2).mean(1)) + 1e-9)
mid = rms[5:k - 15]
print(f'  ses: {I} LUFS, gerçek tepe {TP} dBTP, süre {len(au) / 8000:.2f} sn; 100 ms RMS (0,5 sn – son−1,5 sn) en düşük {mid.min():.1f} dB '
      f'({(5 + int(mid.argmin())) / 10:.1f} sn), ortanca {np.median(mid):.1f} dB; −35 dB altı pencere: {int((mid < -35).sum())}')
# kontak sayfası
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
tw2 = 420; th2 = round(tw2 * H / W); ks = sorted(kare)
sh = Image.new('RGB', (tw2 * 4, (th2 + 22) * 3), (24, 24, 24)); d = ImageDraw.Draw(sh)
for i, n in enumerate(ks):
    x, y = (i % 4) * tw2, (i // 4) * (th2 + 22)
    sh.paste(Image.fromarray(kare[n]).resize((tw2, th2), Image.LANCZOS), (x, y + 22)); d.text((x + 6, y + 3), f'{n / 30:.2f} sn (kare {n})', fill=(255, 255, 255), font=f)
out = os.path.splitext(v)[0] + '-kontak.jpg'; sh.save(out, quality=84); print('  kontak:', out)
json.dump({'lum': lum.round(1).tolist(), 'ncc': [round(x, 3) for x in ncc_max]}, open(os.path.splitext(v)[0] + '-denetim.json', 'w'))
