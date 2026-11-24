// Ortak (telefon): kit.open('iphone') 390×844 ×3 + Nazlı → Deniz (yalnız enjekte edilen deneme veritabanında) + imleç / dokunma halkası gizli
process.env.SHOT_URL = process.env.SHOT_URL || 'file://' + __dirname + '/out/clinic.html';
const kit = require('../../landing-motion/kit');


const KEY = 'pofi-onizleme-v4';
const HIDE = '#__lm-cursor,.__lm-ring{display:none!important}';
async function start(opt = { more: true }) {
  const s = await kit.open('dikey', opt);
  const p = s.page;
  await p.evaluate((KEY) => {
    const db = JSON.parse(localStorage.getItem(KEY));
    const c = db.children.find((x) => x.id === 'c-nazli');
    c.name = 'Deniz';
    // v3: Deniz'in klinik etiketi boş (telefonda danışan başlığı tek satır kalsın; bütün karelerde aynı)
    db.clinic_links.filter((l) => l.child_id === 'c-nazli').forEach((l) => { l.label = null; });
    (db.clinic_link_labels || []).filter((l) => db.clinic_links.some((x) => x.id === l.link_id && x.child_id === 'c-nazli')).forEach((l) => { l.label = null; });
    // v3: bütün uzman bildirimleri okunmuş (zil rozeti her karede aynı: yok)
    (db.notifications || []).forEach((n) => { if (n.app === 'clinic' && !n.read_at) n.read_at = n.created_at; });
    localStorage.setItem(KEY, JSON.stringify(db));
  }, KEY);
  await p.reload();
  await p.waitForTimeout(2500);
  await p.addStyleTag({ content: HIDE });
  p.on('load', () => p.addStyleTag({ content: HIDE }).catch(() => {}));
  return s;
}
const vis = (p, t) => p.getByText(t, { exact: true }).filter({ visible: true });
async function shot(p, file) {
  await p.mouse.move(-10, -10).catch(() => {});
  await p.waitForTimeout(600);
  await p.screenshot({ path: file });
  const txt = await p.evaluate(() => document.body.innerText);
  if (/Nazl/.test(txt)) console.log('UYARI Nazlı metinde:', file);
  return txt;
}
// Metni taşıyan kaydırılabilir alanı, metin ekranda y'ye gelecek kadar kaydır (tam eşleşme, görünür ilk / son öğe)
async function alignExact(p, text, y, o = {}) {
  await p.evaluate(([t, top, last]) => {
    let els = [...document.querySelectorAll('div,span')].filter((e) => e.textContent.trim() === t && e.getBoundingClientRect().width > 0 && ![...e.children].some((c) => c.textContent.trim() === t));
    if (!els.length) throw new Error('metin yok: ' + t);
    const el = last ? els[els.length - 1] : els[0];
    let c = el.parentElement;
    for (; c; c = c.parentElement) { const st = getComputedStyle(c); if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && c.scrollHeight > c.clientHeight) break; }
    (c || document.scrollingElement).scrollTop += el.getBoundingClientRect().top - top;
  }, [text, y, !!o.last]);
  await p.waitForTimeout(700);
}
// Görünen üst / alt kenarda (ya da verilen y'de) kesilen metin satırları (metin düğümlerinin satır kutuları; karışık içerik dahil)
async function cutAt(p, y) {
  return p.evaluate((Y) => {
    const H = Y || innerHeight, out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (!n.nodeValue.trim()) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      for (const b of r.getClientRects()) {
        if (!b.width) continue;
        if ((b.top < H - 0.5 && b.bottom > H + 1) || (b.top < -0.5 && b.bottom > 1)) out.push(`${n.nodeValue.trim().slice(0, 40)} [${Math.round(b.top)}-${Math.round(b.bottom)}]`);
      }
    }
    return out.slice(0, 8);
  }, y || 0);
}
module.exports = { kit, start, vis, shot, alignExact, cutAt };

// Kaydırma payı bul: metni taşıyan kaydırma alanında, d kadar kaydırınca (d ∈ [lo, hi]) alanın üst / alt kenarını kesen metin yaprağı
// ya da kart (kenarlıklı / zeminli kutu, o.cards) kalmayan değerler; yüzen alt menü (o.bar = [üst, alt]) kenarlarından geçen metin de olmaz.
// Dönüş: geçerli d listesi (o.pref'e en yakın önce). apply: true ise ilkini uygular.
async function fit(p, text, o = {}) {
  const r = await p.evaluate(([t, o]) => {
    const els = [...document.querySelectorAll('div,span')].filter((e) => e.textContent.trim() === t && e.getBoundingClientRect().width > 0 && ![...e.children].some((c) => c.textContent.trim() === t));
    if (!els.length) return { err: 'metin yok: ' + t };
    let c = els[o.last ? els.length - 1 : 0].parentElement;
    for (; c; c = c.parentElement) { const st = getComputedStyle(c); if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && c.scrollHeight > c.clientHeight) break; }
    if (!c) return { err: 'kaydırma alanı yok' };
    const cr = c.getBoundingClientRect();
    const top = Math.max(0, cr.top), bot = Math.min(innerHeight, cr.bottom);
    const maxD = c.scrollHeight - c.clientHeight - c.scrollTop, minD = -c.scrollTop;
    const boxes = [];
    const tw = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    for (let n; (n = tw.nextNode());) {
      if (!n.nodeValue.trim()) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const b of rg.getClientRects()) if (b.width) boxes.push([b.top, b.bottom, true]);
    }
    for (const e of c.querySelectorAll('div,span,input,textarea,svg,img')) {
      const b = e.getBoundingClientRect(); if (!b.width || !b.height) continue;
      const leaf = (e.tagName === 'DIV' || e.tagName === 'SPAN') ? false : true;
      let card = false;
      if (o.cards && e.tagName === 'DIV' && b.width > 60 && b.height > 20 && b.height < (bot - top) - 20) {
        const st = getComputedStyle(e);
        card = parseFloat(st.borderTopWidth) > 0 || (st.backgroundColor !== 'rgba(0, 0, 0, 0)' && st.backgroundColor !== getComputedStyle(c).backgroundColor);
      }
      if (leaf || card) boxes.push([b.top, b.bottom, !!leaf]);
    }
    const ok = [];
    const lo = Math.max(minD, o.lo), hi = Math.min(maxD, o.hi);
    for (let d = Math.ceil(lo); d <= hi; d++) {
      let good = true;
      for (const [a, z, leaf] of boxes) {
        const A = a - d, Z = z - d;
        if ((A < top - 0.5 && Z > top + 0.5) || (A < bot - 0.5 && Z > bot + 0.5)) { good = false; break; }
        if (o.bar && leaf && ((A < o.bar[0] && Z > o.bar[0]) || (A < o.bar[1] && Z > o.bar[1]))) { good = false; break; }
        if (o.barClear && leaf && A < o.barClear[1] && Z > o.barClear[0]) { good = false; break; }   // yüzen menünün altında hiç metin / simge yok
      }
      if (good) ok.push(d);
    }
    return { ok, st: c.scrollTop, maxD, n: boxes.length };
  }, [text, { lo: -1e5, hi: 1e5, ...o }]);
  if (r.err) throw new Error(r.err);
  const pref = o.pref || 0;
  r.ok.sort((a, b) => Math.abs(a - pref) - Math.abs(b - pref));
  return r;
}
// Kaydırma alanını d kadar kaydır (metnin alanı)
async function scrollBy(p, text, d, o = {}) {
  await p.evaluate(([t, d, last]) => {
    const els = [...document.querySelectorAll('div,span')].filter((e) => e.textContent.trim() === t && e.getBoundingClientRect().width > 0 && ![...e.children].some((c) => c.textContent.trim() === t));
    let c = els[last ? els.length - 1 : 0].parentElement;
    for (; c; c = c.parentElement) { const st = getComputedStyle(c); if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && c.scrollHeight > c.clientHeight) break; }
    c.scrollTop += d;
  }, [text, d, !!o.last]);
  await p.waitForTimeout(1300);   // yüzen menü kaydırmada küçülür, ~700 ms sonra yeniden büyür
}
// fit + scrollBy: tercih edilen paya en yakın geçerli kaydırma
async function fitScroll(p, text, o = {}) {
  const r = await fit(p, text, o);
  if (!r.ok.length) { console.log('  fit: geçerli kaydırma yok', text, JSON.stringify(o)); return null; }
  const d = r.ok[0];
  console.log(`  fit ${text}: d=${d} (tercih ${o.pref || 0}; geçerli ${r.ok.length}: ${r.ok.slice(0, 6).join(',')}…)`);
  await scrollBy(p, text, d, o);
  return d;
}
module.exports.fit = fit;
module.exports.scrollBy = scrollBy;
module.exports.fitScroll = fitScroll;
