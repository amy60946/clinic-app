// iPad raw screens (landscape 1376x1032 @2) for the iPad hero frame of each alternative
const lib = require('../lib.js');
const OUT = __dirname + '/raw/';
(async () => {
  const { b, p } = await lib.open('ipad');
  const shot = async (n) => { await p.waitForTimeout(900); await p.screenshot({ path: OUT + n + '.png' }); console.log('shot', n); };
  await shot('ipad-board');
  await lib.clickText(p, 'Nazlı');
  await lib.clickText(p, 'Takip Planı');
  await shot('ipad-plan');
  await lib.clickText(p, 'Kitaplık').catch((e) => console.log(String(e)));
  await shot('ipad-plan-lib');
  console.log('errors', p.errors.slice(0, 3));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
