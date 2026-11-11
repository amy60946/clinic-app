// Alternatiflerin işlev denetimi + ekran görüntüleri. Kullanım: node tools/landing-alt/check.js <çıktı klasörü>
// (önce: python3 tools/landing-alt/build.py). Masaüstü 1440x900 ve telefon 393x852.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, 'out'), OUT = process.argv[2] || path.join(require('os').tmpdir(), 'landing-alt');
const TYPES = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain' };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = http.createServer((q, r) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0].split('#')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  }).listen(0);
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const b = await chromium.launch();
  const res = [];
  for (const [name, vp, mobile] of [['d', { width: 1440, height: 900 }, false], ['m', { width: 393, height: 852 }, true]]) {
    for (const v of ['a', 'b', 'c']) {
      const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1, locale: 'tr-TR' });
      const p = await ctx.newPage(); const errs = [];
      p.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));
      p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
      p.on('requestfailed', (r) => errs.push('yüklenemedi: ' + r.url().slice(-40)));
      await p.goto(base + v + '.html'); await p.waitForTimeout(700);
      const shot = async (tag) => { await p.waitForTimeout(1100); await p.screenshot({ path: `${OUT}/${name}-${v}-${tag}.png` }); };
      const over = async () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const note = { v, vp: name, errs, over: await over() };
      await shot('0-hero');
      if (v === 'a') {
        const seen = [];
        const tops = await p.evaluate(() => [...document.querySelectorAll('.pin-step')].map((e) => e.getBoundingClientRect().top + scrollY + e.offsetHeight / 2 - innerHeight * .52));
        for (let i = 0; i < tops.length; i++) {
          await p.evaluate((y) => scrollTo(0, y), tops[i]); await p.waitForTimeout(500);
          seen.push(await p.evaluate(() => [...document.querySelectorAll('.pin-frame')].findIndex((e) => e.classList.contains('is-on'))));
          if (i === 0 || i === 1 || i === 2 || i === 4) await shot('step' + (i + 1));
        }
        note.frames = seen.join(','); note.live = await p.evaluate(() => document.querySelector('.pin').classList.contains('is-live'));
        await p.evaluate(() => document.querySelector('.feat.extra').scrollIntoView({ block: 'center' })); await shot('extra');
        note.sticky = await p.evaluate(() => { const s = document.querySelector('.pin-stage').getBoundingClientRect(); return Math.round(s.top) + '..' + Math.round(s.bottom); });
      }
      if (v === 'b') {
        await p.evaluate(() => document.getElementById('nasil').scrollIntoView()); await shot('step1');
        const seen = [];
        for (let i = 1; i < 5; i++) {
          await p.locator('.tour-btn').nth(i).click(); await p.waitForTimeout(650);
          seen.push(await p.evaluate(() => [...document.querySelectorAll('.tour-item')].findIndex((e) => e.classList.contains('is-on'))));
          if (i === 1 || i === 2 || i === 4) await shot('step' + (i + 1));
        }
        await p.locator('#tour-prev').click(); await p.waitForTimeout(400);
        note.open = seen.join(','); note.count = await p.locator('#tour-count').textContent();
        note.h = await p.evaluate(() => Math.round(document.querySelector('.tour').getBoundingClientRect().height));
      }
      if (v === 'c') {
        const first = await p.evaluate(() => [...document.querySelectorAll('.reel-frame')].findIndex((e) => e.classList.contains('is-on')));
        await p.mouse.move(5, 5); await p.waitForTimeout(5600);
        const second = await p.evaluate(() => [...document.querySelectorAll('.reel-frame')].findIndex((e) => e.classList.contains('is-on')));
        await shot('1-reel2');
        await p.locator('#reel-play').click(); await p.waitForTimeout(5600);
        const paused = await p.evaluate(() => [...document.querySelectorAll('.reel-frame')].findIndex((e) => e.classList.contains('is-on')));
        await p.locator('.reel-seg').nth(4).click(); await shot('2-reel5');
        note.reel = `${first}>${second}, duraklatınca ${paused}`;
        await p.evaluate(() => document.getElementById('nasil').scrollIntoView()); await shot('3-rows');
        await p.evaluate(() => scrollBy(0, innerHeight * 1.4)); await shot('4-rows2');
        note.waiting = await p.evaluate(() => document.querySelectorAll('.rv-wait').length);
      }
      note.over2 = await over();
      await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await shot('9-end');
      res.push(note); await ctx.close();
    }
  }
  await b.close(); srv.close();
  for (const r of res) console.log(JSON.stringify(r));
})();
