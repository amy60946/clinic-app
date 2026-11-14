const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
  await p.goto('file:///tmp/claude-0/-home-user/fb2da549-3bc7-5db4-8823-68feb6cf99d9/scratchpad/moyo-site/index.html');
  await p.waitForTimeout(1500);
  // gösterimi son hâline getir (onaylandı), sonra telefonu kırp
  await p.evaluate(() => { const s = document.querySelector('[data-gosterim]'); if (s) { s.className = s.className.replace(/\bs-\S+/g, '') + ' yok-js s-done s-push s-pending s-ok'; } });
  await p.waitForTimeout(800);
  const ph = await p.$('.sahne .phone'); if (ph) await ph.screenshot({ path: 'img/ebeveyn-telefon.png', omitBackground: true });
  const tb = await p.$('.sahne .tablet'); if (tb) await tb.screenshot({ path: 'img/oyun-tablet.png' });
  console.log('ok', !!ph, !!tb);
  await b.close();
})();
