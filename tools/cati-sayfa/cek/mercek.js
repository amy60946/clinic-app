// Çatı sayfa için gerçek Moyo Mercek ekranları (uydurma veri; tam pencere, kırpma yok).
// Önce: clinic-app'te `bash preview/build.sh`. Kullanım: node tools/cati-sayfa/cek/mercek.js [yalnız-ad …]
// Çıktı: tools/cati-sayfa/img/mercek-{pano,rutin,davranis}.webp (1440×900), mercek-rutin-tel.webp (600×1298) ve e-nz-uzman.webp (780×1688).
// Ebeveyn eğitimi kapalı (24 Kasım 2026): eğitim ekranı çekilmez; danışan Ev Rutinleri'yle açılır, menü Planla / Takip.
// Oturum, uydurma veri ve bir kez görünen ipuçlarının kapatılması tools/landing-motion/kit.js ile aynı (kit.open).
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const kit = require('../../landing-motion/kit');
const { vis, card, openClient } = require('../../landing-motion/scenes/_common');

const IMG = path.resolve(__dirname, '../img');
const TMP = path.join(os.tmpdir(), 'cati-cek');
fs.mkdirSync(TMP, { recursive: true });
// Telefon: 390×844 nokta ×2 (çatı sayfadaki öteki telefon görselleriyle aynı oran)
// CEK_H=700 CEK_EK=-m: telefon sürümü (23 Kasım 2026) → mercek-*-tel-m.webp, 820 genişlik
const CEK_H = +(process.env.CEK_H || 844), CEK_EK = process.env.CEK_EK || '';
kit.DEVICES.tel = { viewport: { width: 390, height: CEK_H }, deviceScaleFactor: CEK_EK ? 2.2 : 2, isMobile: true, hasTouch: true, cursor: 'touch', out: [CEK_EK ? 858 : 780, Math.round(CEK_H * (CEK_EK ? 2.2 : 2))],
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
    await openClient(p);                                   // Nazlı; danışan Ev Rutinleri'yle açılır
    if (want(tel ? 'mercek-rutin-tel' : 'mercek-rutin')) {
      await park(p, tel); await shot(p, tel ? 'mercek-rutin-tel' + CEK_EK : 'mercek-rutin', tel ? (CEK_EK ? 820 : 600) : 1440);
    }
    // Moyo Ebeveyn sayfası "Neden Moyo" uzman paneli: aynı telefon ekranı 780 × 1688 (yap_m.py NZ "uzman"; çıkma şeridi "Yatağını topla" satırı)
    if (tel && !CEK_EK && want('e-nz-uzman')) {
      await shot(p, 'e-nz-uzman', 780);
      const r = await p.evaluate(() => {
        const t = [...document.querySelectorAll('div')].find((e) => e.childElementCount === 0 && e.textContent.trim() === 'Yatağını topla' && e.getBoundingClientRect().width > 0);
        let a = t; while (a.parentElement && a.parentElement.getBoundingClientRect().height < 120) a = a.parentElement;
        const b = a.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.height)];
      });
      console.log('e-nz-uzman "Yatağını topla" satırı (nokta: y, yükseklik):', JSON.stringify(r));
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
  if (!only.length || only.some((n) => n.endsWith('-tel') || n === 'e-nz-uzman')) await run('tel', true);
})().catch((e) => { console.error(e); process.exit(1); });
