# Moyo Oyun tanıtım müziği, v3 düzeni (kopya: tools/oyun-tanitim/muzik_tanitim.py; çalgılar ve motifler aynı, telifsiz, kodla).
# Değişenler (kullanıcı geri bildirimi 24 Kasım 2026: "müzik tek parça olsun, sahne geçişlerinde kopmasın"):
#  - giriş kısa (varsayılan 1 ölçü) ve davul yumuşak girer; parça baştan sona tek akış, sahnelere bağlı hiçbir kesme yok
#  - "--son T": son vuruş + uzayan akor tam T saniyeye düşer (tempo 118 BPM'e en yakın tam ölçü sayısına göre hafifçe ayarlanır)
#  - son vuruştan önceki ölçüde davul yükselişi; 8 ölçüde bir yükseliş daha hafif
# Kullanım: python3 -I muzik_v3.py çıktı.wav saniye [--giris N] [--son T]
import sys, math, subprocess
import numpy as np
SR = 44100
rng = np.random.default_rng(23)
OUT = sys.argv[1]
SURE = float(sys.argv[2]) if len(sys.argv) > 2 else 60.0
def _opt(ad, vars_):
    return float(sys.argv[sys.argv.index(ad) + 1]) if ad in sys.argv else vars_
INTRO = int(_opt('--giris', 1))
SON = _opt('--son', None)                  # son vuruşun zamanı (sn)
BPM = 118
if SON is not None:                        # son vuruş bir ölçü başına düşsün: 118'e en yakın tam ölçü sayısı
    NF = max(INTRO + 2, round(SON / (240.0 / 118)))
    BPM = 240.0 * NF / SON
else:
    NF = int(math.ceil(SURE / (240.0 / 118)))
BEAT = 60.0 / BPM
BAR = BEAT * 4

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

def adsr(n, a, d, s, r, tot):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    rel = np.clip((tot - t) / max(r, 1e-4), 0, 1)
    return e * rel

def bell(m, dur, vel):          # glokenşpil / çan: sinüs + uyumsuz kısmi sesler, hızlı sönüm
    n = int(SR * (dur + 1.2)); t = np.arange(n) / SR; f = hz(m)
    s = np.sin(2*np.pi*f*t) + 0.35*np.sin(2*np.pi*f*2.76*t)*np.exp(-t/0.25) + 0.18*np.sin(2*np.pi*f*5.4*t)*np.exp(-t/0.08)
    return vel * s * np.exp(-t / 0.55) * np.minimum(1, t / 0.002)

def lead(m, dur, vel):          # yumuşak kare + flüt karışımı (parlak ama sert değil)
    n = int(SR * (dur + 0.12)); t = np.arange(n) / SR; f = hz(m)
    vib = 1 + 0.005*np.sin(2*np.pi*5.5*t)*np.minimum(1, t/0.3)
    ph = 2*np.pi*np.cumsum(f*vib)/SR
    s = np.sin(ph) + 0.30*np.sin(3*ph)/3 + 0.18*np.sin(5*ph)/5 + 0.10*np.sin(2*ph)
    return vel * s * adsr(n, 0.015, 0.18, 0.7, 0.10, dur + 0.12)

def pluck(m, dur, vel):         # Karplus–Strong telli
    f = hz(m); N = max(2, int(SR / f)); n = int(SR * (dur + 0.5))
    buf = rng.uniform(-1, 1, N); out = np.zeros(n)
    for i in range(n):
        v = buf[i % N]; out[i] = v
        buf[i % N] = 0.5 * (v + buf[(i + 1) % N]) * 0.996
    return vel * out * np.minimum(1, np.arange(n) / (SR * 0.002))

def pad(ms, dur, vel):          # yumuşak pad: hafif ayrık testere dalgaları, yavaş giriş
    n = int(SR * (dur + 0.6)); t = np.arange(n) / SR; s = np.zeros(n)
    for m in ms:
        for det in (-0.08, 0.08):
            f = hz(m + det)
            s += sum(np.sin(2*np.pi*f*k*t) / k for k in range(1, 6)) * 0.5
    s /= len(ms) * 2
    return vel * s * adsr(n, 0.5, 1.0, 0.85, 0.6, dur + 0.6)

def bass(m, dur, vel):
    n = int(SR * (dur + 0.05)); t = np.arange(n) / SR; f = hz(m)
    s = np.sin(2*np.pi*f*t) + 0.25*np.sin(4*np.pi*f*t)
    return vel * s * adsr(n, 0.004, 0.25, 0.6, 0.06, dur + 0.05)

def kick(vel):
    n = int(SR * 0.35); t = np.arange(n) / SR
    f = 50 + 110 * np.exp(-t / 0.035)
    return vel * np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t / 0.16)

def clap(vel):
    n = int(SR * 0.25); t = np.arange(n) / SR
    nz = rng.normal(0, 1, n)
    nz = np.diff(np.concatenate([[0], nz]))            # yüksek geçiren kabaca
    e = np.exp(-t / 0.06) * (1 + 0.6*np.exp(-((t - 0.012) / 0.004) ** 2) + 0.4*np.exp(-((t - 0.024) / 0.004) ** 2))
    return vel * nz * e * 0.5

def shaker(vel):
    n = int(SR * 0.08); t = np.arange(n) / SR
    nz = np.diff(np.concatenate([[0], rng.normal(0, 1, n)]))
    return vel * nz * np.exp(-t / 0.02) * np.minimum(1, t / 0.006) * 0.35

def snare_roll(dur, vel):       # yükselişte artan sıklıkta vuruş
    n = int(SR * dur); out = np.zeros(n); t0 = 0.0; step = BEAT / 2
    while t0 < dur:
        c = clap(vel * (0.4 + 0.6 * t0 / dur)); i = int(t0 * SR); out[i:i + len(c)] += c[:max(0, n - i)]
        t0 += step; step = max(BEAT / 8, step * 0.82)
    return out

N = int(SR * (SURE + 3)); L = np.zeros(N); R = np.zeros(N)
def put(sig, at, pan=0.0):
    i = int(at * SR)
    if i >= N: return
    j = min(N, i + len(sig)); s = sig[:j - i]
    L[i:j] += s * math.cos((pan + 1) * math.pi / 4); R[i:j] += s * math.sin((pan + 1) * math.pi / 4)

# Sol majör: G – D/F# – Em – C (I–V–vi–IV), her akor bir ölçü
PROG = [(67, [55, 59, 62], 43), (62, [54, 57, 62], 42), (64, [52, 55, 59], 40), (60, [48, 52, 55], 36)]
# akılda kalan iki ölçülük motif (ölçü içindeki vuruş, perde farkı akorun köküne göre, süre vuruş)
MOTIF_A = [(0, 7, .5), (.5, 4, .5), (1, 7, .5), (1.5, 9, .5), (2, 11, 1), (3, 9, .5), (3.5, 7, .5)]
MOTIF_B = [(0, 4, .5), (.5, 7, .5), (1, 12, 1), (2, 11, .5), (2.5, 9, .5), (3, 7, 1)]
BUILD = 8
for b in range(NF + 1):
    t0 = b * BAR; root, chord, bnote = PROG[(b - NF) % 4]     # son ölçü (NF) her zaman Sol majör
    sec = 'intro' if b < INTRO else ('outro' if b == NF else 'main')
    if sec == 'outro':
        # son: vuruş + uzayan Sol majör akor (pad, çanlar, bas); sonrasında yalnız sönüm
        put(kick(0.9), t0); put(clap(0.45), t0)
        put(pad([m + 12 for m in PROG[0][1]] + [79], BAR * 1.5, 0.13), t0)
        put(bell(79, 1.5, 0.12), t0, 0.0); put(bell(74, 1.5, 0.08), t0 + 0.02, -0.3); put(bell(71, 1.5, 0.08), t0 + 0.04, 0.3)
        put(bell(67, 2.0, 0.06), t0 + 0.06, 0.1)
        put(bass(43, BAR * 1.2, 0.35), t0)
        continue
    # pad her yerde (girişte belirgin)
    put(pad([m + 12 for m in chord], BAR, 0.10 if sec == 'intro' else 0.06), t0, 0.0)
    # çan arpeji (girişte ana öğe, sonra hafif)
    for k in range(8):
        m = chord[k % 3] + 24 + (12 if k >= 6 else 0)
        put(bell(m, BEAT / 2, 0.07 if sec == 'intro' else 0.035), t0 + k * BEAT / 2, 0.35 if k % 2 else -0.35)
    if sec == 'main':
        mb = b - INTRO
        g = 0.7 if mb == 0 else 1.0           # davul ilk ölçüde yumuşak girer
        # davul: kick 1-3 (+ "ve"), el çırpma 2-4, shaker sekizlik
        for k in range(4):
            if k in (0, 2): put(kick(0.85 * g), t0 + k * BEAT)
            if k in (1, 3): put(clap(0.42 * g), t0 + k * BEAT, 0.1)
        put(kick(0.5 * g), t0 + 2.5 * BEAT)
        for k in range(8): put(shaker((0.5 if k % 2 else 0.3) * g), t0 + k * BEAT / 2, 0.45)
        # bas: kök sekizlik, ölçü sonunda geçiş notası
        for k in range(8):
            m = bnote if k < 7 else bnote + 7
            put(bass(m, BEAT / 2 * 0.9, 0.30), t0 + k * BEAT / 2)
        # telli akor vuruşu (ters vuruşlarda)
        for k in (0.5, 1.5, 2.5, 3.5):
            for j, m in enumerate(chord): put(pluck(m + 12, BEAT * 0.4, 0.10), t0 + k * BEAT + j * 0.008, -0.25)
        # melodi: iki ölçülük motifler, 8 ölçüde bir oktav yukarı
        motif = MOTIF_A if (mb // 2) % 2 == 0 else MOTIF_B
        half = mb % 2
        up = 12 if (mb // 8) % 2 == 1 else 0
        for (bt, iv, d) in motif:
            if half == 1 and bt < 2 and motif is MOTIF_A: iv = iv - 2 if iv > 4 else iv
            m = 67 + iv + up
            put(lead(m, d * BEAT * 0.92, 0.11), t0 + bt * BEAT, 0.05)
            put(bell(m + 12, d * BEAT, 0.03), t0 + bt * BEAT, -0.2)
        if b == NF - 1:
            put(snare_roll(BAR, 0.32), t0, 0.0)          # son vuruşa hazırlık
        elif (mb + 1) % BUILD == 0 and b < NF - 2:
            put(snare_roll(BAR, 0.22), t0, 0.0)          # hafif ara yükselişi
    else:
        # giriş: çan arpeji + pad'in altında hafif bas ve shaker (giriş çok sessiz kalıp davul girişinde sıçrama olmasın)
        put(bell(chord[2] + 24, BEAT, 0.05), t0, 0.0)
        for k in range(8):
            put(bass(bnote, BEAT / 2 * 0.9, 0.20), t0 + k * BEAT / 2)
            put(shaker(0.32 if k % 2 else 0.2), t0 + k * BEAT / 2, 0.45)
        for k in (1, 3): put(clap(0.18), t0 + k * BEAT, 0.1)
        # girişin son ölçüsünde davula hazırlık (yarım ölçü, hafif)
        if b == INTRO - 1: put(snare_roll(BAR / 2, 0.22), t0 + BAR / 2)

mix = np.stack([L, R], 1)
# basit oda yankısı (gecikmeli kopyalar) + yumuşak tavan
for dly, g in ((0.031, 0.18), (0.047, 0.14), (0.089, 0.10), (0.137, 0.07)):
    k = int(dly * SR); mix[k:] += g * np.stack([R[:-k], L[:-k]], 1)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix /= np.max(np.abs(mix)) + 1e-9; mix *= 0.89
mix = mix[: int(SR * SURE)]
f = int(SR * 0.04); mix[:f] *= np.linspace(0, 1, f)[:, None]
pcm = (mix * 32767).astype('<i2').tobytes()
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', OUT], input=pcm, check=True)
print('müzik', OUT, SURE, 'sn', round(BPM, 2), 'BPM', 'son vuruş', round(NF * BAR, 3), 'sn', NF, 'ölçü')
