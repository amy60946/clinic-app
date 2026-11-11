// Kaydırırken yerinde duran büyük bölümleri bulur (sticky ya da betikle fixed)
const { chromium } = require('playwright');
const urls = process.argv.slice(2);
(async () => {
  const W = +process.env.W || 1440;
  const browser = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
  for (const url of urls) {
    const ctx = await browser.newContext({ viewport: { width: W, height: 900 }, isMobile: W < 600, hasTouch: W < 600 });
    const page = await ctx.newPage();
    const out = { url, W };
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      out.status = resp && resp.status();
      await page.waitForTimeout(4500);
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      const steps = Math.min(90, Math.ceil(total / 450));
      out.screens = +(total / 900).toFixed(1);
      const track = {};
      for (let s = 0; s <= steps; s++) {
        await page.evaluate((y) => window.scrollTo(0, y), s * 450);
        await page.waitForTimeout(220);
        const rows = await page.evaluate(() => {
          window.__n = window.__n || 0; const res = [];
          for (const el of document.querySelectorAll('body *')) {
            const cs = getComputedStyle(el);
            if (cs.position !== 'sticky' && cs.position !== 'fixed') continue;
            const r = el.getBoundingClientRect();
            if (r.height < 200 || r.width < innerWidth * 0.3 || r.bottom <= 0 || r.top >= innerHeight) continue;
            if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
            if (!el.dataset.pb) el.dataset.pb = String(window.__n++);
            res.push([el.dataset.pb, Math.round(r.top), cs.position]);
          }
          return res;
        });
        const seen = new Set();
        for (const [id, top, pos] of rows) {
          seen.add(id);
          const t = (track[id] = track[id] || { run: 0, best: 0, last: null, vis: 0, pos });
          t.vis++;
          if (t.last !== null && Math.abs(t.last - top) <= 2) { t.run++; t.best = Math.max(t.best, t.run); } else t.run = 0;
          t.last = top;
        }
        for (const id in track) if (!seen.has(id)) { track[id].last = null; track[id].run = 0; }
      }
      const ids = Object.entries(track).filter(([, t]) => t.best >= 3 && t.vis < steps * 0.6).map(([id, t]) => [id, t.best, t.pos]);
      out.pinned = await page.evaluate((ids) => ids.map(([id, best, pos]) => {
        const el = document.querySelector('[data-pb="' + id + '"]');
        if (!el) return null;
        let host = el.parentElement;
        for (let k = 0; k < 5 && host && host.parentElement; k++) { if (host.querySelector('h1,h2,h3')) break; host = host.parentElement; }
        const hs = [...(host || el).querySelectorAll('h1,h2,h3')].map((h) => h.innerText.trim().replace(/\s+/g, ' ').slice(0, 44)).filter(Boolean).slice(0, 3);
        return { halfScreens: best, pos, h: Math.round(el.getBoundingClientRect().height), cls: String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).slice(0, 50), media: el.querySelectorAll('img,video,canvas,picture').length, heads: hs };
      }).filter(Boolean), ids);
    } catch (e) { out.error = String(e.message || e).split('\n')[0].slice(0, 140); }
    console.log(JSON.stringify(out));
    await ctx.close();
  }
  await browser.close();
})();
