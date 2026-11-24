// Mercek sitesi "Platform Nasıl Çalışır?" 3. sekme (Moyo Ebeveyn · ebeveynin telefonunda): gerçek Moyo Ebeveyn (ParentApp) ekranından
// telefon kaydı. Kullanıcı kararı 22 Kasım 2026 ("Gerçek Moyo Ebeveyn ekranı"; önceki klip Mercek'teki "Ebeveyn deneyimi önizlemesi"ydi).
// 24 Kasım 2026 (ebeveyn eğitimi bütün platformlarda kapalı): ebeveyn uzmanın rutin önerisini Uzmanım'da ekler ("Hepsini ekle"), sonra
// Bugün'den çocuğun "Yaptım" dediği adımı inceler ve onaylar. Uzmanım'da tek randevu, seans ücretiyle (akislar 27.1).
// Önce: parent-app'te `bash preview/build.sh`. Kullanım: node tools/landing-motion/ebeveyn.js
// Çıktı: out/aile-m.{mp4,webm,webp} (telefon, 786×1600) + out/aile.{mp4,webm,webp} (geniş: aynı kayıt 1440×900 zeminin ortasında).
// Veri: parent-app store/capture/prep.js'in uydurma ailesi (çatı sayfa görselleriyle aynı); prep.js'in sildiği bekleyen rutin önerisi
// (Güne hazır sabah, 3 adım) geri konur, tek adım önerisi konmaz; bildirim izni ön sorusu gösterilmiş sayılır (yalnız tarayıcı deposunda).
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');
const kit = require('./kit');
const inject = require('./inject');
const PARENT = process.env.PARENT_APP || path.resolve(__dirname, '../../../parent-app');
process.env.PREVIEW_APP_HTML = process.env.PREVIEW_APP_HTML || path.join(PARENT, 'preview/out/app.html');
const { prep } = require(path.join(PARENT, 'store/capture/prep.js'));
const KEY = 'pofi-onizleme-v14';   // parent-app preview/demo-supabase.ts
const FONT = [400, 500, 600, 700, 800, 900].map((w, i) => `@font-face{font-family:BlinkMacSystemFont;src:local('${['Inter', 'Inter Medium', 'Inter SemiBold', 'Inter Bold', 'Inter ExtraBold', 'Inter Black'][i]}');font-weight:${w}}`).join('\n');

async function open() {
  // Telefon 393×800 nokta, 2 kat çizilir (kayıt 786×1600). kit'in telefon ölçeği (Emulation scale) burada kullanılmaz: o ölçekte
  // dokunma ve tıklama koordinatları sayfaya yarı değerle ulaşıyordu (22 Kasım 2026'da ölçüldü).
  const d = { ...kit.DEVICES.phone, zoom: 1 };
  const browser = await chromium.launch({ args: ['--disable-smooth-scrolling', '--font-render-hinting=none'] });
  const ctx = await browser.newContext({ viewport: d.viewport, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true, userAgent: d.userAgent, locale: 'tr-TR', timezoneId: 'Europe/Istanbul', colorScheme: 'light' });
  // Saat kaydırılmaz: Moyo önizlemesi deneme verisini açılışta bugüne göre kurar (kaydırılmış saatte depo boş kalıyordu).
  await ctx.addInitScript(inject.cursor, d.cursor);
  await ctx.addInitScript((css) => { document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }); }, FONT);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(String(e).slice(0, 200)));
  // prep.js bekleyen önerileri siler: silinmeden önceki hâli saklanır (cek/moyo.js "keep" ile aynı yol)
  await page.addInitScript((K) => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === K && !this.getItem('__cek_pending')) { try { const pend = (JSON.parse(v).clinic_task_suggestions || []).filter((x) => x.status === 'pending'); if (pend.length) set.call(this, '__cek_pending', JSON.stringify(pend)); } catch (e) { /* geç */ } }
      return set.call(this, k, v);
    };
  }, KEY);
  await prep(page, { clinic: true });
  const cdp = await ctx.newCDPSession(page);
  await page.evaluate((K) => {
    const db = JSON.parse(localStorage.getItem(K));
    JSON.parse(localStorage.getItem('__cek_pending') || '[]').filter((x) => x.kind !== 'change' && x.routine_group)
      .forEach((x) => { if (!db.clinic_task_suggestions.some((y) => y.id === x.id)) db.clinic_task_suggestions.push(x); });
    db.clinic_sessions = (db.clinic_sessions || []).filter((x) => x.id === 'demo-ses-3').map((x) => ({ ...x, fee: 1200 }));
    localStorage.setItem(K, JSON.stringify(db));
    localStorage.setItem('push-ask', `2:${Date.now()}`);   // "Haber verelim mi?" ön sorusu kayıtta çıkmasın
  }, KEY);
  await page.reload();
  await page.waitForTimeout(2500);
  return { browser, ctx, page, cdp, device: d, name: 'phone' };
}

// Dokunma noktası yalnız dokunurken görünür (parmak kalkınca kaybolur): ekran değişince yerinde kalıp yazıyı kapatmasın, afişte görünmesin.
const nokta = (p, on) => p.evaluate((v) => { const c = document.getElementById('__lm-cursor'); if (c) c.style.visibility = v ? '' : 'hidden'; }, on);
const dokun = (h, p) => async (target, o = {}) => {
  const pt = await h.point(target, o);
  await nokta(p, true);
  await h.moveTo(pt.x, pt.y, o);
  await kit.sleep(o.dwell ?? 400);
  if (o.beat) h.beat(o.beat);
  await h.press();
  await kit.sleep(260);
  await nokta(p, false);
  await kit.sleep(Math.max(0, (o.after ?? 1000) - 260));
  if (o.poster) h.poster();
};
const run = async (h, p) => {
  h.click = dokun(h, p);
  const vis = (t) => p.getByText(t, { exact: true }).filter({ visible: true });
  await nokta(p, false);
  await h.sleep(600);
  await h.click(vis('Uzmanından 3 adım önerisi').first(), { beat: 'Uzmanım: randevu ve rutin önerisi', dwell: 420, after: 1700 });
  await h.scroll(330, { ms: 900, after: 900 });
  await h.click(vis('Hepsini ekle').first(), { beat: 'Rutini ekle', dwell: 420, after: 1500 });
  await h.click(vis('Tamam').last(), { dwell: 380, after: 900 });
  await h.click(vis('Bugün').last(), { beat: 'Bugün', dwell: 380, after: 1200 });
  await h.click(p.getByText('1 adım onayını bekliyor').filter({ visible: true }).first(), { beat: 'Onay bekleyen adım', dwell: 400, after: 1200 });
  await h.click(p.getByLabel('Yatağını topla, Nazlı: incele').filter({ visible: true }).first(), { beat: 'Adımı incele', dwell: 400, after: 1300 });
  await h.click(p.getByText('Onayla', { exact: true }).filter({ visible: true }).last(), { beat: 'Onayla', dwell: 420, after: 1800 });
};

function ff(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr.slice(-600)}`);
}

// Geniş sürüm: telefon kaydı 1440×900 açık zeminin ortasında, köşesi yuvarlak, ince çerçeve ve yumuşak gölge (zemin ve maske ebeveyn_zemin.py)
function wide() {
  const O = kit.OUT, H = 820, W = Math.round(H * 786 / 1600), X = Math.round((1440 - W) / 2), Y = 40;
  const r = spawnSync('python3', [path.join(__dirname, 'ebeveyn_zemin.py'), O, String(W), String(H), String(X), String(Y)], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  // Süre telefon kaydınınki: döngülü zemin ve maske girişleri yoksa bitmez (-shortest filtre çıkışında işlemiyor)
  const dur = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(O, 'aile-m.mp4')], { encoding: 'utf8' }).stdout.trim();
  const graph = `[1:v]scale=${W}:${H}:flags=lanczos[v];[2:v]format=gray[m];[v][m]alphamerge[k];[0:v][k]overlay=${X}:${Y}:format=auto,format=yuv420p`;
  const tags = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv'];
  const ins = ['-loop', '1', '-i', path.join(O, 'aile-zemin.png'), '-i', path.join(O, 'aile-m.mp4'), '-loop', '1', '-i', path.join(O, 'aile-maske.png')];
  ff([...ins, '-filter_complex', graph, '-t', dur, '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '24', '-r', String(kit.FPS), ...tags, '-movflags', '+faststart', '-an', path.join(O, 'aile.mp4')]);
  ff([...ins, '-filter_complex', graph, '-t', dur, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '1', '-tune-content', 'screen', '-g', '300', '-r', String(kit.FPS), ...tags, '-an', path.join(O, 'aile.webm')]);
  const pg = `[1:v]scale=${W}:${H}:flags=lanczos[v];[2:v]format=gray[m];[v][m]alphamerge[k];[0:v][k]overlay=${X}:${Y}`;
  ff(['-i', path.join(O, 'aile-zemin.png'), '-i', path.join(O, 'aile-m.webp'), '-i', path.join(O, 'aile-maske.png'), '-filter_complex', pg, '-c:v', 'libwebp', '-quality', '82', '-frames:v', '1', path.join(O, 'aile.webp')]);
  for (const f of ['aile-zemin.png', 'aile-maske.png']) fs.rmSync(path.join(O, f), { force: true });
  const sz = (f) => fs.statSync(path.join(O, f)).size;
  if (sz('aile.webm') >= sz('aile.mp4')) fs.rmSync(path.join(O, 'aile.webm'));
}

module.exports = { open };
if (require.main === module) (async () => {
  // En az kaçan adımlı deneme saklanır (record.js gibi; 24 Kasım 2026: yük altında sonraki deneme daha kötü çıkabiliyordu)
  const ext = ['mp4', 'webm', 'webp'], at = (e, b) => path.join(b ? kit.TMP : kit.OUT, `${b ? 'best-' : ''}aile-m.${e}`);
  let best = null;
  for (let i = 1; !process.env.EBEVEYN_YALNIZ_GENIS; i++) {
    const s = await open();
    const h = new kit.Human(s, 31);
    let q;
    try {
      await h.park(330, 520);
      await kit.sleep(700);
      const rec = new kit.Recorder(s.cdp, path.join(kit.TMP, 'aile-m', 'cap'), s.device.out);
      await rec.start();
      await kit.sleep(300);
      h.T0 = kit.now();
      try { await run(h, s.page); } catch (err) {
        if (process.env.MOTION_DEBUG) { await s.page.screenshot({ path: path.join(kit.TMP, 'aile-hata.png') });
          console.log((await s.page.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(0, 900)); }
        throw err;
      }
      const end = kit.now();
      await rec.stop();
      if (s.page.errors.length) console.log(`  sayfa hataları: ${JSON.stringify(s.page.errors.slice(0, 3))}`);
      const seq = path.join(kit.TMP, 'aile-m', 'seq');
      q = kit.sequence(rec, h, end, seq);
      const e = kit.encode('aile-m', seq, q.poster, s.device.out, 1.6e6);
      // Afiş: ilk dokunuştan 1,1 sn sonraki kare (Uzmanım: randevu ve rutin önerisi; nokta görünmez). kit.encode'un afiş karesi
      // bazen dokunma noktasını taşıyordu (22 Kasım 2026 denetimi).
      const at = String(((h.beats[0] && h.beats[0].t) || 1.7) + 1.1);
      ff(['-ss', at, '-i', path.join(kit.OUT, 'aile-m.mp4'), '-frames:v', '1', '-c:v', 'libwebp', '-quality', '82', path.join(kit.OUT, 'aile-m.webp')]);
      console.log(`aile-m: ${q.count} kare · mp4 ${e.mp4_bytes} · webm ${e.webm_bytes || 'yok'} · kaçan hareket adımı ${q.missed}/${q.moves} · adımlar ${JSON.stringify(h.beats)}`);
    } finally { await s.browser.close(); }
    if (!best || q.missed < best) { best = q.missed; for (const e of ext) { fs.rmSync(at(e, 1), { force: true }); if (fs.existsSync(at(e))) fs.copyFileSync(at(e), at(e, 1)); } }
    if (q.missed <= q.moves * 0.02 || i >= Number(process.env.MOTION_TRIES || 4)) break;
    console.log(`  ${q.missed} hareket adımı kaçtı, yeniden çekiliyor`);
  }
  if (best !== null) {
    for (const e of ext) { fs.rmSync(at(e), { force: true }); if (fs.existsSync(at(e, 1))) fs.copyFileSync(at(e, 1), at(e)); }
    console.log(`  aile-m: saklanan deneme ${best} kaçan adım`);
  }
  wide();
  console.log('aile: geniş sürüm hazır');
})();
