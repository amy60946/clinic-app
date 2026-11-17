// Moyo Ekosistemi (17 Kasım 2026): ortadaki ekran net; yanındakiler bulanık, yana açılmış ve geride durur.
// Masaüstünde sayfa kaydıkça ilerler (sayfanın kendi kaydırması; hız ve durma noktası değişmez), her adımda kısa bir duruş vardır.
// Altındaki hap sayaçta etkin adım yeşil dolar, geçilen adımların numarası yeşil kalır; hapa tıklayınca o adıma gidilir.
// Telefonda ve iPad'de (≤ 1024 px ya da dokunmatik), hareket azaltmada ya da betik yokken: yana kaydırılan kartlar + aynı sayaç.
(function () {
  var sec = document.querySelector('.dongu-b'); if (!sec) return;
  sec.classList.add('js');
  var kmp = matchMedia('(max-width: 1024px), (hover: none) and (pointer: coarse)'), az = matchMedia('(prefers-reduced-motion: reduce)');
  var kayit = sec.querySelector('.d-kayit'), slot = [].slice.call(sec.querySelectorAll('.d-slot')), yazi = [].slice.call(sec.querySelectorAll('.d-yazi-m')),
      nokta = [].slice.call(sec.querySelectorAll('.d-nokta a')), n = slot.length, aktif = -1, tick = false;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var ease = function (t) { return t * t * (3 - 2 * t); };
  function isaret(list, i) {
    list.forEach(function (a, k) {
      if (k === i) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
      a.parentNode.classList.toggle('gecti', k < i);
    });
  }
  function prog() { var h = kayit.offsetHeight - innerHeight; return h > 0 ? clamp(-kayit.getBoundingClientRect().top / h, 0, 1) : 0; }
  // Yan ekranın uzaklığı görsellerin gerçek genişliğinden: geniş panel de dar telefon da ortadakine yapışmaz.
  var P = 1600, Z = 260, PZ = P / (P + Z), KUC = 0.86, X = [0];
  function olc() {
    var w = slot.map(function (s) { var c = s.firstElementChild; return (c && c.offsetWidth) || s.offsetWidth; }), g = Math.max(36, innerWidth * 0.04);
    X = [0];
    for (var j = 0; j < n - 1; j++) X.push(X[j] + (Math.max(w[j], w[j + 1]) / 2 + g) / PZ + Math.min(w[j], w[j + 1]) / 2 * KUC);
  }
  function xAt(p) { var i = Math.min(n - 2, Math.floor(p)), f = p - i; return n < 2 ? 0 : X[i] + (X[i + 1] - X[i]) * f; }
  function frame() {
    tick = false; if (sec.classList.contains('statik')) return;
    var f = prog() * (n - 1 + 0.6) - 0.3, i = clamp(Math.round(f), 0, n - 1), d = f - Math.round(f);
    var hold = 0.29, x = Math.abs(d) <= hold ? 0 : Math.sign(d) * ease((Math.abs(d) - hold) / (0.5 - hold)) * 0.5;
    var pos = clamp(Math.round(f) + x, 0, n - 1), x0 = xAt(pos);
    slot.forEach(function (s, k) {
      var t = k - pos, a = Math.abs(t), m = Math.min(a, 1);
      // yana açıl, geriye çekil, hafifçe içe dön ve küçül; uzaklaştıkça bulanıklaş ve sol
      s.style.transform = 'translateX(' + (X[k] - x0).toFixed(1) + 'px) translateZ(' + (-Math.min(a, 2) * Z).toFixed(1) + 'px) rotateY(' + clamp(-t * 20, -32, 32).toFixed(2) + 'deg) scale(' + (1 - (1 - KUC) * m).toFixed(3) + ')';
      s.style.filter = a < 0.52 ? 'none' : 'blur(' + Math.min(6, (a - 0.52) / 0.48 * 5.2).toFixed(2) + 'px)';   // yarı yola kadar ikisi de net
      s.style.opacity = (a <= 1 ? 1 - a * 0.36 : Math.max(0, 0.64 * (1 - (a - 1) / 0.85))).toFixed(3);
      s.style.zIndex = String(100 - Math.round(a * 10));
    });
    if (i !== aktif) {
      aktif = i;
      slot.forEach(function (s, k) { s.classList.toggle('on', k === i); });
      yazi.forEach(function (y, k) { y.classList.toggle('on', k === i); y.setAttribute('aria-hidden', String(k !== i)); });
      isaret(nokta, i);
    }
  }
  function req() { if (!tick) { tick = true; requestAnimationFrame(frame); } }
  function mod() {
    var akis = !kmp.matches && !az.matches;   // telefon ve iPad: yana kaydırılan kartlar
    sec.classList.toggle('statik', !akis);
    aktif = -1; if (akis) { olc(); frame(); }
  }
  nokta.forEach(function (a, k) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var h = kayit.offsetHeight - innerHeight, top = kayit.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + h * clamp((k + 0.3) / (n - 1 + 0.6), 0, 1), behavior: az.matches ? 'auto' : 'smooth' });
    });
  });
  addEventListener('scroll', req, { passive: true }); addEventListener('resize', function () { olc(); req(); });
  addEventListener('load', function () { olc(); req(); });
  slot.forEach(function (sl) { [].forEach.call(sl.querySelectorAll('img'), function (im) { if (!im.complete) im.addEventListener('load', function () { olc(); req(); }); }); });
  kmp.addEventListener('change', mod); az.addEventListener('change', mod); mod();

  // Yana kaydırılan kartlar (telefon / iPad)
  var serit = sec.querySelector('.d-serit'), kart = [].slice.call(sec.querySelectorAll('.d-kart')), mn = [].slice.call(sec.querySelectorAll('.d-nokta-m a')), son = -1;
  function simdiki() { var c = serit.scrollLeft + serit.clientWidth / 2, best = 0, bd = 1e9; kart.forEach(function (k, j) { var m = k.offsetLeft + k.offsetWidth / 2, dd = Math.abs(m - c); if (dd < bd) { bd = dd; best = j; } }); return best; }
  function guncelle() {
    var j = simdiki(); if (j === son) return; son = j;
    kart.forEach(function (k, q) { k.classList.toggle('on', q === j); });
    isaret(mn, j);
    var a = mn[j], kap = a && a.closest('.sayac');   // etkin hap görünür kalsın
    if (kap && kap.scrollWidth > kap.clientWidth) kap.scrollTo({ left: a.parentNode.offsetLeft - (kap.clientWidth - a.parentNode.offsetWidth) / 2, behavior: 'auto' });
  }
  function git(j) { var k = kart[clamp(j, 0, kart.length - 1)]; serit.scrollTo({ left: k.offsetLeft - (serit.clientWidth - k.offsetWidth) / 2, behavior: az.matches ? 'auto' : 'smooth' }); }
  mn.forEach(function (a, k) { a.addEventListener('click', function (e) { e.preventDefault(); git(k); }); });
  serit.addEventListener('scroll', function () { requestAnimationFrame(guncelle); }, { passive: true });
  serit.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); git(simdiki() + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); git(simdiki() - 1); } });
  addEventListener('resize', function () { son = -1; guncelle(); });
  guncelle();
})();
