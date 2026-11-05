// ClinicApp önizlemesini (preview/out/clinic.html) verilen genişlikte gezer: her adımda iOS (Yoga) taklidi + ezilen/taşan/
// kesilen/üst üste metin denetimi, ekran görüntüsü ve veritabanı istek kaydı (api.json). Kullanım: README.md
const { chromium } = require('playwright');
const fs = require('fs');
const emu = require('./yoga-emu');
const path = require('path');
const URL = 'file://' + (process.env.PREVIEW || path.resolve(__dirname, '../../preview/out/clinic.html'));
const W = +(process.env.W || 393), H = +(process.env.H || 1400);
const OUT = process.env.OUT || path.join(require('os').tmpdir(), 'clinicapp-qa', `out-${W}`);
fs.mkdirSync(OUT, { recursive: true });
const report = []; const api = [];
const detect = () => {
  const vw = innerWidth; const res = { overflow: [], overlap: [] };
  const leaves = [...document.querySelectorAll('div,span')].filter((e) => !e.childElementCount && (e.textContent || '').trim().length >= 2)
    .map((e) => ({ e, r: e.getBoundingClientRect(), t: e.textContent.trim().slice(0, 30) })).filter((x) => x.r.width > 0 && x.r.height > 0 && x.r.bottom > 0 && x.r.top < innerHeight);
  const scrollsX = (el) => { for (let c = el.parentElement; c; c = c.parentElement) { const s = getComputedStyle(c); if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && c.scrollWidth > c.clientWidth) return true; } return false; };
  for (const x of leaves) if (x.r.right > vw + 1 && !scrollsX(x.e)) res.overflow.push({ t: x.t, right: Math.round(x.r.right) });
  for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
    const a = leaves[i].r, b = leaves[j].r;
    const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (ox > 4 && oy > 4) { // görünür üst üste: ikisi de aynı katmanda (modal arkası değil)
      const hit = (x) => { const h = document.elementFromPoint(x.r.left + x.r.width / 2, x.r.top + x.r.height / 2); return !!h && (h === x.e || x.e.contains(h) || h.contains(x.e)); };
      if (hit(leaves[i]) && hit(leaves[j])) res.overlap.push(`${leaves[i].t} × ${leaves[j].t}`);
    }
  }
  return res;
};
async function snap(p, name) {
  await p.waitForTimeout(900);
  if (!process.env.NOEMU) await p.evaluate(emu.apply);
  await p.waitForTimeout(150);
  const sq = await p.evaluate(emu.squeezed);
  const d = await p.evaluate(detect);
  const file = `${OUT}/${String(report.length).padStart(2, '0')}-${name}.png`;
  await p.screenshot({ path: file });
  const calls = await p.evaluate(() => { const l = window.__apiLog || []; window.__apiLog = []; return l; });
  api.push(...calls.map((c) => ({ ...c, at: name })));
  const text = await p.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 260));
  report.push({ name, file, text, squeezed: sq, overflow: d.overflow.slice(0, 6), overlap: d.overlap.slice(0, 6), errors: p.errs.splice(0) });
}
const visible = (p, text) => p.getByText(text, { exact: true }).filter({ visible: true });
const onTop = (el) => { const r = el.getBoundingClientRect(); if (!r.width) return false; const h = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 10)); return !!h && (el === h || el.contains(h) || h.contains(el)); };
async function clickTop(p, l, wait, preferLast) {
  const n = await l.count(); if (!n) return false;
  const order = [...Array(n).keys()]; if (preferLast) order.reverse();
  for (const i of order) {
    const el = l.nth(i);
    const top = await el.evaluate((e, f) => { const fn = new Function('return ' + f)(); for (let x = e; x; x = x.parentElement) if (fn(x)) return true; return false; }, onTop.toString()).catch(() => false);
    if (!top) continue;
    await el.click({ timeout: 2500, force: true }).catch(() => el.dispatchEvent('click'));
    await p.waitForTimeout(wait ?? 1200); return true;
  }
  return false;
}
async function tap(p, text, opt = {}) {
  const l = typeof text === 'string' ? visible(p, text) : text;
  if (!(await l.count())) throw new Error(`yok: ${text}`);
  if (!(await clickTop(p, l, opt.wait, opt.last))) throw new Error(`üstte değil: ${text}`);
}
async function closeTop(p, back) {
  for (const lab of back ? ['Kapat', 'Geri', 'Vazgeç'] : ['Kapat', 'Vazgeç']) {
    if (await clickTop(p, p.locator(`[aria-label="${lab}"]`).filter({ visible: true }), 900, true)) return;
  }
  for (const t of ['Vazgeç', 'Tamam']) if (await clickTop(p, visible(p, t), 800, true)) return;
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
}
async function ensureClosed(p) {
  for (let i = 0; i < 4; i++) {
    const open = await p.evaluate((f) => { const fn = new Function('return ' + f)(); return [...document.querySelectorAll('[aria-label="Kapat"],[aria-label="Vazgeç"]'), ...[...document.querySelectorAll('div')].filter((d) => !d.childElementCount && ['Tamam', 'Vazgeç'].includes(d.textContent.trim()))].some((e) => e.getBoundingClientRect().width && fn(e)); }, onTop.toString());
    if (!open) return; await closeTop(p);
  }
}
async function step(p, name, fn, marker) {
  try {
    await fn();
    if (marker) { await p.waitForTimeout(600); const ok = await p.evaluate((m) => document.body.innerText.includes(m), marker); if (!ok) throw new Error(`ekran açılmadı (beklenen: ${marker})`); }
    await snap(p, name);
  } catch (e) { const text = await p.evaluate(() => { const t = document.body.innerText.replace(/\n+/g, ' | '); const i = t.indexOf('Danışan Bilgileri'); return t.slice(i, i + 160) + ' ... ' + t.slice(-200); }).catch(() => ''); report.push({ name, text, fail: String(e.message || e).split('\n')[0] }); }
}
async function login(b, who) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: W < 700, hasTouch: true, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
  await ctx.addInitScript(() => { window.__apiLog = []; });
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', (e) => p.errs.push(String(e).slice(0, 160)));
  p.on('dialog', (d) => { p.errs.push(`uyarı: ${d.message().slice(0, 160)}`); d.dismiss().catch(() => {}); });
  await p.goto(URL); await p.waitForTimeout(2500);
  await p.evaluate(() => {
    localStorage.setItem('clinicapp.cookie-notice.v1', '1');
    const k = 'pofi-onizleme-v4'; const db = JSON.parse(localStorage.getItem(k)); db.sessions = {}; localStorage.setItem(k, JSON.stringify(db));
    for (const u of db.users) {
      for (const f of ['onboarding', 'start.hidden', 'sample.hidden']) localStorage.setItem(`clinic.${f}.v1.${u.id}`, '1');
      localStorage.setItem(`clinic.sample.seen.v1.${u.id}`, new Date().toISOString());
    }
  });
  await p.reload(); await p.waitForTimeout(2500);
  const inputs = p.locator('input'); await inputs.nth(0).fill(`${who}@clinicapp.app`); await inputs.nth(1).fill('12345678');
  await visible(p, 'Giriş yap').last().click(); await p.waitForTimeout(3500);
  return { ctx, p };
}
(async () => {
  const b = await chromium.launch();
  // 1) klinik sahibi, dolu hesap
  let { ctx, p } = await login(b, 'uzman');
  await step(p, 'home', async () => {});
  await step(p, 'bell', async () => { await tap(p, p.getByRole('button', { name: /Bildirim/ })); });
  await closeTop(p);
  await step(p, 'invite', async () => { await tap(p, 'Aileyi davet et', { last: true }); }, 'E-posta gönder');
  await closeTop(p);
  await step(p, 'account-sheet', async () => { await tap(p, p.getByRole('button', { name: /^Hesap: / })); });
  await closeTop(p);
  await step(p, 'help', async () => { await tap(p, 'Nasıl kullanılır?'); });
  await closeTop(p);
  await step(p, 'membership', async () => { await tap(p, 'Paketleri ve fiyatları gör'); });
  await closeTop(p);
  await step(p, 'calendar', async () => { await tap(p, 'Takvim'); });
  await step(p, 'calendar-week', async () => { await tap(p, 'Hafta'); }, 'Pzt');
  await step(p, 'calendar-day', async () => { await tap(p, 'Gün'); });
  await step(p, 'calendar-new', async () => { await tap(p, p.getByRole('button', { name: /Yeni seans|Seans ekle|Seans planla/ }).or(p.getByText(/^\+ ?Seans|^Yeni seans|^Seans planla/)).filter({ visible: true })); });
  await closeTop(p);
  await step(p, 'calendar-settings', async () => { await tap(p, p.locator('[aria-label*="ayar" i]').or(p.getByText(/^Takvim ayarları|^Ayarlar$/)).filter({ visible: true })); });
  await closeTop(p); await closeTop(p, true);
  await step(p, 'settings', async () => { await tap(p, p.getByRole('button', { name: 'Ayarlar', exact: true }), { wait: 1500 }); });
  await closeTop(p, true);
  // danışan
  await step(p, 'client-plan', async () => { await tap(p, p.getByText(/^Nazlı/).filter({ visible: true }), { wait: 2500 }); await tap(p, 'Takip Planı', { wait: 2000 }); });
  await step(p, 'plan-goal-tab', async () => { await tap(p, 'Davranış hedefi'); });
  await step(p, 'plan-program-tab', async () => { await tap(p, p.getByText(/^Program \d/).filter({ visible: true })); });
  await step(p, 'plan-goal-menu', async () => { await tap(p, p.locator('[aria-label="Diğer işlemler"]').filter({ visible: true })); });
  await closeTop(p);
  await step(p, 'plan-add-goal', async () => { await tap(p, '+ Davranış hedefi'); });
  await closeTop(p);
  await step(p, 'plan-publish', async () => { await tap(p, p.getByText(/^Aileye gönder/).filter({ visible: true })); });
  await closeTop(p);
  await ensureClosed(p); await step(p, 'plan-evaluate', async () => { await tap(p, 'Davranış hedefi'); await tap(p, p.getByText(/^Değerlendir/).filter({ visible: true })); });
  await closeTop(p);
  await step(p, 'plan-library', async () => { await tap(p, p.getByText(/^Kitaplık/).filter({ visible: true })); });
  await closeTop(p);
  const MARK = { sessions: 'Bekleme listesi', summary: 'Dönem', routines: 'Haftalık', abc: 'Kartlar', notes: 'Not', report: 'Raporu aç', details: 'Paylaşımı sonlandır' };
  for (const [tab, name] of [['Seanslar', 'sessions'], ['Özet', 'summary'], ['Ev Rutinleri', 'routines'], ['Davranış Kayıtları', 'abc'], ['Notlar', 'notes'], ['Rapor', 'report'], ['Danışan Bilgileri', 'details']]) {
    await ensureClosed(p);
    await step(p, name, async () => { await tap(p, tab, { wait: 2000 }); }, MARK[name]);
    if (name === 'routines') {
      await step(p, 'routines-trend', async () => { await tap(p, 'Zaman İçinde'); });
      await step(p, 'routines-stats', async () => { await tap(p, 'Oranlar'); });
      await step(p, 'routines-sent', async () => { await tap(p, p.getByText(/^Gönderilenler/).filter({ visible: true })); });
      await step(p, 'routines-suggest', async () => { await tap(p, 'Öner', { last: true }); });
      await step(p, 'suggestion-editor', async () => { await tap(p, 'Aileye macera öner', { wait: 1500 }); });
      await closeTop(p); await closeTop(p);
    }
    if (name === 'abc') await step(p, 'abc-table', async () => { await tap(p, 'Tablo'); });
  }
  fs.writeFileSync(`${OUT}/api.json`, JSON.stringify(api)); 
  await ctx.close();
  // 2) ekip üyesi, 3) bireysel boş hesap, 4) süresi biten
  for (const who of ['ekip', 'ada', 'bitti']) {
    ({ ctx, p } = await login(b, who));
    await step(p, `${who}-home`, async () => {});
    if (who !== 'bitti') {
      await step(p, `${who}-settings`, async () => { await tap(p, p.getByRole('button', { name: 'Ayarlar', exact: true }), { wait: 1500 }); });
      await closeTop(p, true);
      await step(p, `${who}-account`, async () => { await tap(p, p.getByRole('button', { name: /^Hesap: / })); });
      await closeTop(p);
    }
    fs.writeFileSync(`${OUT}/api-${who}.json`, JSON.stringify(api));
    await ctx.close();
  }
  fs.writeFileSync(`${OUT}/api.json`, JSON.stringify(api));
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
  await b.close();
  for (const r of report) {
    const flags = r.fail ? `BAŞARISIZ: ${r.fail}` : [r.squeezed.length && `ezik ${JSON.stringify(r.squeezed)}`, r.overflow.length && `taşma ${JSON.stringify(r.overflow)}`,
      r.overlap.length && `üst üste ${JSON.stringify(r.overlap)}`, r.errors.length && `hata ${JSON.stringify(r.errors)}`].filter(Boolean).join(' | ');
    console.log(`${r.name}: ${flags || 'temiz'}`);
  }
})();
