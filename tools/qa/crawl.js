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
  for (const lab of back ? ['Kapat', 'Önizlemeyi kapat', 'Geri', 'Vazgeç'] : ['Kapat', 'Önizlemeyi kapat', 'Vazgeç']) {
    if (await clickTop(p, p.locator(`[aria-label="${lab}"]`).filter({ visible: true }), 900, true)) return;
  }
  for (const t of ['Vazgeç', 'Tamam']) if (await clickTop(p, visible(p, t), 800, true)) return;
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
}
async function ensureClosed(p) {
  for (let i = 0; i < 4; i++) {
    const open = await p.evaluate((f) => { const fn = new Function('return ' + f)(); return [...document.querySelectorAll('[aria-label="Kapat"],[aria-label="Vazgeç"],[aria-label="Önizlemeyi kapat"]'), ...[...document.querySelectorAll('div')].filter((d) => !d.childElementCount && ['Tamam', 'Vazgeç'].includes(d.textContent.trim()))].some((e) => e.getBoundingClientRect().width && fn(e)); }, onTop.toString());
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
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: +process.env.DSF || 1, isMobile: W < 700, hasTouch: true, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
  await ctx.addInitScript((plan) => { window.__apiLog = []; window.__plan = plan; }, !!process.env.PLAN);
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', (e) => p.errs.push(String(e).slice(0, 160)));
  p.on('dialog', (d) => { p.errs.push(`uyarı: ${d.message().slice(0, 160)}`); d.dismiss().catch(() => {}); });
  await p.goto(URL); await p.waitForTimeout(2500);
  await p.evaluate(() => {
    localStorage.setItem('clinicapp.cookie-notice.v1', '1');
    if (window.__plan) localStorage.setItem('demo.client_config', JSON.stringify({ app: {}, flags: { plan_change_suggestions: true, care_plan: true } }));
    else localStorage.removeItem('demo.client_config');
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
  const ONLY = process.env.ONLY === 'training';   // ONLY=training: yalnız kütüphane, ebeveyn eğitimi, davranışlar ve olaylar
  const PLAN = !!process.env.PLAN;                // PLAN=1: Takip Planı bayrağı açık (varsayılan kapalı: lansman odağı "A")
  await step(p, 'home', async () => {});
  if (!ONLY) {
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
  }
  // Kaynak kütüphanesi (ebeveyn eğitimi, 9 Kasım 2026)
  await step(p, 'library', async () => { await tap(p, 'Kaynak kütüphanesi', { wait: 1800 }); }, 'Ebeveyn eğitimi kaynak kütüphanesi');
  await step(p, 'library-item', async () => { await tap(p, p.getByRole('button', { name: 'Uzmanınla eğitime başlarken', exact: true }).filter({ visible: true })); }, 'Ebeveyn eğitimi olarak ata');
  await step(p, 'library-assign', async () => { await tap(p, 'Ebeveyn eğitimi olarak ata', { last: true }); }, 'Danışan seç');
  await closeTop(p); await ensureClosed(p);
  await step(p, 'library-back', async () => { await tap(p, 'Ana ekran'); });
  // danışan
  await step(p, 'client-open', async () => { await tap(p, p.getByText(/^Nazlı/).filter({ visible: true }), { wait: 2500 }); }, PLAN ? 'Dönem' : 'Ebeveyn eğitimleri');
  await step(p, 'plan-menu-state', async () => { const n = await visible(p, 'Takip Planı').count(); if (PLAN ? !n : n) throw new Error(PLAN ? 'Takip Planı menüde yok' : 'Takip Planı menüde duruyor'); });
  await step(p, 'menu-closed', async () => { await tap(p, p.locator('[aria-label="Menüyü kapat"]').filter({ visible: true })); if (await visible(p, 'Danışan Bilgileri').count()) throw new Error('menü kapanmadı'); });
  await step(p, 'menu-open', async () => { await tap(p, p.locator('[aria-label="Menüyü aç"]').filter({ visible: true }).first()); }, 'Danışan Bilgileri');
  if (!ONLY && PLAN) {
  await step(p, 'client-plan', async () => { await tap(p, 'Takip Planı', { wait: 2000 }); });
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
  }
  // Ebeveyn eğitimi (danışan › Planla)
  await ensureClosed(p);
  const T = 'Ebeveyn zorlayıcı davranışları ABC ile kaydeder ve tetikleyicileri tanır';
  const subTab = (n) => p.getByRole('tab', { name: n }).filter({ visible: true });
  await step(p, 'training', async () => { await tap(p, 'Ebeveyn Eğitimi', { wait: 2000 }); }, 'Ebeveyn eğitimleri');
  await step(p, 'training-create', async () => { await tap(p, '+ Eğitim ekle'); }, 'Bu eğitim kimin için?');
  await closeTop(p); await ensureClosed(p);
  await step(p, 'training-detail', async () => { await tap(p, p.getByRole('button', { name: T, exact: true }).filter({ visible: true }), { wait: 1500 }); }, 'Tüm eğitimler');
  await step(p, 'training-status', async () => { await tap(p, 'Etkin', { last: true }); }, 'Ustalaştı');
  await closeTop(p); await ensureClosed(p);
  await step(p, 'training-modules', async () => { await tap(p, subTab('Öğrenme modülleri'), { last: true }); }, 'etkin modül');
  await step(p, 'training-module-review', async () => { await tap(p, p.getByRole('button', { name: / incele$/ }).filter({ visible: true })); }, 'Etkileşimli modülü incele');
  await closeTop(p); await ensureClosed(p);
  await step(p, 'training-module-pick', async () => { await tap(p, '+ Daha fazla ekle'); }, 'Modülleri ekle');
  await closeTop(p); await ensureClosed(p);
  await step(p, 'training-tasks', async () => { await tap(p, subTab('Uygulama görevleri'), { last: true }); });
  await step(p, 'training-task-add', async () => { await tap(p, '+ Uygulama görevi', { last: true }); }, 'Nasıl ölçülecek?');
  await closeTop(p); await ensureClosed(p);
  await step(p, 'training-task-example', async () => {
    if (!(await visible(p, 'Uygulama görevi nedir?').count())) await tap(p, p.getByText(/^Uygulama görevi nedir\? Örnekleri gör/).filter({ visible: true }));
    await tap(p, p.getByRole('button', { name: 'Örnek: Günde 5 kez adıyla öv' }).filter({ visible: true }));
    const v = await p.locator('input').filter({ visible: true }).last().inputValue().catch(() => '');
    if (!/adıyla öv/.test(v)) throw new Error(`örnek formu doldurmadı: "${v}"`);
  }, 'Nasıl ölçülecek?');
  await closeTop(p); await ensureClosed(p);
  await step(p, 'training-todos', async () => { await tap(p, subTab('Hızlı yapılacaklar'), { last: true }); }, 'Hızlı yapılacak nedir?');
  await step(p, 'training-todo-example', async () => { await tap(p, p.getByRole('button', { name: 'Örnek: Görünür bir zamanlayıcı hazırla' }).filter({ visible: true })); }, 'Yapılacağı ekle');
  await closeTop(p); await ensureClosed(p);
  await step(p, 'training-summary', async () => { await tap(p, subTab('Özet'), { last: true }); }, 'Ustalık ölçütüne doğru');
  await step(p, 'training-note', async () => { await tap(p, 'Not oluştur'); }, 'Başlangıç tarihi');
  await closeTop(p); await ensureClosed(p);
  await step(p, 'training-gear', async () => { await tap(p, p.locator('[aria-label="Eğitim ayarları"]').filter({ visible: true })); }, 'Ayrıntıları düzenle');
  await step(p, 'training-preview', async () => { await tap(p, 'Ebeveyn deneyimini önizle', { last: true }); }, 'Derslere devam et');
  await step(p, 'training-preview-page', async () => { await tap(p, p.getByRole('button', { name: T, exact: true }).filter({ visible: true }), { last: true }); }, 'Tüm dersler');
  await step(p, 'training-preview-player', async () => { await tap(p, 'Başla', { last: true }); });
  await closeTop(p); await ensureClosed(p);
  await step(p, 'training-back', async () => { await tap(p, 'Tüm eğitimler'); }, 'Ebeveyn eğitimleri');
  // Davranışlar ve Olaylar (danışan › İzle)
  const B = 'Ekranı kapatırken ağlama';
  await step(p, 'behaviors', async () => { await tap(p, 'Davranışlar ve Olaylar', { wait: 2000 }); }, 'Diğer bildirilen olaylar');
  await step(p, 'no-abc-menu', async () => { if (await visible(p, 'Davranış Kayıtları').count()) throw new Error('Davranış Kayıtları menüde duruyor'); });
  await step(p, 'behavior-abc', async () => { await tap(p, p.getByRole('button', { name: B, exact: true }).filter({ visible: true })); }, 'Öncül');
  await step(p, 'behavior-freq', async () => { await tap(p, p.getByRole('button', { name: 'Kardeşine vurma', exact: true }).filter({ visible: true })); });
  await step(p, 'behavior-duration', async () => { await tap(p, p.getByRole('button', { name: 'Yatma saati direnci', exact: true }).filter({ visible: true })); });
  await step(p, 'behavior-other', async () => { await tap(p, 'Diğer bildirilen olaylar'); });
  await step(p, 'behavior-gear', async () => { await tap(p, p.locator('[aria-label="Hedef davranış ayarları"]').filter({ visible: true })); }, 'Arşivle');
  await step(p, 'behavior-edit', async () => { await tap(p, 'Düzenle', { last: true }); }, 'Hedef davranışı düzenle');
  await closeTop(p); await ensureClosed(p);
  await step(p, 'behavior-new', async () => { await tap(p, '+ Hedef davranış ekle'); }, 'Kayıt türünü seç');
  await closeTop(p); await ensureClosed(p);
  await step(p, 'behavior-preview', async () => { await tap(p, 'Ebeveyn deneyimini önizle'); }, 'Çocuğunun davranış olayını bildir');
  await step(p, 'behavior-preview-pick', async () => { await tap(p, 'Çocuğunun davranış olayını bildir'); }, 'Hangi davranış oldu?');
  await step(p, 'behavior-preview-details', async () => { await tap(p, B, { last: true }); await tap(p, 'İleri', { last: true }); }, 'Bu olaydan önce ne oldu?');
  await step(p, 'behavior-preview-strategy', async () => {
    for (const ph of ['ör. Televizyonu kapatması istendi', 'ör. Bağırdı, bir ayrıcalık kaldırıldı']) await p.getByPlaceholder(ph).filter({ visible: true }).last().fill('Deneme');
    await tap(p, 'İleri', { last: true });
  }, 'Hangi stratejiyi denedin?');
  await step(p, 'behavior-preview-thanks', async () => { await tap(p, 'Hiçbiri', { last: true }); await tap(p, p.getByRole('radio', { name: /^4:/ }).filter({ visible: true })); await tap(p, 'Gönder', { last: true }); }, 'teşekkürler');
  await closeTop(p); await ensureClosed(p);
  if (!ONLY) {
  const MARK = { sessions: 'Bekleme listesi', summary: 'Dönem', routines: 'Haftalık', notes: 'Not', report: 'Raporu aç', details: 'Paylaşımı sonlandır' };
  for (const [tab, name] of [['Seanslar', 'sessions'], ['Özet', 'summary'], ['Ev Rutinleri', 'routines'], ['Notlar', 'notes'], ['Rapor', 'report'], ['Danışan Bilgileri', 'details']]) {
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
  }
  }
  // Örnek aile + eğitim turu (lansman odağı "A"; Takip Planı kapalıyken): Ayarlar › Örnek aileyi aç
  if (!PLAN) {
  await ensureClosed(p);
  await step(p, 'home-again', async () => { if (!(await clickTop(p, p.locator('[aria-label="Danışanlar"]').filter({ visible: true }), 1500))) await tap(p, 'Tüm Danışanlar', { wait: 1500 }); }, 'Kaynak kütüphanesi');
  await step(p, 'tour-intro', async () => { await tap(p, p.getByRole('button', { name: 'Ayarlar', exact: true }), { wait: 1500 }); await tap(p, 'Örnek aileyi aç', { wait: 2000 }); }, 'Deniz’le dene');
  await step(p, 'tour-open', async () => { await tap(p, 'Başla', { last: true }); }, 'Eğitimi aç');
  await step(p, 'tour-modules', async () => { await tap(p, p.getByRole('button', { name: /^Ebeveyn zor geçişlerden/ }).filter({ visible: true })); }, 'Ebeveynin okuduğu ve yanıtladığı içerik');
  await step(p, 'tour-tasks', async () => { await tap(p, subTab('Öğrenme modülleri'), { last: true }); }, 'Evde tekrarlanan beceri');
  await step(p, 'tour-tasks-look', async () => { await tap(p, subTab('Uygulama görevleri'), { last: true }); }, 'Ebeveyn her uyguladığında kayıt girer.');
  await step(p, 'tour-todos', async () => { await tap(p, 'İleri', { last: true }); }, 'Bir kez yapılıp işaretlenen iş');
  await step(p, 'tour-todos-look', async () => { await tap(p, subTab('Hızlı yapılacaklar'), { last: true }); }, 'bir örneğe dokun');
  await step(p, 'tour-done', async () => { await tap(p, 'İleri', { last: true }); }, 'Hazırsın');
  await step(p, 'tour-closed', async () => { await tap(p, 'Kapat', { last: true }); }, 'hızlı yapılacak');
  }
  fs.writeFileSync(`${OUT}/api.json`, JSON.stringify(api)); 
  await ctx.close();
  // 2) ekip üyesi, 3) bireysel boş hesap, 4) süresi biten
  for (const who of ONLY ? [] : ['ekip', 'ada', 'bitti']) {
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
