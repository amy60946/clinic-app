# Moyo Oyun tanıtım videosu v2 (23 Kasım 2026): senaryo.json'daki sahneler → etiket + açıklama balonları → yumuşak geçişler → yükleme
# ekranı kapanışı → oyunun dışından tanıtım müziği (muzik_tanitim.py). Kullanım: python3 -I kurgu2.py senaryo.json <çıktı klasörü>
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from etiket import kapsul
from PIL import Image, ImageDraw, ImageFont, ImageFilter
SEN = json.load(open(sys.argv[1])); OUT = sys.argv[2]
W, H, FPS = 1280, 720, 30
X = SEN.get('gecis', 0.6)
FONT = '/workspace/amy60946/game-app/Assets/_Pofi/Resources/Fonts/Baloo2-ExtraBold.ttf'
HERE = os.path.dirname(os.path.abspath(__file__))
T = os.path.join(OUT, 'ara'); os.makedirs(T, exist_ok=True)
def ff(*a): subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], check=True)

def balon(metin, x, y, hx, hy, yon='sol'):
    """Açıklama balonu: krem kapsül (oyunun GoldKit kremi), kahve yazı, hedefe (hx, hy) giden ince çizgi + nokta. (x, y) balonun sol üstü."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    f = ImageFont.truetype(FONT, 30); tw = d.textlength(metin, font=f)
    w, h = int(tw + 40), 54
    # çizgi ve hedef noktası
    cx = x + (w if hx > x + w else 0 if hx < x else w // 2); cy = y + h // 2
    d.line((cx, cy, hx, hy), fill=(255, 255, 255, 235), width=4)
    d.ellipse((hx - 9, hy - 9, hx + 9, hy + 9), fill=(255, 255, 255, 240), outline=(0x6B, 0x3F, 0x0E, 230), width=3)
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
    d.text((x + 20, y + 6), metin, font=f, fill=(0x6B, 0x3F, 0x0E, 255))
    return im

parcalar, sureler, bolum = [], [], []
for i, s in enumerate(SEN['sahneler']):
    d = s['klasor']; n = len([f for f in os.listdir(d) if f.endswith('.png')])
    a, b = s.get('kirp', [0, n - 1]); b = min(b, n - 1)
    # dondur: [[klasördeki kare, saniye], …] o karede durur (anlatım balonu okunsun); süre ve balon zamanları buna göre
    dur = sorted(([f - a, round(sn * FPS)] for f, sn in s.get('dondur', [])), reverse=True)
    kare = b - a + 1 + sum(k for _, k in dur); sure = kare / FPS
    katman = []   # (png, başlangıç, bitiş) sahne içi saniye
    # mekân etiketleri: tek etiket (etiket/ust) ya da sahne içinde sırayla birkaç etiket (etiketler: [{metin, ust, bas, son}])
    ets = s.get('etiketler') or ([{'metin': s['etiket'], 'ust': s.get('ust'), 'bas': 0.45, 'son': sure - 0.4}] if s.get('etiket') else [])
    for j, et in enumerate(ets):
        e = os.path.join(T, f'e{i}_{j}.png'); kapsul(et['metin'], et.get('ust'), W, H, olcek=W / 1920).save(e)
        katman.append((e, et['bas'], min(et['son'], sure - 0.4)))
    for j, c in enumerate(s.get('balonlar', [])):
        e = os.path.join(T, f'b{i}_{j}.png'); balon(c['metin'], *c['kutu'], *c['hedef']).save(e)
        katman.append((e, c['bas'], min(c['son'], sure - 0.3)))
    girdi = ['-framerate', str(FPS), '-start_number', str(a), '-i', os.path.join(d, '%04d.png')]
    # maske: oyunun deneme düğmesi gibi gerçek sürümde olmayan parçalar çevresinden doldurulur (delogo; [x, y, g, y])
    # [x, y, g, y] ya da [x, y, g, y, ilk kare, son kare] (klasördeki kare numarası; yalnız o aralıkta)
    mf = ''.join(f',delogo=x={m[0]}:y={m[1]}:w={m[2]}:h={m[3]}' + (f":enable='between(n,{m[4] - a},{m[5] - a})'" if len(m) == 6 else '') for m in s.get('maske', []))
    lp = ''.join(f',loop=loop={k}:size=1:start={f}' for f, k in dur)
    fc = [f'[0:v]scale={W}:{H}:flags=lanczos{mf}{lp},setpts=N/({FPS}*TB),format=yuv420p[v0]']; son = '[v0]'
    for k, (png, t0, t1) in enumerate(katman):
        girdi += ['-loop', '1', '-t', f'{sure:.3f}', '-i', png]
        fc.append(f'[{k + 1}:v]format=rgba,fade=in:st={t0:.2f}:d=0.3:alpha=1,fade=out:st={max(t0 + 0.3, t1 - 0.3):.2f}:d=0.3:alpha=1[k{k}]')
        fc.append(f'{son}[k{k}]overlay=0:0:format=auto[v{k + 1}]'); son = f'[v{k + 1}]'
    o = os.path.join(T, f'p{i}.mp4')
    ff(*girdi, '-filter_complex', ';'.join(fc), '-map', son, '-frames:v', str(kare), '-r', str(FPS), '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', o)
    parcalar.append(o); sureler.append(sure); bolum.append(s.get('bolum', s.get('etiket', '')))
# kapanış: yükleme ekranı kareleri
kd = SEN['kapanis']; nk = len([f for f in os.listdir(kd) if f.endswith('.png')])
o = os.path.join(T, 'pk.mp4')
ff('-framerate', str(FPS), '-i', os.path.join(kd, '%04d.png'), '-frames:v', str(nk), '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', o)
parcalar.append(o); sureler.append(nk / FPS); bolum.append('Kapanış')
# geçişler (sahneye göre: varsayılan yumuşak geçiş; "gecis_tur" ile değişir)
girdi = sum((['-i', p] for p in parcalar), []); fc, onceki, t = [], '[0:v]', 0.0; zaman = [[bolum[0], 0.0]]
for i in range(1, len(parcalar)):
    t += sureler[i - 1] - X
    tur = SEN['sahneler'][i]['gecis_tur'] if i < len(SEN['sahneler']) and 'gecis_tur' in SEN['sahneler'][i] else 'fade'
    fc.append(f'{onceki}[{i}:v]xfade=transition={tur}:duration={X}:offset={t:.3f}[x{i}]'); onceki = f'[x{i}]'
    if bolum[i]: zaman.append([bolum[i], round(t + X / 2, 1)])
toplam = t + sureler[-1]
fc[-1] = fc[-1][:-len(onceki)] + '[xs]'; fc.append(f'[xs]fade=t=in:st=0:d=0.3,fade=t=out:st={toplam - 0.5:.2f}:d=0.5{onceki}')
birlesik = os.path.join(T, 'birlesik.mp4')
ff(*girdi, '-filter_complex', ';'.join(fc), '-map', onceki, '-c:v', 'libx264', '-crf', '12', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-r', str(FPS), birlesik)
# müzik: videonun uzunluğunda üretilir, sonda uzayan akor kapanışa denk gelir
muz_ham = os.path.join(T, 'muzik.wav'); muz = os.path.join(T, 'muzik-son.wav')
subprocess.run(['python3', '-I', os.path.join(HERE, 'muzik_tanitim.py'), muz_ham, f'{toplam + 0.5:.2f}'], check=True)
ff('-i', muz_ham, '-t', f'{toplam:.2f}', '-af', f'afade=t=in:d=0.4,afade=t=out:st={toplam - 1.2:.2f}:d=1.2,loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', muz)
cik = os.path.join(OUT, 'tanitim.mp4'); log = os.path.join(T, 'x264')
ff('-i', birlesik, '-c:v', 'libx264', '-b:v', '1900k', '-maxrate', '3200k', '-bufsize', '6000k', '-preset', 'slow', '-pass', '1', '-passlogfile', log, '-an', '-f', 'mp4', os.devnull)
ff('-i', birlesik, '-i', muz, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-b:v', '1900k', '-maxrate', '3200k', '-bufsize', '6000k', '-preset', 'slow', '-pass', '2', '-passlogfile', log,
   '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-t', f'{toplam:.2f}', cik)
json.dump({'sure': round(toplam, 2), 'bolum': zaman}, open(os.path.join(OUT, 'bolum.json'), 'w'), ensure_ascii=False)
print('tamam', round(toplam, 2), 'sn', os.path.getsize(cik), 'bayt', zaman)
