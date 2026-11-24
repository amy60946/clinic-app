// node fits.js <phone|ipad> <ekran> <çapa> <lo> <hi> [bar]: geçerli kaydırma payları
const [dev, id, anchor, lo, hi, bar] = process.argv.slice(2);
const base = require(dev === 'phone' ? './base-phone' : './base-ipad');
const { SCREENS } = require(dev === 'phone' ? './capture-phone' : './capture-ipad');
(async () => {
  const s = await base.start(); const p = s.page;
  await SCREENS[id](p, { explore: true });
  const r = await base.fit(p, anchor, { cards: !process.env.NOCARDS, lo: +lo, hi: +hi, bar: bar ? [760, 824] : undefined, barClear: bar === 'clear' ? [760, 824] : undefined });
  r.ok.sort((a, b) => a - b);
  // aralıkları yaz
  const runs = []; for (const d of r.ok) { const l = runs[runs.length - 1]; if (l && d === l[1] + 1) l[1] = d; else runs.push([d, d]); }
  console.log('st', r.st, 'maxD', r.maxD, 'boxes', r.n, 'geçerli:', runs.map(([a, b]) => a === b ? a : `${a}–${b}`).join(' '));
  await s.browser.close();
})();
