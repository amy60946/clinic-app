const { chromium } = require('playwright');
const F = 'file:///tmp/claude-0/-home-user/fb2da549-3bc7-5db4-8823-68feb6cf99d9/scratchpad/ekosistem/c.html';
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1440, 900], [1366, 768], [390, 844], [360, 740]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(F); await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' }); await p.waitForTimeout(400);
    const r = await p.evaluate(() => { const hk = document.querySelector('.hikaye'), d = document.querySelector('.dongu-b');
      return { over: document.documentElement.scrollWidth - innerWidth, hk: hk.className, d: d.className, dTop: d.offsetTop, dH: d.offsetHeight }; });
    let ring = '';
    if (!r.d.includes('statik')) {
      const out = [];
      for (const t of [0.05, 0.25, 0.45, 0.65, 0.85, 0.99]) { await p.evaluate(y => scrollTo(0, y), r.dTop + (r.dH - h) * t); await p.waitForTimeout(120);
        out.push(await p.evaluate(() => { const on = [...document.querySelectorAll('.d-slot')].findIndex(s => s.classList.contains('on')); const y = document.querySelector('.d-yazi-m.on'); const yy = y ? y.getBoundingClientRect() : null; const n = document.querySelector('.d-nokta').getBoundingClientRect(); const sl = document.querySelector('.d-slot.on').getBoundingClientRect();
          return on + ' a=' + getComputedStyle(document.querySelector('.d-halka')).getPropertyValue('--a') + ' slot ' + Math.round(sl.top) + '-' + Math.round(sl.bottom) + ' yazi ' + (yy ? Math.round(yy.top) + '-' + Math.round(yy.bottom) : '-') + ' nokta ' + Math.round(n.top) + '-' + Math.round(n.bottom); })); }
      ring = out.join(' | ');
    }
    console.log(w + 'x' + h, JSON.stringify(r), errs.join(';'), '\n   ', ring);
    await p.close();
  }
  await b.close();
})();
