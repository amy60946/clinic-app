// iOS (Yoga) yerleşimini web önizlemede yaklaşık taklit eder:
// 1) çok satırlı flex kapsayıcıda satırlar gerilmez (Yoga alignContent varsayılanı flex-start)
// 2) flex:1 (temel 0) öğe, satır yönündeki kapsayıcının içerik genişliğine katkı vermez (Yoga'da temel 0 sayılır)
// 3) sıkışmış metinleri bulur: kısa genişlikte birden çok satıra bölünmüş metin
module.exports.apply = () => {
  if (!document.getElementById('yoga-emu')) {
    const st = document.createElement('style'); st.id = 'yoga-emu';
    st.textContent = 'div { align-content: flex-start !important; }';
    document.head.appendChild(st);
  }
  // 3) Yoga'da metin (Text) varsayılan olarak daralmaz (flexShrink 0); web'de tarayıcı daraltır. Biçimde flex-shrink yoksa 0 yap.
  if (!window.__shrinkCls) {
    const set = new Set();
    for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch { continue; } for (const r of rules) { if (r.selectorText && /flex-shrink|flex:/.test(r.cssText)) for (const m of r.selectorText.matchAll(/\.([\w-]+)/g)) set.add(m[1]); } }
    window.__shrinkCls = set;
  }
  for (const el of document.querySelectorAll('div[dir="auto"], span[dir="auto"]')) {
    const par = el.parentElement; if (!par) continue;
    const pcs = getComputedStyle(par); if (!pcs.display.includes('flex') || !pcs.flexDirection.startsWith('row')) continue;
    if (el.style.flexShrink) continue;
    if (![...el.classList].some((c) => window.__shrinkCls.has(c))) el.style.flexShrink = '0';
  }
  for (const el of document.querySelectorAll('div')) {
    const cs = getComputedStyle(el);
    const par = el.parentElement; if (!par) continue;
    const pcs = getComputedStyle(par);
    if (!pcs.display.includes('flex')) continue;
    const grow = parseFloat(cs.flexGrow) > 0;
    const basis0 = cs.flexBasis === '0%' || cs.flexBasis === '0px';
    if (grow && basis0 && pcs.flexDirection.startsWith('row')) el.style.contain = 'inline-size';
  }
};
module.exports.squeezed = () => {
  const out = [];
  for (const el of document.querySelectorAll('div')) {
    if (el.childElementCount) continue;
    const t = (el.textContent || '').trim(); if (t.length < 4) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el); const fs = parseFloat(cs.fontSize) || 14;
    const rg = document.createRange(); rg.selectNodeContents(el);
    const lines = new Set([...rg.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top))).size;
    const longestWord = Math.max(...t.split(/\s+/).map((w) => w.length));
    // satır başına ortalama karakter, en uzun sözcükten azsa sözcük bölünmüş demektir
    if (lines >= 2 && (r.width < fs * 3 || t.length / lines < Math.min(longestWord, 8))) out.push({ t: t.slice(0, 40), w: Math.round(r.width), lines });
    if (el.scrollWidth > el.clientWidth + 2 && cs.overflow === 'hidden' && cs.textOverflow !== 'ellipsis' && r.width < 40) out.push({ t: t.slice(0, 40), w: Math.round(r.width), clipped: true });
  }
  // kartın (overflow: hidden) kenarında kesilen metin
  for (const el of document.querySelectorAll('div[dir="auto"]')) {
    if (el.childElementCount && el.querySelector('div')) continue;
    const t = (el.textContent || '').trim(); if (t.length < 3) continue;
    const r = el.getBoundingClientRect(); if (!r.width) continue;
    for (let c = el.parentElement; c; c = c.parentElement) {
      const cs = getComputedStyle(c);
      if (cs.overflowX === 'hidden' || cs.overflow === 'hidden') { const cr = c.getBoundingClientRect(); if (cr.width && r.right > cr.right + 2 && r.left < cr.right) out.push({ t: t.slice(0, 40), cut: Math.round(r.right - cr.right) }); break; }
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') break;
    }
  }
  return out;
};
