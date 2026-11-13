const path = '/home/user/clinic-app/tools/landing-motion/';
const { open } = require(path + 'kit.js'); const { T, openClient } = require(path + 'scenes/_common.js');
const OUT = process.argv[2];
(async () => {
  const s = await open('desktop'); const p = s.page;
  await p.setViewportSize({ width: 640, height: 1100 }); await p.waitForTimeout(1000);
  await p.addStyleTag({ content: '#__lm-cursor,.__lm-ring{display:none!important}' });
  await openClient(p);
  await p.waitForTimeout(1200);
  const c = p.getByRole('button', { name: T, exact: true }).filter({ visible: true }).first();
  const bb = await c.boundingBox(); console.log('kart', JSON.stringify(bb));
  // eğitim kartı + üstündeki bölüm başlığı: kartın 150 px üstünden başla
  await p.screenshot({ path: OUT + '/egitim-kart.png', clip: { x: Math.max(0, bb.x - 16), y: Math.max(0, bb.y - 170), width: Math.min(640, bb.width + 32), height: bb.height + 200 } });
  await c.click(); await p.waitForTimeout(1800);
  await p.setViewportSize({ width: 640, height: 820 }); await p.waitForTimeout(800);
  const tb = await p.getByText('Tüm eğitimler').filter({ visible: true }).first().boundingBox(); console.log('tum', JSON.stringify(tb));
  await p.setViewportSize({ width: 640, height: Math.round(tb.y + 1100) }); await p.waitForTimeout(800);
  const alt = await p.evaluate((y0) => { let m = 0; document.querySelectorAll('svg').forEach((g) => { const r = g.getBoundingClientRect(); if (r.width > 200 && r.top > y0 && r.bottom < y0 + 1000) m = Math.max(m, r.bottom); }); return m; }, tb.y);
  console.log('grafik alt', alt);
  await p.screenshot({ path: OUT + '/egitim-detay.png', clip: { x: 0, y: Math.max(0, tb.y - 14), width: 640, height: Math.round((alt || tb.y + 620) - tb.y + 40) } });
  console.log((await p.evaluate(() => document.body.innerText)).replace(/\n+/g, ' / ').slice(0, 500));
  process.exit(0);
})();
