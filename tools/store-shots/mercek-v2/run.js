// node run.js <phone|ipad> <çıktı klasörü> [01 02 ...]: ekranları çeker, metin ve kenar denetimi
const dev = process.argv[2], OUT = process.argv[3], ONLY = process.argv.slice(4);
const base = require(dev === 'phone' ? './base-phone' : './base-ipad');
const { SCREENS } = require(dev === 'phone' ? './capture-phone' : './capture-ipad');
const fs = require('fs');
const BAD = /eğitim|Eğitim|EĞİTİM|modül|Modül|Kütüphane|kütüphane|Kaynak|kaynak|Nazl|macera|Macera|ClinicApp|undefined|Error|error|hata oluştu|Hata/g;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const id of Object.keys(SCREENS)) {
    if (ONLY.length && !ONLY.includes(id)) continue;
    const s = await base.start(); const p = s.page;
    try {
      await SCREENS[id](p);
      const txt = await base.shot(p, `${OUT}/${id}.png`);
      fs.writeFileSync(`${OUT}/${id}.txt`, txt);
      // ekranda görünen metin (görünüm içindeki metin düğümleri)
      const visTxt = await p.evaluate(() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n; (n = w.nextNode());) { if (!n.nodeValue.trim()) continue; const r = document.createRange(); r.selectNodeContents(n);
          for (const b of r.getClientRects()) { if (!(b.width && b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth)) continue;
            const x = Math.min(innerWidth - 1, Math.max(0, b.left + b.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, b.top + b.height / 2));
            const hit = document.elementFromPoint(x, y); if (hit && (hit === n.parentElement || n.parentElement.contains(hit) || hit.contains(n.parentElement))) { out.push(`${Math.round(b.top)}-${Math.round(b.bottom)} x${Math.round(b.left)}-${Math.round(b.right)}\t${n.nodeValue.trim()}`); break; } } }
        return out.join('\n'); });
      fs.writeFileSync(`${OUT}/${id}.lay.txt`, visTxt); const visOnly = visTxt.split('\n').map((l) => l.split('\t')[1] || '').join('\n'); fs.writeFileSync(`${OUT}/${id}.vis.txt`, visOnly);
      const cut = await p.evaluate(() => { const H = innerHeight, out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const seen = (n, x, y) => { const hit = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, x)), y); return hit && (hit === n.parentElement || n.parentElement.contains(hit) || hit.contains(n.parentElement)); };
        for (let n; (n = w.nextNode());) { if (!n.nodeValue.trim()) continue; const r = document.createRange(); r.selectNodeContents(n);
          for (const b of r.getClientRects()) { if (!b.width) continue; const cx = b.left + b.width / 2;
            if (b.top < H - 0.5 && b.bottom > H + 1 && seen(n, cx, H - 1)) out.push(`${n.nodeValue.trim().slice(0, 40)} [${Math.round(b.top)}-${Math.round(b.bottom)}]`);
            if (b.top < -0.5 && b.bottom > 1 && seen(n, cx, 0)) out.push(`${n.nodeValue.trim().slice(0, 40)} [${Math.round(b.top)}-${Math.round(b.bottom)}]`); } }
        return out.slice(0, 8); });
      const side = await p.evaluate(() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n; (n = w.nextNode());) { if (!n.nodeValue.trim()) continue; const r = document.createRange(); r.selectNodeContents(n);
          for (const b of r.getClientRects()) { if (!(b.width && b.bottom > 0 && b.top < innerHeight)) continue;
            // ekran kenarında ya da kırpan kapsayıcının (yatay kaydırma) kenarında kesilen metin
            let clipL = 0, clipR = innerWidth;
            for (let c = n.parentElement; c; c = c.parentElement) { const ox = getComputedStyle(c).overflowX; if (ox !== 'visible') { const cb = c.getBoundingClientRect(); clipL = Math.max(clipL, cb.left); clipR = Math.min(clipR, cb.right); } }
            const cy = Math.min(innerHeight - 1, Math.max(0, b.top + b.height / 2));
            const seen = (x) => { const hit = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, x)), cy); return hit && (hit === n.parentElement || n.parentElement.contains(hit) || hit.contains(n.parentElement)); };
            if ((b.left < clipL - 0.5 && b.right > clipL + 1 && seen(clipL + 1)) || (b.left < clipR - 1 && b.right > clipR + 0.5 && seen(clipR - 1))) out.push(n.nodeValue.trim().slice(0, 30)); } }
        return out.slice(0, 6); });
      // rapor çerçevesi (iframe): görünen alanın üst / alt kenarında kesilen metin, son görünen satırlar
      for (const fr of p.frames()) { if (fr === p.mainFrame()) continue;
        const r = await fr.evaluate(() => { const H = innerHeight, out = [], vis = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          for (let n; (n = w.nextNode());) { if (!n.nodeValue.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n);
            for (const b of rg.getClientRects()) { if (!b.width) continue; if ((b.top < H - 0.5 && b.bottom > H + 1) || (b.top < -0.5 && b.bottom > 1)) out.push(n.nodeValue.trim().slice(0, 30));
              if (b.bottom > 0 && b.top < H) vis.push(`${Math.round(b.top)}-${Math.round(b.bottom)} ${n.nodeValue.trim().slice(0, 40)}`); } }
          return { H, cut: out.slice(0, 6), first: vis.slice(0, 3), last: vis.slice(-4), txt: document.body.innerText, st: scrollY }; }).catch(() => null);
        if (r) { console.log(`  çerçeve H${r.H} st${r.st}`, r.cut.length ? 'KESİK: ' + r.cut.join(' | ') : 'kesik yok', '· ilk:', r.first.join(' / '), '· son:', r.last.join(' / '));
          const fb = [...new Set(r.txt.match(BAD) || [])]; if (fb.length) console.log('  çerçevede METİN:', fb.join(','));
          fs.writeFileSync(`${OUT}/${id}.frame.txt`, r.txt); } }
      const badAll = [...new Set(txt.match(BAD) || [])], badVis = [...new Set(visOnly.match(BAD) || [])];
      console.log(dev, id, 'tamam', cut.length ? 'KESİK üst/alt: ' + cut.join(' | ') : '', side.length ? 'KESİK yan: ' + side.join(' | ') : '',
        badVis.length ? 'GÖRÜNEN METİN: ' + badVis.join(',') : '', badAll.length ? '(sayfada: ' + badAll.join(',') + ')' : '', p.errors.length ? 'hatalar: ' + JSON.stringify(p.errors.slice(0, 3)) : '');
    } catch (e) { console.log(dev, id, 'HATA', e.message.slice(0, 300)); await p.screenshot({ path: `${OUT}/${id}-hata.png` }); }
    finally { await s.browser.close(); }
  }
})();
