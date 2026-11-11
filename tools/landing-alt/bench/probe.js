// Tanıtım sayfası etkileşim kalıbı yoklaması: sabitlenen bölüm, sekme, kendiliğinden oynayan video
const { chromium } = require('playwright');
const urls = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
  for (const url of urls) {
    const ctx = await browser.newContext({ viewport: { width: +process.env.W || 1440, height: 900 }, isMobile: !!process.env.W, hasTouch: !!process.env.W, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' });
    const page = await ctx.newPage();
    let failed = 0, ok = 0; const blocked = new Set();
    page.on('requestfailed', (r) => { failed++; try { blocked.add(new URL(r.url()).host); } catch (e) {} });
    page.on('requestfinished', () => { ok++; });
    const out = { url };
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      out.status = resp && resp.status();
      await page.waitForTimeout(5000);
      out.title = (await page.title()).slice(0, 80);
      out.final = page.url();
      const vh = 900;
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      out.screens = +(total / vh).toFixed(1);
      // işaretle: yapışkan adaylar
      await page.evaluate(() => {
        let i = 0;
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el);
          if (cs.position !== 'sticky') continue;
          const r = el.getBoundingClientRect();
          if (r.height < 250 || r.width < 300) continue;
          el.setAttribute('data-probe', String(i++));
        }
      });
      const track = {};
      const steps = Math.min(60, Math.ceil(total / (vh * 0.5)));
      for (let s = 0; s <= steps; s++) {
        await page.evaluate((y) => window.scrollTo(0, y), s * vh * 0.5);
        await page.waitForTimeout(250);
        const rows = await page.evaluate(() => [...document.querySelectorAll('[data-probe]')].map((el) => {
          const r = el.getBoundingClientRect();
          return [el.getAttribute('data-probe'), Math.round(r.top), Math.round(r.height), r.top < innerHeight && r.bottom > 0];
        }));
        for (const [id, top, h, vis] of rows) {
          const t = (track[id] = track[id] || { run: 0, best: 0, last: null, h });
          if (vis && t.last !== null && Math.abs(t.last - top) <= 2) { t.run++; t.best = Math.max(t.best, t.run); } else t.run = 0;
          t.last = vis ? top : null;
        }
      }
      const pinnedIds = Object.entries(track).filter(([, t]) => t.best >= 3).map(([id, t]) => [id, t.best]);
      out.pinned = await page.evaluate((ids) => ids.map(([id, best]) => {
        const el = document.querySelector('[data-probe="' + id + '"]');
        let p = el.parentElement; let host = p;
        for (let k = 0; k < 4 && p; k++) { if (p.getBoundingClientRect().height > el.getBoundingClientRect().height * 1.5) { host = p; break; } p = p.parentElement; }
        const hs = [...host.querySelectorAll('h1,h2,h3')].map((h) => h.innerText.trim().replace(/\s+/g, ' ').slice(0, 50)).filter(Boolean).slice(0, 4);
        const media = el.querySelectorAll('img,video,canvas,svg,picture').length;
        return { pinnedHalfScreens: best, h: Math.round(el.getBoundingClientRect().height), media, heads: hs };
      }), pinnedIds);
      // sekmeler
      out.tabs = await page.evaluate(() => [...document.querySelectorAll('[role=tablist]')].slice(0, 4).map((tl) => {
        const tabs = [...tl.querySelectorAll('[role=tab]')];
        return { n: tabs.length, labels: tabs.slice(0, 6).map((t) => t.innerText.trim().replace(/\s+/g, ' ').slice(0, 30)), y: Math.round((tl.getBoundingClientRect().top + scrollY) / 900 * 10) / 10 };
      }));
      // kendiliğinden ilerleme: ilk sekme grubu
      if (out.tabs.length) {
        const sel = async () => page.evaluate(() => { const tl = document.querySelector('[role=tablist]'); const a = tl && tl.querySelector('[role=tab][aria-selected=true]'); return a ? a.innerText.trim().slice(0, 30) : null; });
        await page.evaluate(() => document.querySelector('[role=tablist]').scrollIntoView({ block: 'center' }));
        await page.waitForTimeout(800);
        const a = await sel(); await page.waitForTimeout(9000); const b = await sel();
        out.tabAuto = a !== b ? `${a} -> ${b}` : `sabit (${a})`;
      }
      // video / lottie
      await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(1500);
      out.video = await page.evaluate(() => {
        const vs = [...document.querySelectorAll('video')];
        const top = vs.filter((v) => { const r = v.getBoundingClientRect(); return r.top < innerHeight * 1.2 && r.height > 120; });
        return { all: vs.length, autoplay: vs.filter((v) => v.autoplay).length, hero: top.length, heroPlaying: top.filter((v) => !v.paused).length, controls: vs.filter((v) => v.controls).length,
          lottie: document.querySelectorAll('lottie-player,dotlottie-player,[data-lottie],[data-animation-type=lottie]').length, canvas: document.querySelectorAll('canvas').length,
          pauseBtn: [...document.querySelectorAll('button,[role=button]')].filter((b) => /pause|duraklat/i.test((b.getAttribute('aria-label') || '') + b.innerText)).length };
      });
      // sayfanın kendi yazdığı ölçek cümleleri
      out.proof = await page.evaluate(() => {
        const t = document.body.innerText.split('\n').map((s) => s.trim()).filter((s) => s.length > 12 && s.length < 140);
        const re = /(\d[\d.,]*\s?(\+|k|m|million|billion|bn)?\+?\s?(million|billion|customers|companies|teams|users|businesses|practitioners|providers|clinicians|therapists|countries|organizations))/i;
        return [...new Set(t.filter((s) => re.test(s)))].slice(0, 4);
      });
      out.net = { ok, failed, blocked: [...blocked].slice(0, 6) };
    } catch (e) { out.error = String(e.message || e).split('\n')[0].slice(0, 160); out.net = { ok, failed, blocked: [...blocked].slice(0, 6) }; }
    console.log(JSON.stringify(out));
    await ctx.close();
  }
  await browser.close();
})();
