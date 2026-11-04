// node render.js altA  -> out/altA/<name>.png (iPhone 1320x2868 at DSF 3; DSF=2 for ipad.html -> 2752x2064)
const { chromium } = require('playwright');
const fs = require('fs');
const alt = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 3200, height: 1000 }, deviceScaleFactor: Number(process.env.DSF || 3) })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('requestfailed', (r) => errs.push('fail ' + r.url()));
  await p.goto(`file://${__dirname}/${alt}.html`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
  fs.mkdirSync(`${__dirname}/out/${alt}`, { recursive: true });
  const frames = p.locator('.frame');
  for (let i = 0; i < await frames.count(); i++) {
    const f = frames.nth(i); const n = await f.getAttribute('data-name');
    await f.screenshot({ path: `${__dirname}/out/${alt}/${n}.png` });
  }
  // panorama: one wide .pano canvas cut into 440 px frames
  const pano = p.locator('.pano');
  if (await pano.count()) {
    const bx = await pano.boundingBox(); const k = Math.round(bx.width / 440);
    for (let i = 0; i < k; i++) await p.screenshot({ path: `${__dirname}/out/${alt}/0${i + 1}.png`, clip: { x: bx.x + i * 440, y: bx.y, width: 440, height: 956 } });
    await pano.screenshot({ path: `${__dirname}/out/${alt}-pano.png`, scale: 'css' });
  }
  console.log(alt, await frames.count(), 'frames', errs.slice(0, 4));
  await b.close();
})();
