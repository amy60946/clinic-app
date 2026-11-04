// status bar, screen windows (edge cleaning), crops, lifted callouts, punctuation; included at the end of each alt page
const SB = '<span>9:41</span><i class="isl"></i><span style="display:flex;align-items:center">'
 + '<svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx=".8" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx=".8" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx=".8" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx=".8" fill="currentColor"/></svg>'
 + '<svg viewBox="0 0 16 12"><path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM3.4 6.8a6.5 6.5 0 0 1 9.2 0l-1.5 1.5a4.4 4.4 0 0 0-6.2 0zM1.1 4.5a9.7 9.7 0 0 1 13.8 0l-1.5 1.5a7.6 7.6 0 0 0-10.8 0z" fill="currentColor"/></svg>'
 + '<svg viewBox="0 0 27 12"><rect x=".6" y=".6" width="22.8" height="10.8" rx="3.2" fill="none" stroke="currentColor" stroke-opacity=".45" stroke-width="1.1"/><rect x="2.4" y="2.4" width="17" height="7.2" rx="1.8" fill="currentColor"/><path d="M25 4v4a2 2 0 0 0 0-4z" fill="currentColor" fill-opacity=".45"/></svg></span>';
const B = window.BOXES || {};
// phone screens: smallest shift so no text line crosses the top edge; cards keep the window they were given
function clean(src, top, bottom) {
  const items = (B[src] || []).filter((x) => x[4] > 0);
  const cnt = (d) => items.filter(([, , y, , h]) => (top + d > 0 && y < top + d + 5 && y + h > top + d - 1)).length;
  if (top === 0) return 0;
  for (let k = 0; k <= 60; k++) for (const d of [k, -k]) if (top + d >= 0 && !cnt(d)) return d;
  return 0;
}
// height (raw px) of the bottom safe strip under the home indicator: at least `min`, its top edge in a gap between lines
function strip(src, bottom, min) {
  const items = (B[src] || []).filter((x) => x[4] > 0);
  for (let h = min; h < min + 120; h++) { const e = bottom - h; if (!items.some(([, , y, , ih]) => y < e + 4 && y + ih > e - 4)) return h; }
  return min;
}
function win(el, withBar) {
  const src = el.dataset.src, y = Number(el.dataset.y || 0), x = Number(el.dataset.x || 0), w = Number(el.dataset.w || 440);
  el.innerHTML = (withBar ? `<div class="sb">${SB}</div>` : '') + `<div class="vw" style="overflow:hidden;position:relative"><img class="ui" src="raw/${src}.png"></div>` + (withBar ? '<i class="safe"></i><i class="home"></i>' : '');
  const vw = el.querySelector('.vw'), img = vw.querySelector('img');
  const k = el.clientWidth / w;
  img.style.width = 440 * k + 'px'; img.style.maxWidth = 'none'; img.style.marginLeft = -x * k + 'px';
  vw.style.height = (withBar ? 902 * (el.clientWidth / 440) : el.clientHeight) + 'px';
  const d = withBar && !el.dataset.fix ? clean(src, y, 0) : 0;
  img.style.marginTop = (-(y + d) * k) + 'px';
  if (withBar) { const h = strip(src, y + d + 902, 26 / k); el.querySelector('.safe').style.height = h * k + 'px'; }
  el.dataset.k = k; el.dataset.win = y + d;
}
document.querySelectorAll('.scr').forEach((s) => win(s, true));
document.querySelectorAll('.card[data-src]').forEach((s) => win(s, false));
document.querySelectorAll('.crop').forEach((c) => {
  const [x, y, w, h] = c.dataset.box.split(',').map(Number), s = Number(c.dataset.s || 1);
  Object.assign(c.style, { width: w * s + 'px', height: h * s + 'px', backgroundImage: `url(raw/${c.dataset.src}.png)`,
    backgroundSize: `${440 * s}px auto`, backgroundPosition: `${-x * s}px ${-y * s}px` });
});
// lifted callout: centred on the same element inside the phone screen (data-lift = id of the .scr)
document.querySelectorAll('.call[data-lift]').forEach((c) => {
  const scr = document.getElementById(c.dataset.lift), crop = c.querySelector('.crop');
  const [, y, , h] = crop.dataset.box.split(',').map(Number);
  const host = c.offsetParent.getBoundingClientRect(), sr = scr.getBoundingClientRect(), k = Number(scr.dataset.k);
  const cy = sr.top - host.top + 54 * (sr.width / 440) + (y + h / 2 - Number(scr.dataset.win)) * k;
  c.style.top = (cy - c.offsetHeight / 2) + 'px';
});
document.querySelectorAll('.paper[data-src], .excerpt[data-src]').forEach((p) => { p.style.backgroundImage = `url(raw/${p.dataset.src}.png)`; });
// phones with a lifted callout: dim the screen so the callout reads as the focus
document.querySelectorAll('.call[data-lift], .scr[data-dim]').forEach((c) => { const s = c.classList.contains('scr') ? c : document.getElementById(c.dataset.lift); const v = document.createElement('i');
  v.style.cssText = 'position:absolute;inset:0;background:rgba(15,27,61,.42);pointer-events:none;z-index:1'; s.appendChild(v); });
// headline punctuation sits a little tight (the face's comma and period carry a wide left bearing)
document.querySelectorAll('h1, p.sub, .ipad h1, .ipad p').forEach((h) => { h.innerHTML = h.innerHTML.replace(/([^\s>])([,.])/g, '$1<span class="p">$2</span>'); });
