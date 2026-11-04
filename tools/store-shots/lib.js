const { chromium } = require('playwright');
const editDb = require('./editdb');
// iOS-wording build per device (native-build.sh); SHOT_URL=... overrides (e.g. the plain preview/out build)
const urlFor = (device) => process.env.SHOT_URL || `file://${__dirname}/native/${device}/clinic.html`;
const ID = 'demo-clinician';
const SECTIONS = ['goals', 'summary', 'routine', 'abc', 'notes', 'report', 'details', 'suggestions', 'board'];

const DEVICES = {
  ipad: { viewport: { width: 1376, height: 1032 }, deviceScaleFactor: 2, isMobile: false, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
  iphone: { viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
};

async function open(device, scale) {
  const b = await chromium.launch();
  const opts = { ...DEVICES[device], locale: 'tr-TR', timezoneId: 'Europe/Istanbul' };
  if (scale) opts.deviceScaleFactor = scale;
  const ctx = await b.newContext(opts);
  // SHOT_TIME (ISO) freezes "now" so the demo data and charts look the same whatever the capture day (e.g. a Monday morning:
  // the last chart week is complete)
  if (process.env.SHOT_TIME) await ctx.clock.setFixedTime(new Date(process.env.SHOT_TIME));
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') p.errors.push(m.text()); });
  await p.goto(urlFor(device));
  await p.waitForTimeout(2500);
  const r = await p.evaluate(editDb);
  await p.evaluate(({ ID, SECTIONS }) => {
    localStorage.setItem(`clinic.onboarding.v1.${ID}`, '1');
    localStorage.setItem(`clinic.start.hidden.v1.${ID}`, '1');
    localStorage.setItem(`clinic.sample.hidden.v1.${ID}`, '1');
    localStorage.setItem(`clinic.sample.seen.v1.${ID}`, new Date().toISOString());
    localStorage.setItem('clinicapp.cookie-notice.v1', '1');
    SECTIONS.forEach((s) => localStorage.setItem(`clinic.hint.v1.${ID}.${s}`, '1'));
  }, { ID, SECTIONS });
  await p.reload();
  await p.waitForTimeout(2500);
  // notifications derived on load: all read except the newest behaviour record
  await p.evaluate(() => {
    const KEY = 'pofi-onizleme-v4';
    const db = JSON.parse(localStorage.getItem(KEY));
    const latest = db.abc_events.filter((e) => e.child_id === 'c-nazli').sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];
    db.notifications.forEach((n) => { if (n.app === 'clinic' && !n.read_at && !(latest && n.data && n.data.abc_id === latest.id)) n.read_at = n.created_at; });
    localStorage.setItem(KEY, JSON.stringify(db));
  });
  await p.reload();
  await p.waitForTimeout(2500);
  return { b, ctx, p, r };
}

async function clickText(p, text, opts = {}) {
  const loc = p.getByText(text, { exact: true });
  const n = await loc.count();
  if (!n) throw new Error(`not found: ${text}`);
  await loc.nth(opts.nth ?? 0).click();
  await p.waitForTimeout(opts.wait ?? 1200);
}

module.exports = { open, clickText, DEVICES };

// Scroll the nearest scrollable ancestor so that the element with this exact text sits `offset` px below the container top
async function scrollToText(p, text, offset = 16, nth = 0) {
  const ok = await p.evaluate(({ text, offset, nth }) => {
    const all = [...document.querySelectorAll('div,span')].filter((e) => e.childElementCount === 0 && e.textContent.trim() === text);
    const el = all[nth];
    if (!el) return false;
    let c = el.parentElement;
    while (c) {
      const st = getComputedStyle(c);
      if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && c.scrollHeight > c.clientHeight) break;
      c = c.parentElement;
    }
    if (!c) return 'noscroll';
    const delta = el.getBoundingClientRect().top - c.getBoundingClientRect().top - offset;
    c.scrollTop += delta;
    return true;
  }, { text, offset, nth });
  if (ok !== true) throw new Error(`scroll ${text}: ${ok}`);
  await p.waitForTimeout(600);
}
module.exports.scrollToText = scrollToText;

// Nudge the main scroll container (the one that holds `anchorText`) by the smallest delta in [min,max] so that no text line
// or icon straddles the top or bottom edge of the viewport. Returns the delta used.
async function cleanEdges(p, anchorText, min = -80, max = 80) {
  const r = await p.evaluate(({ anchorText, min, max }) => {
    const leaves = () => [...document.querySelectorAll('div,span,text')].filter((e) => e.childElementCount === 0 && e.textContent.trim());
    const anchor = leaves().find((e) => e.textContent.trim() === anchorText);
    let c = anchor && anchor.parentElement;
    while (c) {
      const st = getComputedStyle(c);
      if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && c.scrollHeight > c.clientHeight) break;
      c = c.parentElement;
    }
    if (!c) return { err: 'noscroll' };
    const box = c.getBoundingClientRect();
    const H = Math.min(window.innerHeight, box.bottom), T = Math.max(0, box.top);
    const items = [...leaves(), ...document.querySelectorAll('svg')].filter((e) => c.contains(e)).map((e) => e.getBoundingClientRect())
      .filter((b) => b.height > 0 && b.width > 0);
    // a text line may not cross the edge, nor sit in the 6 px band next to it (cramped)
    const bad = (d) => items.some((b) => (b.top - d < H && b.bottom - d > H - 6) || (b.top - d < T + 6 && b.bottom - d > T));
    const start = c.scrollTop;
    const maxScroll = c.scrollHeight - c.clientHeight;
    const cands = [0];
    for (let k = 1; k <= Math.max(-min, max); k++) { if (k <= max) cands.push(k); if (k <= -min) cands.push(-k); }
    for (const d of cands) {
      if (start + d < 0 || start + d > maxScroll) continue;
      if (!bad(d)) { c.scrollTop = start + d; return { d }; }
    }
    return { err: 'none clean' };
  }, { anchorText, min, max });
  await p.waitForTimeout(400);
  return r;
}
module.exports.cleanEdges = cleanEdges;
