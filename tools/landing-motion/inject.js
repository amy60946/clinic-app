// Sayfanın içinde çalışan parçalar (addInitScript / evaluate). Kaynak koda dokunmaz; yalnız çekim sırasında eklenir.

// "Şimdi"yi SHOT_TIME'a taşır ama saat akmaya devam eder (zamanlayıcılar ve geçişler gerçek hızında).
// setFixedTime kullanılmaz: Date donarsa React Native Animated ilerlemez.
function shiftDate(shotMs) {
  const Real = Date;
  const off = shotMs - Real.now();
  const now = () => Real.now() + off;
  // eslint-disable-next-line no-global-assign
  Date = new Proxy(Real, {
    construct(t, a) { return a.length ? new t(...a) : new t(now()); },
    apply(t) { return new t(now()).toString(); },
    get(t, k) { return k === 'now' ? now : Reflect.get(t, k); },
  });
}

// İmleç: masaüstünde macOS oku, telefonda yarı saydam dokunma noktası. mousemove / dokunma olaylarını izler;
// basınca halka büyüyüp söner. __lmCursor(x, y): olayın sayfaya ulaşmadığı yerler (iframe) için elle konum.
function cursor(kind) {
  const start = () => {
    if (document.getElementById('__lm-cursor')) return;
    const css = document.createElement('style');
    css.textContent = `
      #__lm-cursor{position:fixed;left:0;top:0;pointer-events:none;z-index:2147483647;will-change:transform;opacity:0}
      #__lm-cursor.on{opacity:1}
      #__lm-cursor .a{display:block;transform-origin:5px 3px;transition:transform 90ms ease-out}
      #__lm-cursor.down .a{transform:scale(.88)}
      #__lm-cursor .dot{width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;background:rgba(15,27,61,.35);border:2px solid #fff;
        box-shadow:0 1px 6px rgba(15,27,61,.28);box-sizing:border-box;transition:transform 110ms ease-out,background-color 110ms ease-out}
      #__lm-cursor.down .dot{transform:scale(.8);background:rgba(15,27,61,.5)}
      .__lm-ring{position:fixed;left:0;top:0;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;pointer-events:none;z-index:2147483646;
        box-sizing:border-box;border:2px solid rgba(15,27,61,.55);background:rgba(15,27,61,.10);animation:__lm-ring 450ms cubic-bezier(.2,.6,.3,1) forwards}
      .__lm-ring.touch{border-color:rgba(255,255,255,.9);background:rgba(15,27,61,.18);box-shadow:0 0 0 1px rgba(15,27,61,.25)}
      @keyframes __lm-ring{from{transform:var(--at) scale(1);opacity:.95}to{transform:var(--at) scale(1.92);opacity:0}}
      ::selection{background:transparent}
      *{-webkit-tap-highlight-color:transparent}
      :focus,:focus-visible{outline:none !important}
    `;
    document.documentElement.appendChild(css);
    const c = document.createElement('div');
    c.id = '__lm-cursor';
    c.innerHTML = kind === 'touch' ? '<div class="dot"></div>'
      : '<svg class="a" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" style="margin:-3px 0 0 -5px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.38))">'
        + '<path d="M5.5 3.2v16.2l4.2-3.9 2.7 6.2 2.7-1.2-2.7-6.1h5.7z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    let x = -100, y = -100;
    const at = (nx, ny) => { x = nx; y = ny; c.style.transform = `translate(${x}px,${y}px)`; c.classList.add('on'); };
    const ring = () => {
      const r = document.createElement('div');
      r.className = '__lm-ring' + (kind === 'touch' ? ' touch' : '');
      r.style.setProperty('--at', `translate(${x}px,${y}px)`);
      document.documentElement.appendChild(r);
      setTimeout(() => r.remove(), 520);
    };
    const down = () => { c.classList.add('down'); ring(); };
    const up = () => c.classList.remove('down');
    window.__lmCursor = (nx, ny) => at(nx, ny);
    window.__lmPress = (on) => (on ? down() : up());
    const o = { capture: true, passive: true };
    window.addEventListener('mousemove', (e) => at(e.clientX, e.clientY), o);
    window.addEventListener('mousedown', (e) => { at(e.clientX, e.clientY); down(); }, o);
    window.addEventListener('mouseup', up, o);
    if (kind === 'touch') {
      const t = (e) => e.touches[0] || e.changedTouches[0];
      window.addEventListener('touchstart', (e) => { const p = t(e); at(p.clientX, p.clientY); down(); }, o);
      window.addEventListener('touchmove', (e) => { const p = t(e); at(p.clientX, p.clientY); }, o);
      window.addEventListener('touchend', up, o);
      window.addEventListener('touchcancel', up, o);
    }
  };
  if (document.documentElement) start();
  document.addEventListener('DOMContentLoaded', start);
}

// Ad: ekranda "ClinicApp" geçen her yazı "Moyo Mercek" olur (rapor penceresindeki iframe dahil). Yalnız görüntü; kaynak aynı kalır.
function brand(arg) {
  const from = arg.from, to = arg.to;
  const re = new RegExp(from, 'g');
  const fix = (n) => { const v = n.nodeValue; if (v && v.indexOf(from) !== -1) n.nodeValue = v.replace(re, to); };
  const walk = (root) => { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) fix(n); };
  const watch = () => {
    walk(document.documentElement);
    new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === 'characterData') fix(m.target);
        else m.addedNodes.forEach((n) => { if (n.nodeType === 3) fix(n); else if (n.nodeType === 1) walk(n); });
      }
    }).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  };
  if (document.documentElement) watch(); else document.addEventListener('readystatechange', watch, { once: true });
  const d = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'srcdoc');
  if (d && d.set) Object.defineProperty(HTMLIFrameElement.prototype, 'srcdoc', { ...d, set(v) { d.set.call(this, String(v).replace(re, to)); } });
}

// Pano kopyalama başsız tarayıcıda izin ister; ekrandaki "Kopyalandı" geri bildirimi için yazma hep başarılı sayılır.
function clipboard() {
  try {
    const c = navigator.clipboard || {};
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: Object.assign(Object.create(Object.getPrototypeOf(c)), { writeText: async () => {}, readText: async () => '' }) });
  } catch (e) { /* yoksa uygulamanın kendi yedeği çalışır */ }
}

module.exports = { shiftDate, cursor, brand, clipboard };
