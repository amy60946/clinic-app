// kapanis.html'i kare kare PNG'ye çevirir: node cek.js <klasör> [saniye] [fps]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const dir = process.argv[2], T = +(process.argv[3] || 5.6), FPS = +(process.argv[4] || 30);
  fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('file://' + __dirname + '/kapanis.html');
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  const n = Math.round(T * FPS);
  for (let i = 0; i < n; i++) {
    await p.evaluate((t) => window.render(t), i / FPS);
    await p.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.png` });
  }
  await b.close();
  console.log('kapanış', n, 'kare');
})();
