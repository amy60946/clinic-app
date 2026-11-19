// Telefon ve tablet "Nasıl çalışır" (Moyo Ebeveyn · Moyo Oyun · Moyo Uzman). Kendiliğinden ilerlemez.
// Sekmeler: tek ürün görünür; hapa dokunarak, ‹ › ile, ← → tuşlarıyla ya da parmakla sola / sağa kaydırarak (40 piksel) geçilir.
//   Dikey kaydırma sayfanındır (touch-action: pan-y), sekme değişmez.
// 18 Kasım 2026: önizlemedeki düzen seçici ve tarayıcı kaydı kalktı. Varsayılan iki boyda da Sekmeler; tablette (≥ 700 px)
//   "üçü alt alta" düzeni önizleme alternatifi olarak durur (<html data-v-nk="b">, oniz grubu "nk"). "Kartlar" düzeni kaldırıldı.
(function () {
  var sec = document.querySelector('.nk'); if (!sec) return;
  var tabs = [].slice.call(sec.querySelectorAll('.nk-sekmeler [role=tab]')), panel = [].slice.call(sec.querySelectorAll('.nk-adim')),
      kap = sec.querySelector('.nk-paneller'), geri = sec.querySelector('.nk-geri'), ileri = sec.querySelector('.nk-ileri'), sayac = sec.querySelector('.nk-sayac'),
      az = matchMedia('(prefers-reduced-motion: reduce)'), n = panel.length, aktif = 0;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  function sekme() { return sec.getAttribute('data-duzen') === 'sekme'; }
  function isaretle(i) {
    aktif = i;
    tabs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; t.classList.toggle('gecti', k < i); });
    panel.forEach(function (p, k) { p.classList.toggle('on', k === i); });
    sayac.textContent = (i + 1) + ' / ' + n; geri.disabled = i === 0; ileri.disabled = i === n - 1;
  }
  function git(i) { i = clamp(i, 0, n - 1); if (i !== aktif) isaretle(i); }
  tabs.forEach(function (t, k) { t.addEventListener('click', function () { git(k); }); });
  function tus(e) {
    if (!sekme() || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    e.preventDefault(); git(aktif + (e.key === 'ArrowRight' ? 1 : -1));
    if (e.currentTarget !== kap) tabs[aktif].focus();
  }
  sec.querySelector('.nk-sekmeler').addEventListener('keydown', tus);
  kap.addEventListener('keydown', tus);
  geri.addEventListener('click', function () { git(aktif - 1); });
  ileri.addEventListener('click', function () { git(aktif + 1); });
  // Parmakla (fareyle de) sola / sağa: içerik parmağı hafifçe izler, 40 pikseli geçince ürün değişir
  function yerine(hareket) { kap.style.transition = hareket && !az.matches ? 'transform .28s ease' : 'none'; kap.style.transform = ''; }
  if (window.moyoKaydir) moyoKaydir(kap, {
    etkin: sekme,
    surukle: function (dx) { var uc = (aktif === 0 && dx > 0) || (aktif === n - 1 && dx < 0); kap.style.transition = 'none'; kap.style.transform = 'translate3d(' + (dx * (uc ? 0.12 : 0.3)).toFixed(1) + 'px,0,0)'; },
    bitir: function (dx) { var eski = aktif; if (Math.abs(dx) >= 40) git(aktif + (dx < 0 ? 1 : -1)); yerine(eski === aktif); },
    iptal: function () { yerine(true); }
  });
  // Düzen: Sekmeler (varsayılan). Tablette alternatif "b": üçü alt alta.
  function duzen() {
    var liste = document.documentElement.getAttribute('data-v-nk') === 'b' && innerWidth >= 700;
    sec.setAttribute('data-duzen', liste ? 'liste' : 'sekme');
    isaretle(aktif);
  }
  addEventListener('resize', duzen);
  addEventListener('oniz', function (e) { if (e.detail && e.detail.k === 'nk') duzen(); });
  duzen();
})();
