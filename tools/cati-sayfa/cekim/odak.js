const { chromium } = require('playwright');
const { prep } = require('/home/user/amy60946/parent-app/store/capture/prep.js');
const OUT = process.argv[2];
const box = async (p, t) => { try { return await p.getByText(t, { exact: true }).filter({ visible: true }).last().boundingBox(); } catch { return null; } };
(async () => {
  const b = await chromium.launch();
  const ctx = async () => (await b.newContext({ viewport: { width: 440, height: 868 }, deviceScaleFactor: 3 })).newPage();
  // 1) Onay
  let p = await ctx(); await prep(p, {});
  for (const st of ['~1 macera onayını bekliyor', '@Yatağını topla, Nazlı: incele', 'Şimdi değil', '@Yatağını topla, Nazlı: incele']) {
    try { if (st[0] === '@') await p.getByLabel(st.slice(1)).first().click({ timeout: 4000 }); else if (st[0] === '~') await p.getByText(st.slice(1)).first().click({ timeout: 4000 }); else await p.getByText(st, { exact: true }).first().click({ timeout: 4000 }); } catch { console.log('MISS', st); }
    await p.waitForTimeout(1100);
  }
  const a = await box(p, 'Macerayı incele'), o = await box(p, 'Onayla');
  console.log('onay', JSON.stringify(a), JSON.stringify(o));
  if (a && o) await p.screenshot({ path: OUT + '/odak-onay.png', clip: { x: 0, y: Math.max(0, a.y - 22), width: 440, height: Math.min(868, o.y + o.height + 26) - Math.max(0, a.y - 22) } });
  // 2) İlerleme
  p = await ctx(); await prep(p, {});
  try { await p.getByText('Gelişim', { exact: true }).first().click({ timeout: 4000 }); } catch {}
  await p.waitForTimeout(1300); try { await p.getByText('Kapat', { exact: true }).first().click({ timeout: 1500 }); } catch {}
  await p.waitForTimeout(800);
  for (const t of ["Nazlı'nın gelişimi", 'Bugün tamamlanan', 'Günlük tutarlılık', 'Haftalık tamamlama', 'Alışkanlıklar · son 4 hafta', 'Bugün']) console.log(t, JSON.stringify(await box(p, t)));
  await p.screenshot({ path: OUT + '/odak-ilerleme-tam.png' });
  await b.close();
})();
