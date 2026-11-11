// "Kimin sırası" görseli: çok danışanlı uydurma veriyle (tools/store-shots/editdb.js) ana ekran panosu, güncel etiketlerle.
// Kullanım: SHOT_URL=file://$PWD/preview/out/clinic.html node tools/landing-alt/board-shot.js   → tools/landing-alt/assets/board-{d,m}.png
const path = require('path');
const { open } = require('../store-shots/lib');
(async () => {
  for (const [dev, name, ratio] of [['ipad', 'd', 16 / 10], ['iphone', 'm', 393 / 760]]) {
    const { b, p } = await open(dev);
    const head = p.getByText('Senin sıran', { exact: false }).first();
    if (!(await head.count())) { console.log(dev, 'pano bulunamadı:', (await p.evaluate(() => document.body.innerText)).slice(0, 200).replace(/\n/g, ' | ')); await b.close(); continue; }
    // başlık, kaydırılan kabın üstüne yakın gelsin (altında danışan satırlarına yer kalsın)
    await p.evaluate(() => {
      const el = [...document.querySelectorAll('div')].filter((d) => !d.childElementCount && /^Senin sıran/.test(d.textContent.trim()))[0];
      let c = el.parentElement;
      while (c) { const st = getComputedStyle(c); if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && c.scrollHeight > c.clientHeight) break; c = c.parentElement; }
      if (c) c.scrollTop += el.getBoundingClientRect().top - c.getBoundingClientRect().top - 30;
    });
    await p.waitForTimeout(700);
    const box = await p.evaluate(() => {
      const el = [...document.querySelectorAll('div')].filter((d) => !d.childElementCount && /^Senin sıran/.test(d.textContent.trim()))[0];
      let c = el; for (let i = 0; i < 12 && c.parentElement; i++) { c = c.parentElement; if (c.getBoundingClientRect().width >= Math.min(innerWidth - 40, 700)) break; }
      const r = c.getBoundingClientRect(), t = el.getBoundingClientRect();
      return { x: r.left, w: r.width, y: t.top, vw: innerWidth, vh: innerHeight };
    });
    const w = Math.min(box.w + 32, box.vw), x = Math.max(0, box.x - 16), y = Math.max(0, box.y - 22), h = Math.min(w / ratio, box.vh - y);
    await p.screenshot({ path: path.join(__dirname, 'assets', `board-${name}.png`), clip: { x, y, width: w, height: h } });
    console.log(dev, JSON.stringify({ x, y, w, h: Math.round(h) }), 'hata:', p.errors.length);
    await b.close();
  }
})();
