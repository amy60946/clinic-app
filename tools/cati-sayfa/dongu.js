// "Hepsi birlikte": masaüstünde kaydırdıkça 60° dönen halka (sayfanın kendi kaydırması; hız ve durma noktası değişmez).
// Telefonda (≤ 820 px), hareket azaltmada ya da betik yokken: yana kaydırılan kartlar + İleri / Geri.
(function () {
  var sec = document.querySelector('.dongu-b'); if (!sec) return;
  var genis = matchMedia('(min-width: 821px)'), az = matchMedia('(prefers-reduced-motion: reduce)');
  var kayit = sec.querySelector('.d-kayit'), halka = sec.querySelector('.d-halka'), slot = [].slice.call(sec.querySelectorAll('.d-slot')), yazi = [].slice.call(sec.querySelectorAll('.d-yazi-m')),
      nokta = [].slice.call(sec.querySelectorAll('.d-nokta a')), n = slot.length, aktif = -1, tick = false;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var ease = function (t) { return t * t * (3 - 2 * t); };
  function prog() { var h = kayit.offsetHeight - innerHeight; return h > 0 ? clamp(-kayit.getBoundingClientRect().top / h, 0, 1) : 0; }
  function frame() {
    tick = false; if (sec.classList.contains('statik')) return;
    var f = prog() * (n - 1 + 0.6) - 0.3, i = clamp(Math.round(f), 0, n - 1), d = f - Math.round(f);
    // her adımda kısa bir duruş: dönüş adımlar arasında olur
    var hold = 0.22, x = Math.abs(d) <= hold ? 0 : Math.sign(d) * ease((Math.abs(d) - hold) / (0.5 - hold)) * 0.5;
    var pos = clamp(Math.round(f) + x, 0, n - 1);
    halka.style.setProperty('--a', (-pos * 60).toFixed(2) + 'deg');
    if (i !== aktif) {
      aktif = i;
      slot.forEach(function (s, k) { s.classList.toggle('on', k === i); });
      yazi.forEach(function (y, k) { y.classList.toggle('on', k === i); y.setAttribute('aria-hidden', String(k !== i)); });
      nokta.forEach(function (a, k) { if (k === i) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
    }
  }
  function req() { if (!tick) { tick = true; requestAnimationFrame(frame); } }
  function mod() {
    var halkaOl = genis.matches && !az.matches;
    sec.classList.toggle('statik', !halkaOl);
    aktif = -1; if (halkaOl) frame();
  }
  nokta.forEach(function (a, k) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var h = kayit.offsetHeight - innerHeight, top = kayit.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + h * clamp((k + 0.3) / (n - 1 + 0.6), 0, 1), behavior: az.matches ? 'auto' : 'smooth' });
    });
  });
  addEventListener('scroll', req, { passive: true }); addEventListener('resize', req);
  genis.addEventListener('change', mod); az.addEventListener('change', mod); mod();

  // Yana kaydırılan kartlar
  var serit = sec.querySelector('.d-serit'), kart = [].slice.call(sec.querySelectorAll('.d-kart')), geri = sec.querySelector('.d-geri'), ileri = sec.querySelector('.d-ileri'), sayac = sec.querySelector('.d-sayac');
  function simdiki() { var c = serit.scrollLeft + serit.clientWidth / 2, best = 0, bd = 1e9; kart.forEach(function (k, j) { var m = k.offsetLeft + k.offsetWidth / 2, dd = Math.abs(m - c); if (dd < bd) { bd = dd; best = j; } }); return best; }
  function guncelle() { var j = simdiki(); sayac.textContent = (j + 1) + ' / ' + kart.length; geri.disabled = j === 0; ileri.disabled = j === kart.length - 1; }
  function git(j) { var k = kart[clamp(j, 0, kart.length - 1)]; serit.scrollTo({ left: k.offsetLeft - (serit.clientWidth - k.offsetWidth) / 2, behavior: az.matches ? 'auto' : 'smooth' }); }
  geri.addEventListener('click', function () { git(simdiki() - 1); });
  ileri.addEventListener('click', function () { git(simdiki() + 1); });
  serit.addEventListener('scroll', function () { requestAnimationFrame(guncelle); }, { passive: true });
  serit.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); git(simdiki() + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); git(simdiki() - 1); } });
  guncelle();
})();
// Önizleme: alt başlık seçeneği
(function () {
  var b = [].slice.call(document.querySelectorAll('.alt-secici button')), s = [].slice.call(document.querySelectorAll('.alt-sec'));
  b.forEach(function (x) { x.addEventListener('click', function () { var v = x.getAttribute('data-alt'); b.forEach(function (y) { y.setAttribute('aria-pressed', String(y === x)); }); s.forEach(function (t) { t.hidden = t.getAttribute('data-alt') !== v; }); }); });
})();
