// Mercek sitesinin durağan ekran görüntüleri (24 Kasım 2026, ebeveyn eğitimi kapalıyken yeniden): uydurma veri, imleç yok.
// Önce: `bash preview/build.sh`. Kullanım: node tools/mercek-onizleme/cek.js [neden-oneri neden-kayit neden-seans pano]
// Çıktı (site/assets): neden-oneri.webp, neden-kayit.webp, neden-seans.webp (640 × 250 nokta, ×2 → 1280 × 500; "Neden Moyo Mercek"
// kartları) ve pano-2x.webp (1440 × 900, ×2 → 2880 × 1800; danışan panosu). Pano için renkli işaretlerin 1440 × 900 düzlemindeki
// konumları da yazılır (index.html "pn-o" --x/--y/--w/--h; site.css "Pano: renkli başlıklar").
// Oturum, veri ve ipuçlarının kapatılması tools/landing-motion/kit.js ile aynı (kit.open).
const path = require('path');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const kit = require('../landing-motion/kit');
const { vis, openClient } = require('../landing-motion/scenes/_common');

const OUT = path.resolve(__dirname, '../../site/assets');
const TMP = path.join(os.tmpdir(), 'mercek-cek');
fs.mkdirSync(TMP, { recursive: true });
const only = process.argv.slice(2);
const want = (n) => !only.length || only.includes(n);

const temiz = (p) => p.evaluate(() => { const c = document.getElementById('__lm-cursor'); if (c) c.remove(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
const box = async (loc) => { const b = await loc.first().boundingBox(); if (!b) throw new Error('kutu yok'); return b; };
async function kirp(p, name, x, y, w = 640, h = 250) {
  await temiz(p); await p.mouse.move(1439, 899); await p.waitForTimeout(600);
  const png = path.join(TMP, name + '.png');
  await p.screenshot({ path: png, clip: { x: Math.round(x), y: Math.round(y), width: w, height: h } });
  execFileSync('python3', ['-c', `from PIL import Image; Image.open('${png}').convert('RGB').save('${path.join(OUT, name + '.webp')}', 'WEBP', quality=86, method=6)`]);
  console.log('ok', name);
}

(async () => {
  const s = await kit.open('desktop', { more: true });
  const p = s.page;
  try {
    if (want('pano')) {
      // pano ekranı doldursun: "Danışanlar (" başlığı üstten 22 noktada (tools/landing-motion/scenes/pano.js ile aynı hizalama)
      await p.evaluate(() => {
        const el = [...document.querySelectorAll('div,span')].find((e) => e.childElementCount === 0 && e.textContent.trim().startsWith('Danışanlar (') && e.getBoundingClientRect().width > 0);
        let c = el.parentElement;
        for (; c; c = c.parentElement) { const st = getComputedStyle(c); if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && c.scrollHeight > c.clientHeight) break; }
        (c || document.scrollingElement).scrollTop += el.getBoundingClientRect().top - 22;
      });
      // Panonun üstündeki kısa açıklama "Senin sıran" başlığını da anlatıyor; Takip Planı ve ebeveyn eğitimi kapalıyken o bölüm hiç
      // oluşmadığı için (attention.ts) görselde gizlenir (24 Kasım 2026). Uygulamadaki metin 3edf312'de iki başlığa göre düzeltildi;
      // o değişiklik önizlemeye girince bu gizleme kaldırılıp pano yeniden çekilebilir.
      await p.evaluate(() => {
        const el = [...document.querySelectorAll('div')].find((e) => e.textContent.trim().startsWith('Danışanların üç başlık altında') && e.getBoundingClientRect().height < 80 && e.getBoundingClientRect().width > 0);
        if (el) el.style.display = 'none';
      });
      await temiz(p); await p.mouse.move(1439, 899); await p.waitForTimeout(900);
      const png = path.join(TMP, 'pano.png');
      await p.screenshot({ path: png });
      execFileSync('python3', ['-c', `from PIL import Image; Image.open('${png}').convert('RGB').save('${path.join(OUT, 'pano-2x.webp')}', 'WEBP', quality=84, method=6)`]);
      // işaret konumları: süzgeç çipleri (n1), iki bölümün başlığı ve kart grubu (n2 Ebeveynden yeni, n3 Sessiz kalanlar)
      const r = await p.evaluate(() => {
        const leaf = (re) => [...document.querySelectorAll('div,span')].find((e) => e.childElementCount === 0 && re.test(e.textContent.trim()) && e.getBoundingClientRect().width > 0);
        const rect = (e) => { const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; };
        const hepsi = leaf(/^Hepsi$/), mert = leaf(/^Mert Örnek$/);
        const chip = (e) => { let c = e; while (c.parentElement && c.parentElement.getBoundingClientRect().height < 60) c = c.parentElement; return c; };
        const a = rect(chip(hepsi)), b = rect(chip(mert));
        const sec = (re) => {
          const h = leaf(re); const hb = rect(h);
          // başlığın altındaki ilk geniş beyaz kutu: kart grubu
          const cards = [...document.querySelectorAll('div')].filter((d) => { const q = d.getBoundingClientRect(); return q.top > hb.y + hb.h && q.top < hb.y + hb.h + 30 && q.width > 600 && getComputedStyle(d).backgroundColor === 'rgb(255, 255, 255)'; })[0];
          return { baslik: hb, kartlar: cards ? rect(cards) : null };
        };
        return { cipler: { x: a.x, y: a.y, w: b.x + b.w - a.x, h: a.h }, yeni: sec(/^Ebeveynden yeni/i), sessiz: sec(/^Sessiz kalanlar/i) };
      });
      console.log('pano işaretleri (1440 × 900):', JSON.stringify(r));
    }
    await openClient(p);                                   // Nazlı; Ev Rutinleri'yle açılır
    if (want('neden-kayit')) {
      await vis(p, 'Kahvaltını yap').first().click(); await p.waitForTimeout(1500);
      const b = await box(vis(p, 'Son 4 hafta, gün gün'));
      await kirp(p, 'neden-kayit', b.x - 6, b.y - 4);              // başlık + dört gün, alt kenar satır sınırında
      await p.locator('[aria-label="Kapat"]').filter({ visible: true }).last().click(); await p.waitForTimeout(900);
    }
    if (want('neden-oneri')) {
      await p.getByText(/Aileye öner$/).filter({ visible: true }).first().click(); await p.waitForTimeout(1500);
      const c = await box(vis(p, 'Sabah rutini'));
      await kirp(p, 'neden-oneri', c.x - 34, c.y - 76);             // iki sıra rutin kartı tam, üçüncü sütun taşar
      await p.locator('[aria-label="Kapat"]').filter({ visible: true }).last().click(); await p.waitForTimeout(900);
    }
    if (want('neden-seans')) {
      await vis(p, 'Seanslar').first().click(); await p.waitForTimeout(1500);
      await vis(p, '11 Kas Çar').first().click(); await p.waitForTimeout(1800);
      const t = await box(p.getByText(/^Son seanstan bu yana/).filter({ visible: true }));
      await kirp(p, 'neden-seans', t.x - 14, t.y - 12);
    }
    if (p.errors.length) console.log('sayfa hataları:', JSON.stringify(p.errors.slice(0, 3)));
  } finally { await s.browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
