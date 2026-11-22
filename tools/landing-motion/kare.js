// Telefon kırpımları için yüksek çözünürlüklü durağan kareler (22 Kasım 2026, kullanıcı kararı "Telefona özel kırp").
// Sahne kayıttaki gibi oynatılır, her tıklama / yakınlaşma / kaydırmadan sonra 2880 × 1800 ekran görüntüsü alınır (imleç gizli).
// Kullanım: node tools/landing-motion/kare.js <klasör> akis kutuphane davranis rapor   → <klasör>/<sahne>-NN.png + kareler.json
const fs = require('fs');
const path = require('path');
const kit = require('./kit');
const DIR = process.argv[2];
const ids = process.argv.slice(3);
fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const list = [];
  for (const id of ids) {
    const scene = require(path.join(__dirname, 'scenes', `${id}.js`));
    const s = await kit.open('desktop', scene.data || {});
    const h = new kit.Human(s, scene.seed || 7);
    let n = 0, son = '';
    const shot = async (what) => {
      await s.page.evaluate(() => { const c = document.getElementById('__lm-cursor'); if (c) c.style.visibility = 'hidden'; });
      const f = path.join(DIR, `${id}-${String(++n).padStart(2, '0')}.png`);
      await s.page.screenshot({ path: f });
      await s.page.evaluate(() => { const c = document.getElementById('__lm-cursor'); if (c) c.style.visibility = ''; });
      list.push({ id, n, file: path.basename(f), t: Math.round(h.t() * 10) / 10, adim: what || son });
    };
    for (const m of ['click', 'zoom', 'unzoom', 'scroll', 'scrollTo', 'type']) {
      if (typeof h[m] !== 'function') continue;
      const orig = h[m].bind(h);
      h[m] = async (...a) => { const r = await orig(...a); const o = a.find((x) => x && typeof x === 'object' && !(x.x !== undefined) && (x.beat || x.after !== undefined)) || {}; await shot(o.beat || `${m} ${typeof a[0] === 'string' ? a[0] : ''}`.trim()); return r; };
    }
    const ob = h.beat.bind(h);
    h.beat = (w) => { son = w; ob(w); };
    try {
      await scene.prepare(h, s);
      h.T0 = kit.now();
      await shot('başlangıç');
      await scene.run(h, s);
    } catch (e) { console.log(id, 'HATA', e.message.slice(0, 200)); }
    finally { await s.browser.close(); }
    console.log(id, n, 'kare');
  }
  fs.writeFileSync(path.join(DIR, 'kareler.json'), JSON.stringify(list, null, 1));
})();
