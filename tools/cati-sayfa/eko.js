// Moyo Ekosistemi (17 Kasım 2026; 18 Kasım: parmakla kaydırma, giriş hareketi, 6. adım şeması; 19 Kasım: açık sahne tek sürüm,
// ekranlar büyük, yandakiler daha az küçük ve bulanık: kullanıcı "kayan ekranların içeriği zor seçiliyor").
// Ortadaki ekran net; yanındakiler bulanık, yana açılmış ve geride durur.
// Masaüstünde sayfa kaydıkça ilerler (sayfanın kendi kaydırması; hız ve durma noktası değişmez), her adımda kısa bir duruş vardır.
//   Ek: ← → tuşları ve izleme dörtgeninde yatay kaydırma bir adım ilerletir (yine sayfanın kaydırmasıyla).
// Altındaki hap sayaçta etkin adım yeşil dolar, geçilen adımların numarası yeşil kalır; hapa tıklayınca o adıma gidilir.
// Telefonda ve tablette (≤ 1024 px ya da dokunmatik), hareket azaltmada: parmakla sola / sağa kaydırılan kartlar + aynı sayaç.
//   40 pikseli geçen yatay kaydırma bir adım ilerletir; dikey kaydırma sayfanındır (touch-action: pan-y), adım değişmez.
//   İlk kaydırmaya kadar "‹ Kaydırın ›" ipucu görünür (dokunmatikte); farede kartların yanında ok düğmeleri vardır.
// Betik yokken kartlar tarayıcının kendi yana kaydırmasıyla gezilir (CSS).
(function () {
  var sec = document.querySelector('.dongu-b'); if (!sec) return;
  sec.classList.add('js');
  var kmp = matchMedia('(max-width: 1024px), (hover: none) and (pointer: coarse)'), az = matchMedia('(prefers-reduced-motion: reduce)');
  var kayit = sec.querySelector('.d-kayit'), sahne = sec.querySelector('.d-sahne'), slot = [].slice.call(sec.querySelectorAll('.d-slot')), yazi = [].slice.call(sec.querySelectorAll('.d-yazi-m')),
      nokta = [].slice.call(sec.querySelectorAll('.d-nokta a')), n = slot.length, aktif = -1, tick = false;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var ease = function (t) { return t * t * (3 - 2 * t); };
  function statik() { return sec.classList.contains('statik'); }
  function isaret(list, i) {
    list.forEach(function (a, k) {
      if (k === i) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
      a.parentNode.classList.toggle('gecti', k < i);
    });
  }

  // ---------- Masaüstü: sayfa kaydıkça ilerleyen sahne ----------
  function prog() { var h = kayit.offsetHeight - innerHeight; return h > 0 ? clamp(-kayit.getBoundingClientRect().top / h, 0, 1) : 0; }
  // Yan ekranın uzaklığı görsellerin gerçek genişliğinden: geniş panel de dar telefon da ortadakine yapışmaz.
  var P = 1600, Z = 200, PZ = P / (P + Z), KUC = 0.9, X = [0];
  function olc() {
    var w = slot.map(function (s) { var c = s.firstElementChild; return (c && c.offsetWidth) || s.offsetWidth; }), g = Math.max(36, innerWidth * 0.04);
    X = [0];
    for (var j = 0; j < n - 1; j++) X.push(X[j] + (Math.max(w[j], w[j + 1]) / 2 + g) / PZ + Math.min(w[j], w[j + 1]) / 2 * KUC);
  }
  function xAt(p) { var i = Math.min(n - 2, Math.floor(p)), f = p - i; return n < 2 ? 0 : X[i] + (X[i + 1] - X[i]) * f; }
  function frame() {
    tick = false; if (statik()) return;
    var f = prog() * (n - 1 + 0.6) - 0.3, i = clamp(Math.round(f), 0, n - 1), d = f - Math.round(f);
    var hold = 0.29, x = Math.abs(d) <= hold ? 0 : Math.sign(d) * ease((Math.abs(d) - hold) / (0.5 - hold)) * 0.5;
    var pos = clamp(Math.round(f) + x, 0, n - 1), x0 = xAt(pos);
    slot.forEach(function (s, k) {
      var t = k - pos, a = Math.abs(t), m = Math.min(a, 1);
      // yana açıl, geriye çekil, hafifçe içe dön ve küçül; uzaklaştıkça bulanıklaş ve sol
      s.style.transform = 'translateX(' + (X[k] - x0).toFixed(1) + 'px) translateZ(' + (-Math.min(a, 2) * Z).toFixed(1) + 'px) rotateY(' + clamp(-t * 20, -32, 32).toFixed(2) + 'deg) scale(' + (1 - (1 - KUC) * m).toFixed(3) + ')';
      s.style.filter = a < 0.52 ? 'none' : 'blur(' + Math.min(4, (a - 0.52) / 0.48 * 2.6).toFixed(2) + 'px)';   // yarı yola kadar ikisi de net; yandaki tanınır kalır
      s.style.opacity = (a <= 1 ? 1 - a * 0.26 : Math.max(0, 0.74 * (1 - (a - 1) / 0.85))).toFixed(3);
      s.style.zIndex = String(100 - Math.round(a * 10));
    });
    if (i !== aktif) {
      aktif = i;
      slot.forEach(function (s, k) { s.classList.toggle('on', k === i); s.classList.toggle('sol', k < i); });
      yazi.forEach(function (y, k) { y.classList.toggle('on', k === i); y.setAttribute('aria-hidden', String(k !== i)); });
      isaret(nokta, i);
    }
  }
  function req() { if (!tick) { tick = true; requestAnimationFrame(frame); } }
  function adimaGit(k) {
    k = clamp(k, 0, n - 1);
    var h = kayit.offsetHeight - innerHeight, top = kayit.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + h * clamp((k + 0.3) / (n - 1 + 0.6), 0, 1), behavior: az.matches ? 'auto' : 'smooth' });
  }
  nokta.forEach(function (a, k) { a.addEventListener('click', function (e) { e.preventDefault(); adimaGit(k); }); });
  // ← → tuşları: sahne ekrandayken bir adım (yazı alanında değilken)
  document.addEventListener('keydown', function (e) {
    if (statik() || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var t = e.target; if (t && t.closest && t.closest('input, textarea, select, [contenteditable], .sayac')) return;
    var r = kayit.getBoundingClientRect(); if (r.top > innerHeight * 0.4 || r.bottom < innerHeight * 0.6) return;
    e.preventDefault(); adimaGit(aktif + (e.key === 'ArrowRight' ? 1 : -1));
  });
  // izleme dörtgeninde yatay kaydırma: bir adım (dikey kaydırmaya dokunulmaz)
  var tAcc = 0, tSon = 0, tKilit = 0;
  function yatayTeker(e, ileri) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.2) return;
    e.preventDefault();
    var simdi = Date.now(); if (simdi - tSon > 220) tAcc = 0; tSon = simdi;
    if (simdi < tKilit) return;
    tAcc += e.deltaX;
    if (Math.abs(tAcc) >= 40) { ileri(tAcc > 0 ? 1 : -1); tAcc = 0; tKilit = simdi + 520; }
  }
  sahne.addEventListener('wheel', function (e) { if (!statik()) yatayTeker(e, function (y) { adimaGit(aktif + y); }); }, { passive: false });
  addEventListener('scroll', req, { passive: true });
  slot.forEach(function (sl) { [].forEach.call(sl.querySelectorAll('img'), function (im) { if (!im.complete) im.addEventListener('load', function () { olc(); req(); }); }); });

  // ---------- Telefon ve tablet: parmakla kaydırılan kartlar ----------
  var pencere = sec.querySelector('.d-pencere'), serit = sec.querySelector('.d-serit'), kart = [].slice.call(sec.querySelectorAll('.d-kart')),
      mn = [].slice.call(sec.querySelectorAll('.d-nokta-m a')), geri = sec.querySelector('.d-ok.geri'), ileri = sec.querySelector('.d-ok.ileri'), son = 0;
  function hedefX(j) { var k = kart[j]; return pencere.clientWidth / 2 - (k.offsetLeft + k.offsetWidth / 2); }
  function koy(x, hareket) { serit.classList.toggle('aninda', !hareket); serit.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)'; }
  function git(j, hareket) {
    j = clamp(j, 0, kart.length - 1);
    var degisti = j !== son; son = j;
    koy(hedefX(j), hareket !== false && !az.matches);
    kart.forEach(function (k, q) { k.classList.toggle('on', q === j); k.classList.toggle('sol', q < j); });
    isaret(mn, j);
    if (geri) { geri.disabled = j === 0; ileri.disabled = j === kart.length - 1; }
    var a = mn[j], kap = a && a.closest('.sayac');   // etkin hap görünür kalsın
    if (kap && kap.scrollWidth > kap.clientWidth) kap.scrollTo({ left: a.parentNode.offsetLeft - (kap.clientWidth - a.parentNode.offsetWidth) / 2, behavior: 'auto' });
    return degisti;
  }
  function kaydirildi() { sec.classList.add('kaydirildi'); }   // ipucu söner
  if (window.moyoKaydir) moyoKaydir(pencere, {
    etkin: statik,
    surukle: function (dx) { var uc = (son === 0 && dx > 0) || (son === kart.length - 1 && dx < 0); koy(hedefX(son) + dx * (uc ? 0.3 : 1), false); },
    bitir: function (dx) { if (git(son + (Math.abs(dx) >= 40 ? (dx < 0 ? 1 : -1) : 0))) kaydirildi(); },
    iptal: function () { git(son); }
  });
  pencere.addEventListener('wheel', function (e) { if (statik()) yatayTeker(e, function (y) { if (git(son + y)) kaydirildi(); }); }, { passive: false });
  mn.forEach(function (a, k) { a.addEventListener('click', function (e) { e.preventDefault(); git(k); }); });
  if (geri) { geri.addEventListener('click', function () { git(son - 1); }); ileri.addEventListener('click', function () { git(son + 1); }); }
  serit.addEventListener('keydown', function (e) {
    var y = e.key === 'ArrowRight' ? son + 1 : e.key === 'ArrowLeft' ? son - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? kart.length - 1 : -1;
    if (y < 0 && e.key !== 'ArrowLeft') return;
    e.preventDefault(); git(y);
  });
  // klavyeyle karttaki bir öğeye gelinirse şerit kaymasın (dönüşümle yerleşir)
  pencere.addEventListener('scroll', function () { pencere.scrollLeft = 0; });

  // ---------- Kip (akış / kartlar), ölçü ----------
  function mod() {
    var akis = !kmp.matches && !az.matches;
    sec.classList.toggle('statik', !akis);
    aktif = -1; if (akis) { olc(); frame(); } else git(son, false);
  }
  function yenidenOlc() { if (statik()) git(son, false); else { olc(); req(); } }
  addEventListener('resize', yenidenOlc);
  addEventListener('load', yenidenOlc);
  kmp.addEventListener('change', mod); az.addEventListener('change', mod); mod();

  // ---------- Giriş hareketi (bir kez, sahne ekrana girince) ----------
  // Ortadaki ekran hafifçe yükselip büyür, yandakiler kenardan gelir (c-18.css .bekle / .gir). Hareket azaltmada yok.
  function girisVar() { return !az.matches && 'IntersectionObserver' in window; }
  function gir() { sec.classList.remove('bekle'); sec.classList.add('gir'); setTimeout(function () { sec.classList.add('girdi'); }, 1100); }
  if (girisVar()) {
    sec.classList.add('bekle');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { io.disconnect(); gir(); } });
    }, { threshold: 0.3 });
    io.observe(sec.querySelector('.d-halka-kap')); io.observe(pencere);
    setTimeout(function () { if (sec.classList.contains('bekle')) { var r = sec.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) gir(); } }, 1500);   // güvenlik: görünür ama tetiklenmediyse
  } else sec.classList.add('gir', 'girdi');
})();
