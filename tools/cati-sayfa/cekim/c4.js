const { chromium } = require('playwright');
const F = 'file:///tmp/claude-0/-home-user/fb2da549-3bc7-5db4-8823-68feb6cf99d9/scratchpad/ekosistem/c.html';
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1440, 900], [1366, 768], [390, 844]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto(F); await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' }); await p.waitForTimeout(400);
    const m = await p.evaluate(() => { const s = document.querySelector('.hikaye'), k = document.querySelector('.d-kayit'), d = document.querySelector('.dongu-b'), c = document.querySelector('.d-kapanis');
      return { hTop: s.offsetTop, hH: s.offsetHeight, kTop: k.offsetTop + d.offsetTop, kH: k.offsetHeight, cTop: c.offsetTop + d.offsetTop, over: document.documentElement.scrollWidth - innerWidth }; });
    const line = [];
    if (w > 820) {
      for (const t of [0.375, 0.732]) { await p.evaluate(y => scrollTo(0, y), m.hTop + (m.hH - h) * t); await p.waitForTimeout(100);
        line.push('mid' + t + ' kart=' + await p.evaluate(() => [...document.querySelectorAll('.hk-kart')].map(e => (+e.style.opacity).toFixed(2)).join(',')) + ' yazi=' + await p.evaluate(() => [...document.querySelectorAll('.hk-yazi')].map(e => (+e.style.opacity).toFixed(2)).join(','))); }
      for (const t of [0, 1]) { await p.evaluate(y => scrollTo(0, y), m.kTop + (m.kH - h) * t); await p.waitForTimeout(150);
        line.push('ring' + t + ' ' + await p.evaluate(() => { const r = document.querySelector('.d-slot.on').getBoundingClientRect(); return 'a=' + getComputedStyle(document.querySelector('.d-halka')).getPropertyValue('--a') + ' cx=' + Math.round((r.left + r.right) / 2) + ' / ' + innerWidth / 2; })); }
      await p.evaluate(y => scrollTo(0, y), m.kTop + m.kH * 0.3); await p.waitForTimeout(100);
      line.push('kapanis gorunur mu (halka sirasinda): ' + await p.evaluate(() => { const r = document.querySelector('.d-kapanis').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }));
    } else {
      await p.evaluate(() => document.querySelector('.d-serit').scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(200);
      line.push('serit kart1 ' + await p.evaluate(() => { const r = document.querySelector('.d-kart').getBoundingClientRect(); return Math.round(r.left) + '-' + Math.round(r.right); }));
      for (let i = 0; i < 5; i++) { await p.click('.d-ileri'); await p.waitForTimeout(500); }
      line.push('son ' + await p.evaluate(() => { const k = [...document.querySelectorAll('.d-kart')].pop().getBoundingClientRect(); return Math.round(k.left) + '-' + Math.round(k.right) + ' ' + document.querySelector('.d-sayac').textContent + ' ileri.disabled=' + document.querySelector('.d-ileri').disabled; }));
      line.push('ikili ' + await p.evaluate(() => { const t = document.querySelector('.hk-liste .i-telefon img').getBoundingClientRect(); const g = document.querySelector('.hk-liste .i-tablet img').getBoundingClientRect(); return 'tel ' + Math.round(t.width) + 'px oyun ' + Math.round(g.width) + 'px'; }));
    }
    console.log(w + 'x' + h, 'over', m.over, '|', line.join(' | '));
    await p.close();
  }
  await b.close();
})();
