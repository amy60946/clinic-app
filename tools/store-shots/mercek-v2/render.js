// Moyo Mercek App Store seti v2 (24 Kasım 2026, ebeveyn eğitimi kapalı; Moyo "A · Döngü" görünümü): 8 kare panorama → slice.py ile kareler.
// iPhone 6,3": 8×402×874 @3 → 1206×2622 kare; iPad 13": 8×1032×1376 @2 → 2064×2752 kare. Ekranlar ../yayin/mercek-v2/iphone|ipad/01–08.png.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const FONTS = path.resolve(__dirname, '../pa/store/out/fonts');
const SHOTS = { iphone: path.resolve(__dirname, '../yayin/mercek-v2/iphone'), ipad: path.resolve(__dirname, '../yayin/mercek-v2/ipad') };
const { execFileSync } = require('child_process');
// iPhone ekranının üstüne durum çubuğu (Moyo setiyle aynı çizim): renk ekranın üst renginden
const topColor = (file) => execFileSync('python3', ['-I', '-c', 'import sys;from PIL import Image;r,g,b=Image.open(sys.argv[1]).convert("RGB").getpixel((10,4));print("#%02X%02X%02X"%(r,g,b))', file]).toString().trim();
const statusBar = (k, bg, fg = '#0F1B3D') => `<div class="sb" style="height:${54 * k}px;background:${bg};color:${fg};padding:0 ${30 * k}px 0 ${44 * k}px"><span style="font-size:${17 * k}px">9:41</span><svg viewBox="0 0 76 13" style="width:${76 * k}px;height:${13 * k}px" fill="${fg}"><rect x="0" y="8" width="3" height="4" rx=".8"/><rect x="4.6" y="5.6" width="3" height="6.4" rx=".8"/><rect x="9.2" y="3" width="3" height="9" rx=".8"/><rect x="13.8" y=".4" width="3" height="11.6" rx=".8"/><path d="M30.5 3.1a10.6 10.6 0 0 1 14.6 0l1.2-1.2a12.3 12.3 0 0 0-17 0zM33 5.6a7 7 0 0 1 9.6 0l1.2-1.2a8.7 8.7 0 0 0-12 0zM35.4 8.1a3.5 3.5 0 0 1 4.8 0l-2.4 2.5z"/><rect x="50.5" y=".9" width="22" height="11.2" rx="3.2" fill="none" stroke="${fg}" stroke-opacity=".4" stroke-width="1"/><rect x="52.3" y="2.7" width="18.4" height="7.6" rx="1.8"/><path d="M74 4.6v3.8a2 2 0 0 0 0-3.8z" fill-opacity=".45"/></svg></div>`;
const T = [
  ['Seanslar arasında evde olanı görün', 'Ebeveynden yeni gelenler ve sessiz kalan aileler ayrı başlıkta.'],
  ['Evdeki rutinleri görün', 'Ailenin rutinleri ve adımları haftalık tabloda.'],
  ['Evden gelen kayıtlar', 'Ebeveynin bildirdiği davranışlar, tarih sırasıyla.'],
  ['Takip edilecek davranışı belirleyin', 'Sıklık, ABC ya da süre; ebeveyn Moyo\'dan bildirir.'],
  ['Seansa hazır girin', 'Takvim, seans notu ve son seanstan bu yana evde olanlar.'],
  ['Raporu aileye gönderin', 'Ailenin uygulamada bıraktığı kayıtların özetidir; tanı ya da değerlendirme değildir.'],
  ['Aileyi <span class="nw">e-postayla</span> davet edin', 'Ebeveyn onaylayınca paylaşım başlar; aile istediği an kapatır.'],
  ['Klinikteki ekiple birlikte', 'Birden çok uzman; hangi danışanı kimin göreceğini siz belirlersiniz.'],
];
const DEV = {
  // iPhone: telefon düzeni ekranı 390×844 nokta + 54 noktalık durum çubuğu, 276 px genişlikte; iPad: 900×1000 ekran 840 px
  iphone: { FW: 402, FH: 874, dpr: 3, h: 31, s: 15, sMax: 330, scrW: 276, bw: 6, rad: 32, scrY: 190, top: 30, phone: true },
  ipad: { FW: 1032, FH: 1376, dpr: 2, h: 60, s: 27, sMax: 860, scrW: 840, bw: 10, rad: 40, scrY: 300, top: 44 },
};
const font = (w) => ['latin', 'latin-ext'].map((sub) => `@font-face{font-family:Poppins;font-weight:${w};src:url('file://${FONTS}/poppins-${sub}-${w}-normal.woff2') format('woff2')${sub === 'latin' ? ';unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2000-206F' : ';unicode-range:U+0100-0130,U+0132-02FF,U+1E00-1EFF'}}`).join('\n');
const BLOBS = [[520, -120, 360, '#DCD8F3'], [440, 620, -140, '#D5F2E0'], [560, 1300, 420, '#DCD8F3'], [460, 2000, -160, '#D5F2E0'], [500, 2500, 430, '#DCD8F3'], [440, 3100, -120, '#D5F2E0'], [520, 3600, 420, '#DCD8F3']];
function page(dev) {
  const d = DEV[dev], n = T.length, PW = d.FW * n, sx = d.FW / 402, sy = d.FH / 874, sr = Math.sqrt(sx * sy);
  const blobs = BLOBS.map(([s, l, t, c]) => `<span class="blob" style="width:${s * sr}px;height:${s * sr}px;left:${l * sx}px;top:${t * sy}px;background:${c}"></span>`).join('');
  const frames = T.map(([h, s], i) => {
    const file = `${SHOTS[dev]}/${String(i + 1).padStart(2, '0')}.png`;
    const sb = d.phone ? statusBar(d.scrW / 390, topColor(file)) : '';
    return `<div class="fr"><div class="blk"><p class="h">${h}</p><p class="s">${s}</p></div><div class="scr">${sb}<img src="file://${file}"></div></div>`;
  }).join('');
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${[700, 800].map(font).join('\n')}
*{box-sizing:border-box}html,body{margin:0}
body{width:${PW}px;height:${d.FH}px;overflow:hidden;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;background:#EEF0FB}
.pano{display:flex;position:relative;overflow:hidden;width:${PW}px;height:${d.FH}px;background:#EEF0FB}
.blob{position:absolute;border-radius:50%;z-index:0}
.fr{width:${d.FW}px;height:${d.FH}px;flex:none;position:relative}
.fr.night{background:#16113A}
.blk{position:absolute;left:0;right:0;top:${d.top}px;height:${d.scrY - d.top - d.FH * 0.022}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${d.h * 0.32}px;z-index:2}
.h{margin:0;font-family:Poppins,sans-serif;font-weight:800;font-size:${d.h}px;line-height:1.1;letter-spacing:-0.015em;text-align:center;color:#16113A;max-width:${d.sMax + 20}px;text-wrap:balance}
.s{margin:0;font-size:${d.s}px;line-height:1.42;text-align:center;max-width:${d.sMax}px;color:#3D3858;text-wrap:balance}
.night .h{color:#FFFFFF}.night .s{color:#D9D6EC}
.scr{position:absolute;top:${d.scrY}px;left:${(d.FW - d.scrW - 2 * d.bw) / 2}px;z-index:2;width:${d.scrW + 2 * d.bw}px;border-radius:${d.rad}px;overflow:hidden;border:${d.bw}px solid #16113A;background:#FFFFFF;box-shadow:0 ${d.FH * 0.02}px ${d.FH * 0.05}px rgba(22,17,58,.16)}
.night .scr{border-color:#FFFFFF}
.scr img{display:block;width:100%;height:auto}
.nw{white-space:nowrap}
.sb{display:flex;align-items:center;justify-content:space-between;font-weight:600;letter-spacing:-.2px}
</style></head><body><div class="pano">${blobs}${frames}</div></body></html>`;
}
(async () => {
  const b = await chromium.launch();
  for (const dev of process.argv.slice(2).length ? process.argv.slice(2) : ['iphone', 'ipad']) {
    const d = DEV[dev], html = path.join(__dirname, `pano-${dev}.html`);
    fs.writeFileSync(html, page(dev));
    const pg = await b.newPage({ viewport: { width: d.FW * T.length, height: d.FH }, deviceScaleFactor: d.dpr });
    await pg.goto('file://' + html); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(600);
    const over = await pg.evaluate((FH) => [...document.querySelectorAll('.fr')].map((f, i) => {
      const b = f.querySelector('.blk'), h = b.scrollHeight, sc = f.querySelector('.scr').getBoundingClientRect();
      return h > b.clientHeight || sc.bottom > FH - 20 ? `${i + 1}: başlık ${h}/${b.clientHeight}, ekran altı ${Math.round(sc.bottom)}` : null; }).filter(Boolean), d.FH);
    if (over.length) console.log('TAŞIYOR', dev, over.join(', '));
    await pg.screenshot({ path: path.join(__dirname, `pano-${dev}.png`) });
    console.log('ok', dev);
  }
  await b.close();
})();
