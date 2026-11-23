// Oyun çekimi: node cap.js "<komutlar>"  (shots.js'in genişletilmiş kopyası)
// Komutlar: dbg <PofiDebug> · wait ms · click x y · drag x1 y1 x2 y2 ms · shot ad · rec ad saniye fps (sanal zamanla adım adım kare)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--use-gl=angle'] });
  const p = await b.newPage({ viewport: { width: +(process.env.W||1000), height: +(process.env.H||462) }, deviceScaleFactor: +(process.env.DSF||1) });
  // sanal saat: rec sırasında performance.now / Date / rAF bizim adımımızla ilerler
  await p.addInitScript(() => {
    const rn = performance.now.bind(performance), rd = Date.now;
    let virt = false, base = 0, off = 0, q = [];
    const ro = window.requestAnimationFrame.bind(window);
    performance.now = () => virt ? base + off : rn();
    Date.now = () => virt ? rd0 + base + off : rd();
    let rd0 = 0;
    window.requestAnimationFrame = cb => { if (virt) { q.push(cb); return q.length; } return ro(cb); };
    window.__vt = {
      start() { base = rn(); off = 0; rd0 = rd() - base; virt = true; },
      step(ms) { off += ms; const cbs = q; q = []; const t = base + off; for (const cb of cbs) { try { cb(t); } catch (e) { console.log('rAF err', e && e.message); } } return cbs.length; },
      stop() { virt = false; const cbs = q; q = []; for (const cb of cbs) ro(cb); },
    };
  });
  p.on('console', m => { const t = m.text(); if (t.includes('PofiDebug') || process.env.LOG) console.log('C:', t.slice(0,300)); });
  p.on('pageerror', e => console.log('ERR', e.message.slice(0, 200)));
  const t0 = Date.now();
  await p.goto(process.env.URL || 'http://localhost:8765/index.html');
  await p.waitForFunction(() => window.unityInstance, null, { timeout: 300000 });
  console.log('yüklendi', ((Date.now()-t0)/1000).toFixed(1), 'sn');
  await p.waitForTimeout(3000);
  for (const raw of process.argv[2].split(';')) {
    const s = raw.trim(); if (!s) continue; const [cmd, ...a] = s.split(/\s+/);
    if (cmd === 'dbg') await p.evaluate(x => window.unityInstance.SendMessage('Bootstrap', 'PofiDebug', x), a.join(' '));
    else if (cmd === 'wait') await p.waitForTimeout(+a[0]);
    else if (cmd === 'click') { await p.mouse.click(+a[0], +a[1]); await p.waitForTimeout(400); }
    else if (cmd === 'tap') {   // dokunma izi (beyaz halka, sonraki rec'in ~14 karesinde söner) + tıklama
      await p.evaluate(([x, y]) => { let d = document.getElementById('__dot'); if (!d) { d = document.createElement('div'); d.id = '__dot'; d.style.cssText = 'position:fixed;z-index:99999;width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.45);border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.35);pointer-events:none'; document.body.appendChild(d); } d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.opacity = '1'; d.style.transform = 'translate(-50%,-50%)'; window.__dotN = 14; }, [+a[0], +a[1]]);
      await p.mouse.click(+a[0], +a[1]); await p.waitForTimeout(150);
    }
    else if (cmd === 'drag') { await p.mouse.move(+a[0], +a[1]); await p.mouse.down(); const n=20; for (let i=1;i<=n;i++){ await p.mouse.move(+a[0]+(a[2]-a[0])*i/n, +a[1]+(a[3]-a[1])*i/n); await p.waitForTimeout((+a[4]||600)/n); } await p.mouse.up(); }
    else if (cmd === 'shot') { const t=Date.now(); await p.screenshot({ path: a[0] + '.png', timeout: 180000 }); console.log('shot', a[0], Date.now()-t, 'ms'); }
    else if (cmd === 'rec') {
      // rec klasör saniye fps [x1 y1 x2 y2]: isteğe bağlı sürükleme (kuşbakışı kaydırma) her kareye yumuşak eğriyle dağıtılır
      const dir = a[0], secs = +a[1], fps = +(a[2]||30); fs.mkdirSync(dir, { recursive: true });
      const start = fs.readdirSync(dir).filter(f => /^\d{4}\.png$/.test(f)).length;   // aynı klasöre ikinci rec: numara devam eder
      const dr = a.length >= 7 ? a.slice(3, 7).map(Number) : null;
      const ease = t => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
      await p.evaluate(() => window.__vt.start());
      const n = Math.round(secs*fps), t = Date.now();
      if (dr) { await p.mouse.move(dr[0], dr[1]); await p.mouse.down(); }
      for (let i = 0; i < n; i++) {
        if (dr) { const e = ease((i + 1) / n); await p.mouse.move(dr[0] + (dr[2]-dr[0])*e, dr[1] + (dr[3]-dr[1])*e); }
        let k = 0; for (let tries = 0; tries < 50 && k === 0; tries++) { k = await p.evaluate(ms => window.__vt.step(ms), 1000/fps); if (!k) await p.waitForTimeout(5); }
        await p.evaluate(() => { const d = document.getElementById('__dot'); if (d && window.__dotN > 0) { window.__dotN--; d.style.opacity = String(Math.min(1, window.__dotN / 10)); d.style.transform = `translate(-50%,-50%) scale(${1 + (14 - window.__dotN) * 0.04})`; } });
        await p.screenshot({ path: `${dir}/${String(start + i).padStart(4,'0')}.png` });
      }
      if (dr) await p.mouse.up();
      await p.evaluate(() => window.__vt.stop());
      console.log('rec', dir, n, 'kare', ((Date.now()-t)/1000).toFixed(0), 'sn');
    }
  }
  await b.close();
})();
