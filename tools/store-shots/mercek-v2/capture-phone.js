// Moyo Mercek mağaza seti v2 (eğitimsiz), telefon düzeni 390×844 ×3. Kullanım: node capture-phone.js <çıktı klasörü> [01 02 ...]
const { start, vis, shot, cutAt, fitScroll, scrollBy } = require('./base-phone');
const fs = require('fs');
const BAR = [760, 824];   // yüzen alt menü
const card = (p, name) => p.getByRole('button', { name, exact: true }).filter({ visible: true });
const tab = (p, name) => p.getByRole('tab', { name }).filter({ visible: true }).last();
const wait = (p, ms) => p.waitForTimeout(ms);
const openDeniz = async (p) => { await vis(p, 'Deniz').first().click(); await wait(p, 1800); };
const E = (k, d) => (process.env[k] !== undefined ? Number(process.env[k]) : d);
const fitIn = (p, anchor, pref, span, o = {}) => fitScroll(p, anchor, { cards: true, pref, lo: pref - span, hi: pref + span, ...o });

const B03 = () => process.env.B03 || 'Ekranı kapatırken ağlama';
// Tablonun yatay kaydırması: kenarda kesilen metin kalmasın (hfit.js)
const hscroll = (p, x) => p.evaluate((x) => { const c = [...document.querySelectorAll('div')].find((c) => { const st = getComputedStyle(c); return (st.overflowX === 'auto' || st.overflowX === 'scroll') && c.scrollWidth > c.clientWidth + 2; }); if (c) c.scrollLeft = x; }, x);
const DEF03b = '';
let DEF06n = 5, DEF06s = 0, DEF06d = 90;
// Yüzen alt menü: role=tablist'in konumlu (absolute) kapsayıcısı gizlenir
const hideTabBar = (p) => process.env.KEEPBAR ? Promise.resolve() : p.evaluate(() => { const tl = [...document.querySelectorAll('[role=tablist]')].find((e) => ['Danışanlar', 'Takvim', 'Ayarlar'].every((t) => e.textContent.includes(t)));
  if (!tl) throw new Error('alt menü yok'); let top = tl; while (top.parentElement && getComputedStyle(top).position !== 'absolute' && getComputedStyle(top).position !== 'fixed') top = top.parentElement; top.style.display = 'none'; });
const SCREENS = {
  // v4: yüzen menü görünür (koordinatör: mağaza görseli uygulamayı olduğu gibi göstermeli). Sayfa sonu panoyu göstermiyor; menünün
  // kenarlarından hiçbir satır (alt çizgi dahil) taşmayan tek konum (barstrict4.js): Kerem kartı tümüyle menünün arkasında
  '01': async (p, o = {}) => { if (!o.explore) await fitIn(p, 'Danışanlar (6)', E('D01', 477), E('R01', 0), { bar: BAR }); },
  '02': async (p, o = {}) => { await openDeniz(p); await vis(p, 'Ev Rutinleri').first().click(); await wait(p, 1800);
    if (!o.explore) await fitIn(p, 'Haftalık', E('D02', 256), 3); },
  '03': async (p, o = {}) => {
    await openDeniz(p); await vis(p, 'Davranışlar ve Olaylar').first().click(); await wait(p, 1200);
    await card(p, B03()).first().click(); await wait(p, 1500);
    if (process.env.B03b || DEF03b) { await card(p, process.env.B03b || DEF03b).first().click(); await wait(p, 1500); }
    await hscroll(p, E('H03', 4)); await wait(p, 400);
    if (!o.explore) await fitIn(p, B03(), E('D03', 90), 2);
  },
  '04': async (p, o = {}) => {
    await openDeniz(p); await vis(p, 'Davranışlar ve Olaylar').first().click(); await wait(p, 1200);
    await p.getByText('+ Hedef davranış ekle').filter({ visible: true }).first().click(); await wait(p, 1500);
    await p.getByLabel('Hedef davranış', { exact: true }).fill('Ödev başında masadan kalkma');
    await p.getByLabel('Açıklama', { exact: true }).fill('Ödev sırasında izin almadan masadan kalkıp başka bir işe geçiyor. Her seferinde hemen öncesinde ne olduğunu ve sonrasında ne yaptığınızı yazın.');
    await p.getByLabel('Strateji 1', { exact: true }).fill('Ödevi 10 dakikalık parçalara bölün');
    if (E('S04', 1) === 2) await p.getByLabel('Strateji 2', { exact: true }).fill('Molayı zamanlayıcıyla önceden gösterin');
    else { await p.getByLabel("Strateji 2'i kaldır", { exact: true }).click(); await wait(p, 400); }
    await p.getByRole('radio').filter({ hasText: 'ABC' }).first().click();
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    await wait(p, 700);
    await scrollBy(p, 'Hedef davranış', -1e5);   // seçim pencereyi aşağı kaydırıyor: başa dön
    if (!o.explore) await fitIn(p, 'Hedef davranış', E('D04', 208), E('R04', 8));
  },
  '05': async (p, o = {}) => { await vis(p, 'Takvim').last().click(); await wait(p, 2000); await vis(p, 'Hafta').first().click(); await wait(p, 1500);
    await p.getByText(/^Deniz/).filter({ visible: true }).first().click(); await wait(p, 1800);
    if (!o.explore) await fitIn(p, 'Hazırlık', E('D05', 38), 3); },
  // Rapor sekmesi: N06 tane önceki gönderilmiş rapor (her çarşamba seansından sonra, ailede açılmış; uydurma veri), rapor açılır;
  // SEND06=1 ise "Aileye gönder" → Gönder ("Rapor gönderildi"), değilse Kapat (gönderime hazır)
  '06': async (p, o = {}) => {
    const n = E('N06', DEF06n);
    if (n) { await p.evaluate((n) => { const KEY = 'pofi-onizleme-v4'; const db = JSON.parse(localStorage.getItem(KEY)); const l = db.clinic_links.find((x) => x.child_id === 'c-nazli');
      const m = db.clinicians.find((x) => x.id === 'demo-clinician'); db.clinic_shared_reports ??= [];
      const day = (k, h) => { const d = new Date(); d.setDate(d.getDate() + k); d.setHours(h, 0, 0, 0); return d; };
      const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      for (let i = 0; i < n; i++) { const sent = day(-5 - 7 * i, 17); const end = day(-8 - 7 * i, 12); const start = day(-8 - 7 * i - 27, 12);
        db.clinic_shared_reports.push({ id: `lm-rep-${i}`, link_id: l.id, clinic_id: l.clinic_id, family_id: l.family_id, child_id: l.child_id, sent_by: m.id,
          clinician_name: [m.name, m.title].filter(Boolean).join(', '), title: 'Ev rutini gözlem raporu', period_start: ymd(start), period_end: ymd(end),
          content: { v: 1, sections: [{ kind: 'text', title: 'Özet', text: '' }] }, created_at: sent.toISOString(), seen_at: new Date(sent.getTime() + 3 * 3600e3).toISOString() }); }
      localStorage.setItem(KEY, JSON.stringify(db)); }, n); await p.reload(); await wait(p, 2500); }
    await openDeniz(p); await vis(p, 'Rapor').first().click(); await wait(p, 1300);
    await vis(p, 'Raporu aç').first().click(); await wait(p, 2200);
    if (E('SEND06', DEF06s)) {
      await p.locator('button:not([disabled])', { hasText: 'Aileye gönder' }).last().click(); await wait(p, 1000);
      await p.getByText('Gönder', { exact: true }).filter({ visible: true }).last().click(); await wait(p, 1800);
    } else { await p.locator('button', { hasText: 'Kapat' }).last().click(); await wait(p, 1200); }
    if (!o.explore) await fitIn(p, 'Raporu aileye gönder', E('D06', DEF06d), E('R06', 2), { cards: false });   // gönderilen raporlar kartı alt kenarda iki satır arasında biter
  },
  '07': async (p) => {
    await p.getByRole('button', { name: 'Aileyi davet et' }).filter({ visible: true }).last().click(); await wait(p, 1500);
    await p.getByPlaceholder('ornek@eposta.com').fill('ayse.ornek@eposta.com');
    await p.getByPlaceholder('Ör. Efe').fill('Deniz');
    await vis(p, '6–8').last().click();
    await p.getByPlaceholder('Ör. dosya no, görüşme günü').fill('Perşembe 16:00 görüşmesi');
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    await wait(p, 600);
  },
  '08': async (p, o = {}) => {
    await p.evaluate(() => localStorage.setItem('demo.nudge_permission', 'granted')); await p.reload(); await wait(p, 2500);
    await vis(p, 'Ayarlar').last().click(); await wait(p, 1800);
    // v4: menü görünür; Kişisel kodun + Klinik + Ekip, menü Üyelik kartının başının üstünde (başlık menünün üstünde, taşan satır yok)
    if (!o.explore) await fitIn(p, 'Klinik', E('D08', 397), E('R08', 0), { bar: BAR });
  },
};
module.exports = { SCREENS };
