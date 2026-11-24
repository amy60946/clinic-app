// node framefit.js <phone|ipad>: rapor çerçevesinde metin kesmeyen kaydırma değerleri (0..400)
const dev = process.argv[2];
const base = require(dev === 'phone' ? './base-phone' : './base-ipad');
const { SCREENS } = require(dev === 'phone' ? './capture-phone' : './capture-ipad');
process.env.V06 = 'rapor'; process.env.W06 = '0';
(async () => {
  const s = await base.start(); const p = s.page;
  await SCREENS['06'](p, { explore: true });
  const fr = p.frames().find((f) => f !== p.mainFrame());
  const r = await fr.evaluate(() => { const H = innerHeight, boxes = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) { if (!n.nodeValue.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const b of rg.getClientRects()) if (b.width) boxes.push([b.top + scrollY, b.bottom + scrollY]); }
    // satır kutuları (tablo satırları, kartlar): kenarlıklı ya da zeminli öğeler
    for (const e of document.querySelectorAll('tr,div,section,table')) { const b = e.getBoundingClientRect(); const st = getComputedStyle(e);
      if (b.height > 8 && b.height < H - 40 && (parseFloat(st.borderTopWidth) > 0 || parseFloat(st.borderBottomWidth) > 0 || st.backgroundColor !== 'rgba(0, 0, 0, 0)')) boxes.push([b.top + scrollY, b.bottom + scrollY]); }
    const max = document.documentElement.scrollHeight - H, ok = [];
    for (let s = 0; s <= Math.min(400, max); s++) if (!boxes.some(([a, z]) => (a < s - 0.5 && z > s + 0.5) || (a < s + H - 0.5 && z > s + H + 0.5))) ok.push(s);
    return { H, max, ok }; });
  const runs = []; for (const d of r.ok) { const l = runs[runs.length - 1]; if (l && d === l[1] + 1) l[1] = d; else runs.push([d, d]); }
  console.log('H', r.H, 'max', r.max, 'geçerli:', runs.map(([a, b]) => a === b ? a : `${a}–${b}`).join(' '));
  await s.browser.close();
})();
