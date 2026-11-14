// Kaydırdıkça dönüp büyüyen anlatım. Sayfanın kendi kaydırması değişmez (hız, yön, durma noktası yok); bölüm uzun, sahne yapışkan,
// kartların açısı ve boyu kaydırma ilerlemesinden hesaplanır. Hareketi azalt açıksa ya da betik yoksa kartlar alt alta durur.
(function () {
  var sec = document.querySelector('.hikaye');
  if (!sec) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;   // statik kalır
  // Çatı sayfa: telefonda kaydırma anlatımı yok; adımlar alt alta, ekrana girince bir kez döner ve büyür
  if (sec.getAttribute('data-mobil') === 'liste' && matchMedia('(max-width: 820px)').matches) {
    sec.classList.add('anim');
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('gor'); io.unobserve(e.target); } }); }, { threshold: 0.2 });
    [].forEach.call(sec.querySelectorAll('.cikis'), function (a) { io.observe(a); });
    return;
  }
  sec.classList.remove('statik');
  var kart = [].slice.call(sec.querySelectorAll('.hk-kart')), yazi = [].slice.call(sec.querySelectorAll('.hk-yazi')), nokta = [].slice.call(sec.querySelectorAll('.hk-nokta a'));
  var n = kart.length, SPAN = n - 1 + 0.8, START = -0.55, HOLD = 0.24;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var ease = function (t) { return t * t * (3 - 2 * t); };
  var prog = function () { var vh = window.innerHeight, h = sec.offsetHeight - vh; return h > 0 ? clamp(-sec.getBoundingClientRect().top / h, 0, 1) : 0; };
  var W1 = 0.5, W2 = 0.62, win = function (x) { return ease(clamp((x - HOLD) / (W1 - HOLD), 0, 1)); }, winK = function (x) { return ease(clamp((x - HOLD) / (W2 - HOLD), 0, 1)); };   // 0: yerinde, 1: tam dönmüş ve sönmüş
  var ticking = false;
  function frame() {
    ticking = false;
    var f = prog() * SPAN + START, mob = window.innerWidth <= 820, k = mob ? 0.55 : 1;
    var act = clamp(Math.round(f), 0, n - 1);
    kart.forEach(function (el, i) {
      var t = f - i, u = winK(Math.abs(t)), ry, rx, s, tx, op;
      if (t < 0) { ry = 40 * u * k; rx = 16 * u * k; s = 1 - 0.32 * u; tx = (mob ? 0 : 20) * u; op = i === 0 ? 1 : 1 - u; }
      else { ry = -28 * u * k; rx = -4 * u * k; s = 1 - 0.2 * u; tx = -(mob ? 0 : 22) * u; op = i === n - 1 ? 1 : 1 - u; }
      el.style.transform = 'translateX(' + tx.toFixed(2) + '%) rotateY(' + ry.toFixed(2) + 'deg) rotateX(' + rx.toFixed(2) + 'deg) scale(' + s.toFixed(3) + ')';
      el.style.opacity = op.toFixed(3);
      el.style.zIndex = String(100 - Math.round(Math.abs(t) * 10));
    });
    yazi.forEach(function (el, i) {
      var t = f - i, u = win(Math.abs(t));
      if ((i === 0 && t < 0) || (i === n - 1 && t > 0)) u = 0;        // ilk adımın yazısı baştan, son adımınki sonda okunur
      el.style.opacity = (1 - u).toFixed(3);
      el.style.transform = 'translateY(' + ((t < 0 ? 1 : -1) * 40 * u).toFixed(1) + 'px)';
      el.setAttribute('aria-hidden', String(i !== act));
    });
    nokta.forEach(function (a, i) { if (i === act) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
  }
  var req = function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  nokta.forEach(function (a, i) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var vh = window.innerHeight, h = sec.offsetHeight - vh, top = sec.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + h * clamp((i - START) / SPAN, 0, 1), behavior: 'smooth' });
    });
  });
  frame();
})();
// Kitle sekmeleri (B)
(function () {
  var tabs = [].slice.call(document.querySelectorAll('.sekmeler [role=tab]'));
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', String(on)); document.getElementById(x.getAttribute('aria-controls')).hidden = !on; });
    });
  });
})();
