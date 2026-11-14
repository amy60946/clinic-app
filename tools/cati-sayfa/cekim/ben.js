const { chromium } = require('playwright');
const { prep } = require('/home/user/amy60946/parent-app/store/capture/prep.js');
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 440, height: 868 }, deviceScaleFactor: 3 })).newPage();
  await prep(p, { clinic: true });
  await p.waitForTimeout(1500);
  const t = p.getByText('Görevlerin', { exact: true }).first();
  try { await t.scrollIntoViewIfNeeded({ timeout: 4000 }); const bb = await t.boundingBox(); console.log('Görevlerin', JSON.stringify(bb)); } catch (e) { console.log('yok Görevlerin'); }
  await p.waitForTimeout(800);
  for (const k of ['Bugünün ilerlemesi', 'Davranış kaydı', 'Uzmanım']) { try { console.log(k, JSON.stringify(await p.getByText(k, { exact: true }).last().boundingBox())); } catch {} }
  await p.screenshot({ path: OUT + '/ben-gorevler.png' });
  const txt = await p.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n').slice(0, 600));
  console.log(txt.replace(/\n/g, ' / '));
  await b.close();
})();
