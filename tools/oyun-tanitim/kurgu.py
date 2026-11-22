# Tanıtım videosu: kare klasörleri → etiketli parçalar → yumuşak geçişler → kapanış kartı → oyunun müziği. python3 -I kurgu.py <klip kökü> <çıktı klasörü> <logo.png>
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from etiket import kapsul
from PIL import Image, ImageFilter, ImageEnhance
KOK, OUT, LOGO = sys.argv[1], sys.argv[2], sys.argv[3]
W, H, FPS, X = 1280, 720, 30, 0.4   # geçiş 0,4 sn
MUZIK = '/workspace/amy60946/game-app/Assets/_Pofi/Resources/Audio/music_island_pcm.bytes'   # 22050 Hz, mono, 16 bit
PARCA = [('harita', 'Pofi Adası', 'Moyo Oyun'), ('sahil', 'Sahil', None), ('tapinak', 'Tapınak', None), ('kulube', 'Oyun Kulübesi', None),
         ('kosu', 'Gezegen Koşusu', 'Oyun Kulübesi'), ('kamp', 'Kamp Alanı', None), ('magara', 'Mağara', None)]
# kırpım (ilk, son kare; denetim 22 Kasım: kamera yerleşmesi atlanır, durduktan sonrası kısalır)
KIRP = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kirpim.json')))
os.makedirs(OUT, exist_ok=True); T = os.path.join(OUT, 'ara'); os.makedirs(T, exist_ok=True)
def ff(*a): subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], check=True)
parcalar, sureler = [], []
for ad, metin, ust in PARCA:
    d = os.path.join(KOK, ad); n = len([f for f in os.listdir(d) if f.endswith('.png')])
    a, b = KIRP.get(ad, [0, n - 1]); b = min(b, n - 1); sure = (b - a + 1) / FPS
    et = os.path.join(T, f'e-{ad}.png'); kapsul(metin, ust, W, H, olcek=W / 1920).save(et)
    o = os.path.join(T, f'p-{ad}.mp4')
    ff('-framerate', str(FPS), '-start_number', str(a), '-i', os.path.join(d, '%04d.png'), '-loop', '1', '-t', f'{sure:.3f}', '-i', et,
       '-filter_complex', f'[0:v]scale={W}:{H}:flags=lanczos,format=yuv420p[v];[1:v]format=rgba,fade=in:st=0.45:d=0.4:alpha=1,fade=out:st={sure - 0.75:.2f}:d=0.35:alpha=1[e];[v][e]overlay=0:0:format=auto,format=yuv420p',
       '-frames:v', str(b - a + 1), '-r', str(FPS), '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', '-an', o)
    parcalar.append(o); sureler.append(sure)
# kapanış: son karenin bulanık, koyulaştırılmış hâli + Moyo Oyun kilidi (beyaz) + alt satır
son = '%04d.png' % min(KIRP.get(PARCA[-1][0], [0, 10**6])[1], len(os.listdir(os.path.join(KOK, PARCA[-1][0]))) - 1)
zemin = Image.open(os.path.join(KOK, PARCA[-1][0], son)).convert('RGB').resize((W, H)).filter(ImageFilter.GaussianBlur(22))
zemin = ImageEnhance.Brightness(zemin).enhance(0.55).convert('RGBA')
logo = Image.open(LOGO).convert('RGBA'); lw = int(W * 0.42); logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
zemin.alpha_composite(logo, ((W - lw) // 2, int(H * 0.36) - logo.height // 2))
from PIL import ImageDraw, ImageFont
f = ImageFont.truetype('/workspace/amy60946/game-app/Assets/_Pofi/Resources/Fonts/Baloo2-ExtraBold.ttf', int(H * 0.058))
dr = ImageDraw.Draw(zemin); alt = "Okti ile Pofi Adası"
dr.text(((W - dr.textlength(alt, font=f)) / 2, int(H * 0.52)), alt, font=f, fill=(255, 247, 224, 255))
kart = os.path.join(T, 'kapanis.png'); zemin.convert('RGB').save(kart)
o = os.path.join(T, 'p-kapanis.mp4'); KS = 3.2
ff('-i', kart, '-frames:v', str(int(KS * FPS)), '-vf', f"scale={W * 2}:{H * 2},zoompan=z='1+0.025*on/{int(KS * FPS)}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={int(KS * FPS)}:s={W}x{H}:fps={FPS},format=yuv420p",
   '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', o)
parcalar.append(o); sureler.append(KS)
# geçişler
girdi = sum((['-i', p] for p in parcalar), [])
fc, onceki, t = [], '[0:v]', 0.0
bolum = [[PARCA[0][1], 0.0]]
for i in range(1, len(parcalar)):
    t += sureler[i - 1] - X
    etk = f'[x{i}]'
    fc.append(f'{onceki}[{i}:v]xfade=transition=fade:duration={X}:offset={t:.3f}{etk}'); onceki = etk
    bolum.append([PARCA[i][1] if i < len(PARCA) else 'Kapanış', round(t + X / 2, 1)])
toplam = t + sureler[-1]
muz = os.path.join(T, 'muzik.wav')
ff('-f', 's16le', '-ar', '22050', '-ac', '1', '-i', MUZIK, '-t', f'{toplam:.2f}', '-af', f'afade=t=in:d=0.6,afade=t=out:st={toplam - 1.6:.2f}:d=1.6,volume=1.25', '-ar', '44100', '-ac', '2', muz)
cik = os.path.join(OUT, 'tanitim.mp4')
# iki geçişli, ~2,3 Mb/sn (oyunun dokulu görüntüsü crf ile 29 MB tutuyordu; sayfada ~8 MB)
ara_mp4 = os.path.join(T, 'birlesik.mp4')
fc[-1] = fc[-1][:-len(onceki)] + '[xs]'; fc.append(f'[xs]fade=t=in:st=0:d=0.3,fade=t=out:st={toplam - 0.5:.2f}:d=0.5{onceki}')
ff(*girdi, '-filter_complex', ';'.join(fc), '-map', onceki, '-c:v', 'libx264', '-crf', '12', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-r', str(FPS), ara_mp4)
log = os.path.join(T, 'x264')
ff('-i', ara_mp4, '-c:v', 'libx264', '-b:v', '2300k', '-maxrate', '3500k', '-bufsize', '5000k', '-preset', 'slow', '-pass', '1', '-passlogfile', log, '-an', '-f', 'mp4', os.devnull)
ff('-i', ara_mp4, '-i', muz, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-b:v', '2300k', '-maxrate', '3500k', '-bufsize', '5000k', '-preset', 'slow', '-pass', '2', '-passlogfile', log,
   '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-t', f'{toplam:.2f}', cik)
ff('-ss', f'{sureler[0] + sureler[1] - X - 1.6:.2f}', '-i', cik, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '82', os.path.join(OUT, 'tanitim.webp'))
json.dump({'sure': round(toplam, 2), 'bolum': bolum}, open(os.path.join(OUT, 'bolum.json'), 'w'), ensure_ascii=False)
print('tamam', round(toplam, 2), 'sn', os.path.getsize(cik), 'bayt', bolum)
