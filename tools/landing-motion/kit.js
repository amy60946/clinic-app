// Çekim düzeneği: tarayıcıyı açar (uydurma veri, ipuçları kapalı, imleç ve ad değişimi eklenmiş), insan gibi davranan
// yardımcıları (Human) ve ekran kaydını (Recorder) verir, kareleri 30 kare/sn videoya çevirir (encode). Kullanım: README.md
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { performance } = require('perf_hooks');
const inject = require('./inject');
const data = require('./data');
const editDb = require('../store-shots/editdb');

const SHOT_TIME = process.env.SHOT_TIME || '2026-11-09T09:40:00+03:00';   // pazartesi sabahı: grafiklerin son haftası tam
const URL = process.env.SHOT_URL || 'file://' + path.resolve(__dirname, '../../preview/out/clinic.html');
const TMP = process.env.MOTION_TMP || path.join(os.tmpdir(), 'landing-motion');
const OUT = path.join(__dirname, 'out');
const FPS = 30;
const TICK = 1000 / FPS;
const HOLD_S = 1.2;
const FORMAT = process.env.MOTION_FORMAT === 'jpeg' ? 'jpeg' : 'png';   // ekran kaydı kare biçimi (png: kayıpsız)
const EXT = FORMAT === 'png' ? 'png' : 'jpg';
const ID = 'demo-clinician';

const DEVICES = {
  // Sayfa 2 katı çözünürlükte çizilir; ekran kaydı 1440×900'e indirilmiş kareler verir (keskin yazı)
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, isMobile: false, hasTouch: false, cursor: 'arrow', out: [1440, 900],
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
  // Telefon: sayfa 393×800 (×3) yerleşir, pencere 786×1600; görüntü 2 kat büyütülür (Emulation scale), kayıt 786×1600 gelir
  phone: { viewport: { width: 393, height: 800 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, cursor: 'touch', out: [786, 1600], zoom: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
};

const now = () => performance.timeOrigin + performance.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sleepUntil = (t) => new Promise((res) => {
  const f = () => { const d = t - now(); if (d <= 0) res(); else if (d > 5) setTimeout(f, d - 4); else setImmediate(f); };
  f();
});
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

async function open(device = 'desktop', opt = {}) {
  const d = DEVICES[device];
  const browser = await chromium.launch({ args: ['--disable-smooth-scrolling', '--font-render-hinting=none'] });
  const z = d.zoom || 1;
  const ctx = await browser.newContext({
    viewport: z === 1 ? d.viewport : { width: d.viewport.width * z, height: d.viewport.height * z },
    deviceScaleFactor: z === 1 ? d.deviceScaleFactor : d.deviceScaleFactor / z, isMobile: d.isMobile, hasTouch: d.hasTouch, userAgent: d.userAgent,
    locale: 'tr-TR', timezoneId: 'Europe/Istanbul', colorScheme: 'light',
  });
  await ctx.addInitScript(inject.shiftDate, Date.parse(SHOT_TIME));
  await ctx.addInitScript(inject.cursor, d.cursor);
  await ctx.addInitScript(inject.brand, { from: 'ClinicApp', to: 'Moyo Mercek' });
  await ctx.addInitScript(inject.brand, { from: 'ParentApp', to: 'Moyo' });   // aile uygulamasının yeni adı (11 Kasım 2026)
  await ctx.addInitScript(inject.clipboard);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(String(e).slice(0, 200)));
  page.on('dialog', (dlg) => { page.errors.push(`uyarı: ${dlg.message().slice(0, 160)}`); dlg.dismiss().catch(() => {}); });
  const cdp = await ctx.newCDPSession(page);
  if (z !== 1) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: d.viewport.width, height: d.viewport.height, deviceScaleFactor: d.deviceScaleFactor,
      mobile: true, scale: z, screenWidth: d.viewport.width, screenHeight: d.viewport.height });
  }
  await page.goto(URL);
  await page.waitForTimeout(2500);
  await page.evaluate(editDb);
  await page.evaluate(data.extra, { more: !!opt.more });
  await page.evaluate(data.flags, ID);
  await page.reload();
  await page.waitForTimeout(2500);
  await page.evaluate(data.readNotifications);
  await page.reload();
  await page.waitForTimeout(2500);
  return { browser, ctx, page, cdp, device: d, name: device };
}

// CDP ekran kaydı: her karenin zaman damgası saklanır, her kare onaylanır
class Recorder {
  constructor(cdp, dir, size) { this.cdp = cdp; this.dir = dir; this.size = size; this.frames = []; this.writes = []; }
  async start() {
    fs.rmSync(this.dir, { recursive: true, force: true });
    fs.mkdirSync(this.dir, { recursive: true });
    this.onFrame = (f) => {
      const file = path.join(this.dir, `c${String(this.frames.length).padStart(6, '0')}.${EXT}`);
      this.frames.push({ ts: f.metadata.timestamp * 1000, file });
      this.writes.push(fs.promises.writeFile(file, Buffer.from(f.data, 'base64')));
      this.cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    };
    this.cdp.on('Page.screencastFrame', this.onFrame);
    await this.cdp.send('Page.startScreencast', { format: FORMAT, quality: 95, everyNthFrame: 1, maxWidth: this.size[0], maxHeight: this.size[1] });
    for (let i = 0; i < 100 && !this.frames.length; i++) await sleep(20);
    if (!this.frames.length) throw new Error('ekran kaydı kare vermedi');
  }
  async stop() {
    await this.cdp.send('Page.stopScreencast');
    await sleep(120);
    this.cdp.off('Page.screencastFrame', this.onFrame);
    await Promise.all(this.writes);
  }
}

// İnsan gibi: imleç yumuşak bir eğriyle kayar (ışınlanmaz), hedefte bekler, basar, sonucu okutacak kadar durur.
// Hareket ve kaydırma adımları 30 Hz'lik ızgaraya kilitlidir: her video karesi tam bir adımı gösterir (takılma olmaz).
class Human {
  constructor(s, seed = 7) {
    this.p = s.page; this.cdp = s.cdp; this.d = s.device; this.touch = s.device.cursor === 'touch';
    this.W = s.device.viewport.width; this.H = s.device.viewport.height;
    this.x = this.W * 0.7; this.y = this.H * 0.5; this.rand = rng(seed);
    this.T0 = now(); this.beats = []; this.motion = []; this.posterAt = null; this.frames = [];
  }
  between(a, b) { return a + (b - a) * this.rand(); }
  sleep(ms) { return sleep(ms); }
  t() { return (now() - this.T0) / 1000; }
  beat(what) { this.beats.push({ t: Math.max(0, Math.round(this.t() * 10) / 10), what }); }
  poster() { this.posterAt = now(); }
  async tick() { const k = Math.floor((now() - this.T0) / TICK) + 1; await sleepUntil(this.T0 + k * TICK); return k; }

  // Kayıt dışı: imleci başlangıç yerine koy
  async park(x, y) { this.x = x; this.y = y; await this.p.mouse.move(x, y); }

  async _iframes() {
    this.frames = await this.p.evaluate(() => [...document.querySelectorAll('iframe')].map((f) => { const r = f.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }));
  }
  async _at(x, y) {
    await this.p.mouse.move(x, y);
    // iframe üstünde olay ana sayfaya gelmez: imleci elle taşı
    if (this.frames.some((r) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3])) await this.p.evaluate(([a, b]) => window.__lmCursor && window.__lmCursor(a, b), [x, y]);
  }

  async moveTo(tx, ty, o = {}) {
    const sx = this.x, sy = this.y;
    const dist = Math.hypot(tx - sx, ty - sy);
    if (dist < 1.5) return;
    await this._iframes();
    const ms = o.ms ?? clamp(650 + (dist / 1000) * 450, 650, 1100);
    const n = Math.max(3, Math.round(ms / TICK));
    const sub = Math.max(1, Math.ceil(58 / n));                       // toplam 55–70 ara nokta
    const bend = o.bend ?? (this.rand() - 0.5) * 2 * Math.min(46, dist * 0.07);
    const mx = (sx + tx) / 2 - ((ty - sy) / dist) * bend, my = (sy + ty) / 2 + ((tx - sx) / dist) * bend;
    const at = (t) => { const e = easeInOut(t), u = 1 - e; return [u * u * sx + 2 * u * e * mx + e * e * tx, u * u * sy + 2 * u * e * my + e * e * ty]; };
    for (let i = 1; i <= n; i++) {
      const k = await this.tick();
      // ara noktalar beklenmeden gider (tarayıcı aynı karede birleştirir); karenin göstereceği son nokta beklenir
      for (let j = 1; j < sub; j++) { const [x, y] = at((i - 1 + j / sub) / n); this.p.mouse.move(x, y).catch(() => {}); }
      const [x, y] = at(i / n);
      const [px, py] = at((i - 1) / n);
      await this._at(x, y);
      if (Math.hypot(x - px, y - py) >= 1) this.motion.push(k);     // 1 pikselden küçük adım kare üretmeyebilir
    }
    this.x = tx; this.y = ty;
    this.log(`move ${Math.round(dist)}px ${n} adım`);
  }
  log(what) { if (process.env.MOTION_DEBUG) console.log(`  ${this.t().toFixed(2)}  ${what}`); }

  // Hedef: tam metin (string), RegExp, Playwright locator ya da { x, y }. Üstte ve görünür olan ilk eşleşme.
  async point(target, o = {}) {
    if (target && typeof target.x === 'number') return target;
    const loc = typeof target === 'string' ? this.p.getByText(target, { exact: true }) : target instanceof RegExp ? this.p.getByText(target) : target;
    const n = await loc.count();
    let order = [...Array(n).keys()];
    if (o.last) order.reverse();
    if (o.nth != null) order = [o.nth];
    for (const i of order) {
      const el = loc.nth(i);
      const box = await el.boundingBox().catch(() => null);
      if (!box || !box.width || !box.height) continue;
      const x = box.x + box.width * (o.fx ?? 0.5) + (o.dx || 0), y = box.y + box.height * (o.fy ?? 0.5) + (o.dy || 0);
      if (x < 1 || y < 1 || x > this.W - 1 || y > this.H - 1) continue;
      const top = await el.evaluate((e, [px, py]) => { const h = document.elementFromPoint(px, py); return !!h && (e === h || e.contains(h) || h.contains(e)); }, [x, y]).catch(() => false);
      if (top || o.force) return { x, y, box };
    }
    throw new Error(`hedef yok ya da görünmüyor: ${target}`);
  }
  async has(target, o = {}) { try { await this.point(target, o); return true; } catch (e) { return false; } }

  async hover(target, o = {}) {
    const pt = await this.point(target, o);
    await this.moveTo(pt.x, pt.y, o);
    if (o.beat) this.beat(o.beat);
    await sleep(o.after ?? this.between(500, 800));
  }

  async press() {
    if (this.touch) {
      await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: this.x, y: this.y }] });
      await sleep(95);
      await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await this.p.mouse.down();
      await sleep(95);
      await this.p.mouse.up();
    }
  }

  async click(target, o = {}) {
    const pt = await this.point(target, o);
    await this.moveTo(pt.x, pt.y, o);
    await sleep(o.dwell ?? this.between(350, 600));
    if (o.beat) this.beat(o.beat);
    await this.press();
    this.log(`click ${typeof target === 'string' ? target : ''}`);
    await sleep(o.after ?? this.between(900, 1500));
    if (o.poster) this.poster();
  }

  // Kayıt dışı (prepare): metni taşıyan kaydırılabilir alanı, metin ekranda y'ye gelecek kadar anında kaydır
  async align(text, y = 40) {
    await this.p.evaluate(([t, top]) => {
      const el = [...document.querySelectorAll('div,span')].find((e) => e.childElementCount === 0 && e.textContent.trim().startsWith(t) && e.getBoundingClientRect().width > 0);
      if (!el) throw new Error('metin yok: ' + t);
      let c = el.parentElement;
      for (; c; c = c.parentElement) { const st = getComputedStyle(c); if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && c.scrollHeight > c.clientHeight) break; }
      (c || document.scrollingElement).scrollTop += el.getBoundingClientRect().top - top;
    }, [text, y]);
    await sleep(400);
  }
  // Kayıtta: hedef ekranda y'ye gelene kadar yumuşakça kaydır
  async scrollTo(target, y, o = {}) {
    const loc = typeof target === 'string' ? this.p.getByText(target, { exact: true }) : target;
    const box = await (o.last ? loc.last() : loc.first()).boundingBox();
    if (!box) throw new Error(`kaydırma hedefi yok: ${target}`);
    const dy = Math.round(box.y - y);
    if (Math.abs(dy) > 4) await this.scroll(dy, o);
  }

  async type(text, o = {}) {
    if (o.beat) this.beat(o.beat);
    for (const ch of text) { await this.p.keyboard.type(ch); await sleep(this.between(60, 90)); }
    await sleep(o.after ?? this.between(900, 1300));
  }

  // Küçük teker adımlarıyla (masaüstü) ya da parmakla sürükleyerek (telefon) kaydır; dy > 0 aşağı
  async scroll(dy, o = {}) {
    if (o.beat) this.beat(o.beat);
    const ms = o.ms ?? clamp(520 + Math.abs(dy) * 0.9, 600, 900);
    const n = Math.max(6, Math.round(ms / TICK));
    if (this.touch) return this._drag(dy, n, o);
    let done = 0;
    for (let i = 1; i <= n; i++) {
      const k = await this.tick();
      const want = Math.round(dy * easeInOut(i / n));
      if (want !== done) { await this.p.mouse.wheel(0, want - done); done = want; this.motion.push(k); }
    }
    await sleep(o.after ?? this.between(700, 1100));
  }
  // Kamera: uygulamanın kökünü hedefin çevresinde yavaşça büyütür / geri alır (imleç kökün dışında, ölçeklenmez).
  // Atlassian ana sayfasındaki ürün turu gibi (14 Kasım 2026): ~0,7 sn yakınlaş, işi göster, geri çık.
  async zoom(target, scale = 1.3, o = {}) {
    const pt = await this.point(target, o);
    if (o.beat) this.beat(o.beat);
    const ms = o.ms ?? 750;
    await this.p.evaluate(([x, y, s, ms]) => {
      const r = document.getElementById('root') || document.body.firstElementChild;
      const ox = x + window.scrollX, oy = y + window.scrollY;   // kök sayfayla birlikte kaymaz; görünüm koordinatı yeter
      r.style.transition = `transform ${ms}ms cubic-bezier(.45,0,.2,1)`;
      r.style.transformOrigin = `${ox}px ${oy}px`;
      r.style.transform = `scale(${s})`;
    }, [o.ox ?? pt.x, o.oy ?? pt.y, scale, ms]);
    await sleep(ms + (o.after ?? this.between(1300, 1700)));
  }
  async unzoom(o = {}) {
    const ms = o.ms ?? 650;
    await this.p.evaluate((ms) => { const r = document.getElementById('root') || document.body.firstElementChild; r.style.transition = `transform ${ms}ms cubic-bezier(.45,0,.2,1)`; r.style.transform = 'none'; }, ms);
    await sleep(ms + (o.after ?? 350));
  }
  async _drag(dy, n, o) {
    const x = this.x, y0 = this.y;
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
    for (let i = 1; i <= n; i++) {
      const k = await this.tick();
      const y = y0 - dy * easeInOut(i / n);
      await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      this.motion.push(k);
    }
    await sleep(60);
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    this.y = y0 - dy;
    await this.p.mouse.move(this.x, this.y);
    await sleep(o.after ?? this.between(700, 1100));
  }
}

// Kareleri 30 kare/sn'lik sabit diziye çevir (her video karesi: o ana kadar gelen son kare), sonuna 1,2 sn bekleme ekle
function sequence(rec, h, end, dir) {
  const fr = rec.frames;
  const n = Math.ceil((end - h.T0) / TICK);
  const seq = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = h.T0 + (k + 1) * TICK + 8;   // sonraki adımın karesi en erken ~11 ms sonra gelir
    while (j + 1 < fr.length && fr[j + 1].ts <= s) j++;
    seq.push(j);
  }
  for (let i = 0; i < Math.round(HOLD_S * FPS); i++) seq.push(seq[seq.length - 1]);
  // hareket adımlarından kaçı kendi karesini bulamadı (takılma ölçüsü)
  const missed = h.motion.filter((k) => k >= 1 && k < n && seq[k] === seq[k - 1]).length;
  if (process.env.MOTION_DEBUG) {
    // her hareket adımından sonra gelen ilk karenin gecikmesi (ms)
    const lat = h.motion.map((k) => { const t = h.T0 + k * TICK; const f = fr.find((x) => x.ts > t); return f ? Math.round(f.ts - t) : -1; });
    console.log('  gecikme (ms):', lat.join(' '));
    console.log('  kaçan adımların saniyesi:', h.motion.filter((k) => k >= 1 && k < n && seq[k] === seq[k - 1]).map((k) => (k * TICK / 1000).toFixed(2)).join(' '));
  }
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  seq.forEach((i, k) => fs.symlinkSync(fr[i].file, path.join(dir, `${String(k).padStart(5, '0')}.${EXT}`)));
  let poster = fr[seq[seq.length - 1]].file;
  if (h.posterAt) { const k = clamp(Math.round((h.posterAt - h.T0) / TICK), 0, seq.length - 1); poster = fr[seq[k]].file; }
  const gaps = fr.slice(1).map((f, i) => f.ts - fr[i].ts).filter((g) => g < 60);
  return { count: seq.length, missed, moves: h.motion.length, poster, captured: fr.length, fpsWhileMoving: gaps.length ? Math.round(1000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length)) : 0 };
}

function ff(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr.slice(-600)}`);
}
const size = (f) => (fs.existsSync(f) ? fs.statSync(f).size : 0);

// JPEG (tam aralık, BT.601) → BT.709 sınırlı aralık, etiketli: renkler tarayıcıda sayfadakiyle aynı görünür
function encode(id, seqDir, posterFrame, dim, maxBytes) {
  fs.mkdirSync(OUT, { recursive: true });
  const [w, h] = dim;
  // accurate_rnd olmadan swscale beyazı (251,253,250) yapıyor; bu bayraklarla kaynakla fark en çok 1
  const vf = `scale=${w}:${h}:flags=lanczos+accurate_rnd+full_chroma_int:${FORMAT === 'png' ? '' : 'in_range=full:in_color_matrix=bt601:'}out_range=tv:out_color_matrix=bt709,format=yuv420p`;
  const tags = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv'];
  const input = ['-framerate', String(FPS), '-i', path.join(seqDir, `%05d.${EXT}`)];
  const mp4 = path.join(OUT, `${id}.mp4`), webm = path.join(OUT, `${id}.webm`), webp = path.join(OUT, `${id}.webp`);
  let crf = 24;
  for (; crf <= 30; crf++) {
    ff([...input, '-vf', vf, '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', String(crf), '-r', String(FPS), ...tags, '-movflags', '+faststart', '-an', mp4]);
    if (size(mp4) <= maxBytes) break;
  }
  let vcrf = 34;
  for (; vcrf <= 40; vcrf++) {
    ff([...input, '-vf', vf, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(vcrf), '-row-mt', '1', '-deadline', 'good', '-cpu-used', '1', '-tune-content', 'screen', '-g', '300', '-r', String(FPS), ...tags, '-an', webm]);
    if (size(webm) <= maxBytes) break;
  }
  let webmBytes = size(webm);
  if (webmBytes >= size(mp4)) { fs.rmSync(webm, { force: true }); webmBytes = 0; }
  ff(['-i', posterFrame, '-vf', `scale=${w}:${h}:flags=lanczos+accurate_rnd+full_chroma_int`, '-c:v', 'libwebp', '-quality', '82', '-frames:v', '1', webp]);
  return { mp4_bytes: size(mp4), webm_bytes: webmBytes, crf, vcrf, poster: `${id}.webp` };
}

module.exports = { open, Recorder, Human, sequence, encode, sleep, now, SHOT_TIME, URL, TMP, OUT, FPS, TICK, HOLD_S, DEVICES, ID };
