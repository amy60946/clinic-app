// Telefon ve iPad "Nasıl çalışır": Sekmeler (tıkla / kaydır) · Kartlar (yana kaydır) · Liste (alt alta). Kendiliğinden ilerlemez.
(function () {
  var sec = document.querySelector('.nk'); if (!sec) return;
  var tabs = [].slice.call(sec.querySelectorAll('.nk-sekmeler [role=tab]')), panel = [].slice.call(sec.querySelectorAll('.nk-adim')),
      kap = sec.querySelector('.nk-paneller'), geri = sec.querySelector('.nk-geri'), ileri = sec.querySelector('.nk-ileri'), sayac = sec.querySelector('.nk-sayac'),
      az = matchMedia('(prefers-reduced-motion: reduce)'), n = panel.length, aktif = 0;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  function duzen() { return sec.getAttribute('data-duzen'); }
  function isaretle(i) {
    aktif = i;
    tabs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    panel.forEach(function (p, k) { p.classList.toggle('on', k === i); });
    sayac.textContent = (i + 1) + ' / ' + n; geri.disabled = i === 0; ileri.disabled = i === n - 1;
  }
  function git(i) {
    i = clamp(i, 0, n - 1);
    if (duzen() === 'kart') { var p = panel[i]; kap.scrollTo({ left: p.offsetLeft - (kap.clientWidth - p.offsetWidth) / 2, behavior: az.matches ? 'auto' : 'smooth' }); }
    isaretle(i);
  }
  tabs.forEach(function (t, k) { t.addEventListener('click', function () { git(k); }); });
  sec.querySelector('.nk-sekmeler').addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); git(aktif + (e.key === 'ArrowRight' ? 1 : -1)); tabs[aktif].focus(); }
  });
  geri.addEventListener('click', function () { git(aktif - 1); });
  ileri.addEventListener('click', function () { git(aktif + 1); });
  // Kartlarda kaydırınca hangi kartın ortada olduğunu işaretle
  kap.addEventListener('scroll', function () {
    if (duzen() !== 'kart') return;
    requestAnimationFrame(function () {
      var c = kap.scrollLeft + kap.clientWidth / 2, best = 0, bd = 1e9;
      panel.forEach(function (p, k) { var d = Math.abs(p.offsetLeft + p.offsetWidth / 2 - c); if (d < bd) { bd = d; best = k; } });
      if (best !== aktif) isaretle(best);
    });
  }, { passive: true });
  // Sekmelerde parmakla sola / sağa kaydırma
  var x0 = null, y0 = null;
  kap.addEventListener('touchstart', function (e) { if (duzen() !== 'sekme') return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  kap.addEventListener('touchend', function (e) {
    if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) git(aktif + (dx < 0 ? 1 : -1));
  }, { passive: true });
  // Önizleme: düzen seçici (yalnız bu tarayıcıda hatırlanır)
  var dg = [].slice.call(sec.querySelectorAll('.nk-secici button'));
  function sec_(d) { sec.setAttribute('data-duzen', d); dg.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-duzen') === d)); }); git(aktif); try { localStorage.setItem('cati.nk', d); } catch (e) {} }
  dg.forEach(function (b) { b.addEventListener('click', function () { sec_(b.getAttribute('data-duzen')); }); });
  var kayitli = null; try { kayitli = localStorage.getItem('cati.nk'); } catch (e) {}
  // varsayılan: telefonda Sekmeler, iPad'de (≥ 700 px) Liste
  if (kayitli && /^(sekme|kart|liste)$/.test(kayitli)) sec_(kayitli); else { sec.setAttribute('data-duzen', innerWidth >= 700 ? 'liste' : 'sekme'); dg.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-duzen') === sec.getAttribute('data-duzen'))); }); isaretle(0); }
})();
