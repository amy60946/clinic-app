// Raw iPhone screens for framed App Store shots: viewport 440x902 (956 minus a drawn 54 px status bar), DSF 3
const fs = require('fs');
const lib = require('../lib.js');
lib.DEVICES.iphone.viewport = { width: 440, height: Number(process.env.H || 902) };
const OUT = __dirname + '/raw/';
(async () => {
  const { b, p } = await lib.open('iphone');
  const boxes = {};
  const shot = async (n) => {
    await p.waitForTimeout(900);
    await p.screenshot({ path: OUT + n + '.png' });
    boxes[n] = await p.evaluate(() => [...document.querySelectorAll('div,span')]
      .filter((e) => e.childElementCount === 0 && e.textContent.trim())
      .map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 60), Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })
      .filter((x) => x[4] > 0 && x[2] > -10 && x[2] < 1800));
    // panels: rounded, filled boxes (cards, sheets) for exact crops
    boxes[n + ':panels'] = await p.evaluate(() => [...document.querySelectorAll('div')].filter((e) => {
      const st = getComputedStyle(e), r = e.getBoundingClientRect();
      return st.backgroundColor !== 'rgba(0, 0, 0, 0)' && parseFloat(st.borderTopLeftRadius) >= 8 && r.width >= 200 && r.height >= 36 && r.top < 1800;
    }).map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }));
    console.log('shot', n);
  };
  const click = (t, o) => lib.clickText(p, t, o);
  await shot('board');
  await click('Nasıl kullanılır?'); await click('Aile neyi görür?');
  await shot('help-sees');
  await p.reload(); await p.waitForTimeout(2500);
  await click('Nazlı');
  await click('Takip Planı');
  await shot('plan-top');
  await lib.scrollToText(p, 'Sabah rutinini hatırlatmasız başlatır', 20).catch(() => {});
  await shot('plan-goal');
  await click('Özet'); await click('8 hafta');
  await shot('ozet');
  await click('Ev Rutinleri');
  await shot('haftalik');
  await click('Zaman İçinde'); await click('8 hafta');
  await shot('zaman');
  await click('Davranış Kayıtları'); await click('8 hafta');
  await shot('abc-top');
  await lib.scrollToText(p, 'Kayıtlar (15)', 12).catch((e) => console.log(String(e)));
  await shot('abc-cards');
  await click('Rapor'); await click('4 hafta');
  await lib.scrollToText(p, 'İlerleme notu (4 hafta)', 14).catch((e) => console.log(String(e)));
  await shot('rapor');
  await click('Raporu yazdır / paylaş', { wait: 2500 });
  const html = await p.evaluate(() => { const f = document.querySelector('iframe'); return f ? f.srcdoc : ''; });
  fs.writeFileSync(OUT + 'report.html', html);
  { const rp = await (await b.newContext({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 })).newPage();
    await rp.setContent(html); await rp.waitForTimeout(600); await rp.screenshot({ path: OUT + 'report.png', fullPage: true }); await rp.close(); }
  await p.keyboard.press('Escape').catch(() => {});
  await p.evaluate(() => document.querySelectorAll('iframe').forEach((f) => f.parentElement && f.parentElement.remove()));
  await click('Danışan Bilgileri');
  await shot('details');
  fs.writeFileSync(OUT + 'boxes.json', JSON.stringify(boxes));
  console.log('errors', p.errors.slice(0, 3));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
