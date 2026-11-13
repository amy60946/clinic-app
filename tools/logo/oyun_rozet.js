// Moyo Oyun ikonu: sağ altta küçük Moyo logosu, dört alternatif (kullanıcı isteği 14 Kasım 2026).
// Kullanım: node tools/logo/oyun_rozet.js <game-app>/Assets/_Pofi/Art/AppIcon.png <çıktı klasörü>
// Oyunun ikonu yalnız okunur; çıktı 1024 PNG (oyun-<x>-1024.png) + 512 WebP önizleme (oyun-<x>.webp). İkonun kendisini Oyun penceresi atar.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [src, out] = process.argv.slice(2);
const LOGO = path.join(__dirname, '../../site/assets/logo');
const b64 = f => 'data:' + (f.endsWith('.svg') ? 'image/svg+xml' : 'image/png') + ';base64,' + fs.readFileSync(f).toString('base64');
const ICON = b64(src), IKON = b64(path.join(LOGO, 'ikon-moyo.svg')), LAC = b64(path.join(LOGO, 'moyo-lacivert.svg')), YES = b64(path.join(LOGO, 'moyo-yesil.svg')), BEY = b64(path.join(LOGO, 'moyo-beyaz.svg'));
const ALT = {
  // A · Rozet: Moyo'nun kendi ikonu, beyaz halkalı küçük kare
  a: `<img src="${IKON}" style="position:absolute;right:76px;bottom:76px;width:286px;height:286px;border-radius:64px;box-shadow:0 0 0 16px #fff,0 18px 40px rgba(0,0,0,.35)">`,
  // B · Etiket: beyaz hap içinde lacivert "moyo"
  b: `<div style="position:absolute;right:84px;bottom:92px;width:440px;height:138px;border-radius:69px;background:#fff;box-shadow:0 16px 40px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center"><img src="${LAC}" style="height:92px"></div>`,
  // C · Köşe: koyu sekme, yeşil "moyo"
  c: `<div style="position:absolute;right:0;bottom:0;width:470px;height:196px;border-top-left-radius:90px;background:#16113A;display:flex;align-items:center;justify-content:flex-start;padding-left:58px;box-sizing:border-box"><img src="${YES}" style="height:96px"></div>`,
  // D · Yalın: zeminsiz beyaz "moyo", gölgeli
  d: `<img src="${BEY}" style="position:absolute;right:92px;bottom:92px;height:128px;filter:drop-shadow(0 6px 10px rgba(0,0,0,.55)) drop-shadow(0 0 2px rgba(0,0,0,.4))">`,
};
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  for (const [k, ov] of Object.entries(ALT)) {
    await p.setContent(`<html><body style="margin:0"><div style="position:relative;width:1024px;height:1024px;overflow:hidden"><img src="${ICON}" style="width:1024px;height:1024px;display:block">${ov}</div></body></html>`);
    await p.waitForTimeout(150);
    const f = path.join(out, `oyun-${k}-1024.png`); await p.screenshot({ path: f });
    console.log('ok', f);
  }
  await b.close();
})();
