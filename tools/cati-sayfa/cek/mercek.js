// Çatı sayfa için gerçek Moyo Mercek ekranları (uydurma veri; tam pencere, kırpma yok).
// Önce: clinic-app'te `bash preview/build.sh`. Kullanım: node tools/cati-sayfa/cek/mercek.js [yalnız-ad …]
// Çıktı: tools/cati-sayfa/img/mercek-{pano,egitim,rutin,davranis}.webp (1440×900) ve mercek-{rutin,egitim}-tel.webp (600×1298).
// Oturum, uydurma veri ve bir kez görünen ipuçlarının kapatılması tools/landing-motion/kit.js ile aynı (kit.open).
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const kit = require('../../landing-motion/kit');
const { vis, tab, card, openClient, openTraining } = require('../../landing-motion/scenes/_common');

const IMG = path.resolve(__dirname, '../img');
const TMP = path.join(os.tmpdir(), 'cati-cek');
fs.mkdirSync(TMP, { recursive: true });
// Telefon: 390×844 nokta ×2 (çatı sayfadaki öteki telefon görselleriyle aynı oran)
kit.DEVICES.tel = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, cursor: 'touch', out: [780, 1688],
  userAgent: kit.DEVICES.phone.userAgent };
const only = process.argv.slice(2);
const want = (n) => !only.length || only.includes(n);

async function shot(p, name, width) {
  await p.evaluate(() => { const c = document.getElementById('__lm-cursor'); if (c) c.remove(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  await p.waitForTimeout(700);
  const png = path.join(TMP, name + '.png');
  await p.screenshot({ path: png });
  console.log(execFileSync('python3', [path.join(__dirname, 'kucult.py'), png, path.join(IMG, name + '.webp'), String(width)], { encoding: 'utf8' }).trim());
}
const park = async (p, tel) => { if (!tel) { await p.mouse.move(1436, 560); await p.waitForTimeout(250); } };
const section = async (p, name) => { await vis(p, name).first().click(); await p.waitForTimeout(1800); };

async function run(device, tel) {
  const s = await kit.open(device, { more: true });
  const p = s.page;
  try {
    if (!tel && want('mercek-pano')) { await park(p, tel); await shot(p, 'mercek-pano', 1440); }
    await openClient(p);                                   // Nazlı; danışan Ebeveyn Eğitimi'yle açılır
    if (want(tel ? 'mercek-egitim-tel' : 'mercek-egitim')) {
      await openTraining(p);
      await tab(p, 'Öğrenme modülleri').click(); await p.waitForTimeout(1200);
      await park(p, tel); await shot(p, tel ? 'mercek-egitim-tel' : 'mercek-egitim', tel ? 600 : 1440);
    }
    if (want(tel ? 'mercek-rutin-tel' : 'mercek-rutin')) {
      await section(p, 'Ev Rutinleri');
      await park(p, tel); await shot(p, tel ? 'mercek-rutin-tel' : 'mercek-rutin', tel ? 600 : 1440);
    }
    if (!tel && want('mercek-davranis')) {
      await section(p, 'Davranışlar ve Olaylar');
      await card(p, 'Ekranı kapatırken ağlama').first().click({ position: { x: 240, y: 26 } }); await p.waitForTimeout(1300);
      await park(p, tel); await shot(p, 'mercek-davranis', 1440);
    }
    if (p.errors.length) console.log('sayfa hataları:', JSON.stringify(p.errors.slice(0, 3)));
  } finally { await s.browser.close(); }
}

(async () => {
  if (!only.length || only.some((n) => !n.endsWith('-tel'))) await run('desktop', false);
  if (!only.length || only.some((n) => n.endsWith('-tel'))) await run('tel', true);
})().catch((e) => { console.error(e); process.exit(1); });
