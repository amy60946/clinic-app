/* Moyo Ebeveyn tanıtım sayfası: sayfaya özel davranış (m/site.js'in üstüne; site.js Mercek sitesinin kopyasıdır, dokunulmaz).
   Dışarıya hiçbir istek göndermez. 18 Kasım 2026 turu:
   1. Açılış görseli (tur 3'te tek sürüm): Moyo Ebeveyn ile Moyo Oyun arasındaki ilişkiyi dört vuruşta anlatır (rutini planlarsınız →
      oyunda macera olur → çocuğunuz yapar, oyunda "Yaptım"a dokunur → siz onaylarsınız). Fare üstündeyken ve klavye odağı anlatımdayken durur; duraklat düğmesi
      var; görünmezken çalışmaz. Hareket azaltmada (ya da betik yoksa) "duruk" hâl: dört numara, iki ok, dört satırlık liste.
   2. "Nasıl çalışır": telefonda ve tablette parmakla sağa sola kaydırılır (dikey kaydırma etkilenmez), masaüstünde yatay
      dokunmatik yüzey ve ok tuşları; altta ‹ 2 / 5 › ve dokunmatik cihazda ilk kaydırmaya kadar kısa ipucu.
      19 Kasım QA: sekme çubuğu hiçbir genişlikte taşmaz. Beş sekme adıyla sığıyorsa tam düzen (.tam), sığmıyorsa kısa düzen
      (.kisa: beş eşit numara, etkin adımın adı çubuğun altında); genişlik değişince ve yazı tipi yüklenince yeniden ölçülür.
   3. "Neden Moyo" (tur 5): ekranın büyütülen şeridi (vurgu kartı) ekrana girince bir kez, ekrandaki yerinden kalkarak büyür.
      Betik yoksa, IntersectionObserver yoksa ya da hareket azaltmada kart baştan yerindedir. */
(function () {
  'use strict';
  var d = document;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var izle = function (mq, fn) { if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var dar = window.matchMedia('(max-width: 520px)');   // m/moyo.css ile aynı: dar sahne
  var depo = {
    al: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    yaz: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* yok say */ } }
  };

  /* ---------------- 1. Açılış görseli: dört vuruş ---------------- */
  each(d.querySelectorAll('[data-ma]'), function (fig) {
    var sahne = fig.querySelector('.ma-sahne'), kutu = fig.querySelector('.ma-kutu'), liste = fig.querySelector('.ma-adim');
    var dur = fig.querySelector('.ma-dur'), cip = sahne.querySelector('.ma-cip'), tik = sahne.querySelector('.ma-tik');
    var telUst = sahne.querySelector('.ma-tel .ust'), oyunUst = sahne.querySelector('.ma-oyun .ust');
    var H = {};
    each(sahne.querySelectorAll('.ma-halka'), function (h) { H[h.className.split(' ')[1].slice(2)] = h; });
    var SVG = { g: sahne.querySelector('.ma-yol.genis'), d: sahne.querySelector('.ma-yol.dar') };
    // Vuruşlar (ms): 1 rutin · 2 çip oyuna · 3 Yaptım · 4 çip telefona + onay (biraz uzun: onay ve "Taş geldi!" görünsün)
    var BAS = [0, 2200, 4400, 6600], TOPLAM = 9600, TEMSIL = [900, 3150, 5700, 9000];
    var t = 400, son = 0, raf = 0, hareket = false, kullanici = false, fare = false, odak = false, gorunur = true, sonVurus = -1;
    var dugmeler = [], uzunluk = [];

    var ara = function (x, a, b) { return x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a); };
    var yumusak = function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
    var sinif = function (el, on) { if (el && el.classList.contains('on') !== on) el.classList.toggle('on', on); };
    var yol = function (k) { return (dar.matches ? SVG.d : SVG.g).querySelector('.y' + k); };
    var nokta = function (p, k) {
      var el = yol(k), id = (dar.matches ? 'd' : 'g') + k;
      if (!uzunluk[id]) uzunluk[id] = el.getTotalLength();
      var pt = el.getPointAtLength(uzunluk[id] * p), vb = el.ownerSVGElement.viewBox.baseVal;
      return [pt.x * sahne.clientWidth / vb.width, pt.y * sahne.clientHeight / vb.height];
    };

    function ciz(x) {
      var v = x < BAS[1] ? 0 : x < BAS[2] ? 1 : x < BAS[3] ? 2 : 3;
      sinif(telUst, x >= 7850);                       // inceleme ekranı çip telefona varınca
      sinif(oyunUst, x >= 8500);                      // onaydan sonra oyunda "Taş geldi!"
      sinif(H.rutin, x >= 150 && x < 2300);
      sinif(H.satir, x >= 3620 && x < 4500);
      sinif(H.yaptim, x >= 4450 && x < 6700);
      sinif(H.onay, x >= 8050);
      sinif(tik, x >= 5100 && x < 8600);
      each([SVG.g, SVG.d], function (s) { sinif(s.querySelector('.y1'), x >= 2200 && x < 4000); sinif(s.querySelector('.y2'), x >= 6600 && x < 8200); });
      var k = 0, p = 0, op = 0;
      if (x >= 2250 && x < 3800) { k = 1; p = yumusak(ara(x, 2350, 3650)); op = Math.min(ara(x, 2250, 2400), 1 - ara(x, 3660, 3780)); }
      else if (x >= 6650 && x < 8000) { k = 2; p = yumusak(ara(x, 6750, 7850)); op = Math.min(ara(x, 6650, 6800), 1 - ara(x, 7860, 7980)); }
      if (k) {
        if (cip.getAttribute('data-k') !== String(k)) cip.setAttribute('data-k', k);
        var xy = nokta(p, k), yw = cip.offsetWidth / 2 + 2, yh = cip.offsetHeight / 2 + 2;   // çip sahneden taşmasın
        xy[0] = Math.max(yw, Math.min(sahne.clientWidth - yw, xy[0]));
        xy[1] = Math.max(yh, Math.min(sahne.clientHeight - yh, xy[1]));
        cip.style.transform = 'translate(' + xy[0].toFixed(1) + 'px,' + xy[1].toFixed(1) + 'px) translate(-50%,-50%)';
      }
      cip.style.opacity = op.toFixed(3);
      if (v !== sonVurus) {
        sonVurus = v;
        dugmeler.forEach(function (b, j) { if (j === v) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      }
    }
    function temizle() {
      each(sahne.querySelectorAll('.on'), function (el) { el.classList.remove('on'); });
      cip.style.opacity = '0';
      dugmeler.forEach(function (b) { b.removeAttribute('aria-current'); });
      sonVurus = -1;
    }

    var calisiyor = function () { return hareket && !kullanici && !fare && !odak && gorunur && !d.hidden; };
    function kare(simdi) {
      raf = 0;
      if (!calisiyor()) { son = 0; return; }
      if (son) t += Math.min(simdi - son, 100);       // sekme arka planda kaldıysa sıçramasın
      son = simdi;
      if (t >= TOPLAM) t -= TOPLAM;
      ciz(t);
      raf = window.requestAnimationFrame(kare);
    }
    function surdur() { if (!raf && calisiyor()) { son = 0; raf = window.requestAnimationFrame(kare); } }

    // Maddeler düğmeye döner: dokununca o adımın anı gösterilir, oradan sürer
    function donustur() {
      if (dugmeler.length) return;
      each(liste.querySelectorAll('li'), function (li, k) {
        var b = d.createElement('button');
        b.type = 'button';
        while (li.firstChild) b.appendChild(li.firstChild);
        li.appendChild(b);
        b.addEventListener('click', function () { if (!hareket) return; t = TEMSIL[k]; ciz(t); });
        dugmeler.push(b);
      });
    }
    function dugmeDurumu() {
      dur.setAttribute('data-state', kullanici ? 'paused' : 'playing');
      dur.setAttribute('aria-label', kullanici ? 'Anlatımı oynat' : 'Anlatımı duraklat');
    }
    function kip() {
      hareket = !reduce.matches;
      fig.classList.toggle('duruk', !hareket);
      dur.hidden = !hareket;
      if (hareket) donustur();
      dugmeler.forEach(function (b) { b.disabled = !hareket; });
      if (hareket) { ciz(t); surdur(); } else temizle();
    }

    dur.addEventListener('click', function () { kullanici = !kullanici; dugmeDurumu(); surdur(); });
    each([kutu, liste], function (el) {
      el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') fare = true; });
      el.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { fare = false; surdur(); } });
    });
    // Klavye odağı anlatım maddelerindeyken durur (duraklat düğmesi hariç: onun durumu düğmede yazar)
    liste.addEventListener('focusin', function (e) { if (e.target.matches && e.target.matches(':focus-visible')) odak = true; });
    liste.addEventListener('focusout', function (e) { if (!liste.contains(e.relatedTarget)) { odak = false; surdur(); } });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { gorunur = es[es.length - 1].isIntersecting; surdur(); }, { threshold: 0.15 }).observe(fig);
    }
    d.addEventListener('visibilitychange', surdur);
    window.addEventListener('resize', function () { if (hareket) ciz(t); });
    izle(reduce, kip);
    fig.maAn = function (x) { t = x; ciz(t); };   // denetim için: belirli bir anı çiz
    dugmeDurumu();
    kip();
  });

  /* ---------------- 2. Nasıl çalışır: kaydırma, ‹ n / 5 ›, ipucu ---------------- */
  var OK = function (yon) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (yon < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7') + '"/></svg>'; };
  var IPUCU = 'moyo.nc.kaydirdi';
  each(d.querySelectorAll('[data-nc]'), function (box) {
    var tabs = box.querySelectorAll('[role=tab]'), n = tabs.length, serit = box.querySelector('.nc-tabs'), etiket = box.querySelector('.nc-etiket');
    var secili = function () { for (var i = 0; i < n; i++) if (tabs[i].getAttribute('aria-selected') === 'true') return i; return 0; };
    var cur = secili();

    var nav = d.createElement('div');
    nav.className = 'nc-nav';
    nav.innerHTML = '<button type="button" class="nc-onceki" aria-label="Önceki adım">' + OK(-1) + '</button>' +
      '<span class="nc-say"></span><button type="button" class="nc-sonraki" aria-label="Sonraki adım">' + OK(1) + '</button>';
    box.appendChild(nav);
    var onceki = nav.querySelector('.nc-onceki'), sonraki = nav.querySelector('.nc-sonraki'), say = nav.querySelector('.nc-say');
    var ipucu = null;
    if (window.matchMedia('(pointer: coarse)').matches && !depo.al(IPUCU)) {
      ipucu = d.createElement('p');
      ipucu.className = 'nc-ipucu';
      ipucu.textContent = 'Sağa sola kaydırarak da geçebilirsiniz.';
      nav.appendChild(ipucu);
    }
    var ipucuGizle = function () { if (ipucu) { ipucu.remove(); ipucu = null; } depo.yaz(IPUCU, '1'); };

    // Tam düzen sığıyor mu: önce tam düzende ölçülür, taşıyorsa kısa düzene geçilir (yalnız genişlik değişince)
    var olcW = -1;
    function sigdir(zorla) {
      var w = box.clientWidth;
      if (zorla !== true && w === olcW) return;
      olcW = w;
      box.classList.remove('kisa'); box.classList.add('tam');
      var tasar = serit.scrollWidth > serit.clientWidth + 1;
      box.classList.toggle('tam', !tasar); box.classList.toggle('kisa', tasar);
    }
    sigdir(true);
    window.addEventListener('resize', sigdir);
    window.addEventListener('load', function () { sigdir(true); });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { sigdir(true); });

    function guncelle() {
      say.innerHTML = '<span class="sr">Adım </span>' + (cur + 1) + ' / ' + n;
      if (etiket) etiket.textContent = (tabs[cur].querySelector('span') || tabs[cur]).textContent;
      onceki.disabled = cur === 0;
      sonraki.disabled = cur === n - 1;
    }
    // Seçim site.js'te (sekmeye tıklama, ok tuşları); burada yön (kayma animasyonu) ve sayaç izlenir.
    new MutationObserver(function () {
      var k = secili();
      if (k === cur) return;
      box.setAttribute('data-yon', k > cur ? 'ileri' : 'geri');
      cur = k;
      guncelle();
    }).observe(serit, { subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
    var git = function (k) { if (k >= 0 && k < n && k !== cur) tabs[k].click(); };
    onceki.addEventListener('click', function () { git(cur - 1); });
    sonraki.addEventListener('click', function () { git(cur + 1); });
    guncelle();

    // Parmakla: yatay hareket belirginse adım değişir; dikey kaydırma (touch-action: pan-y) olduğu gibi kalır
    var x0 = 0, y0 = 0, t0 = 0, dokunus = false;
    box.addEventListener('touchstart', function (e) {
      dokunus = e.touches.length === 1 && !(e.target.closest && e.target.closest('.nc-tabs, .nc-nav'));
      if (!dokunus) return;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
    }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (!dokunus) return;
      dokunus = false;
      var p = e.changedTouches[0], dx = p.clientX - x0, dy = p.clientY - y0;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - t0 < 1000) {
        git(cur + (dx < 0 ? 1 : -1));
        ipucuGizle();
      }
    }, { passive: true });
    box.addEventListener('touchcancel', function () { dokunus = false; }, { passive: true });

    // Dokunmatik yüzey: yatay iki parmak hareketi bir adım; süren eylemsizlik yeni adım saymaz
    var birikim = 0, kilit = 0;
    box.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.2) return;
      if (e.target.closest && e.target.closest('.nc-tabs') && serit.scrollWidth > serit.clientWidth) return;
      e.preventDefault();
      var simdi = Date.now();
      if (simdi < kilit) { kilit = Math.max(kilit, simdi + 260); birikim = 0; return; }
      birikim += e.deltaX;
      if (Math.abs(birikim) > 70) { git(cur + (birikim > 0 ? 1 : -1)); birikim = 0; kilit = simdi + 700; }
    }, { passive: false });

    // Ok tuşları: sekmelerde site.js yapar; ‹ › düğmelerindeyken de çalışsın
    nav.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); git(cur + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); git(cur - 1); }
    });
  });

  /* ---------------- 3. Neden Moyo: vurgu kartı bir kez yerine oturur ---------------- */
  var nzp = d.querySelectorAll('.nzp');
  if (nzp.length && 'IntersectionObserver' in window && !reduce.matches) {
    var gozcu = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.parentNode.classList.remove('bekle'); gozcu.unobserve(en.target); } });
    }, { threshold: 0.75 });
    each(nzp, function (f) { f.classList.add('bekle'); gozcu.observe(f.querySelector('.nzp-cikma')); });
    izle(reduce, function () { if (reduce.matches) each(nzp, function (f) { f.classList.remove('bekle'); gozcu.disconnect(); }); });
  }
})();

// 22 Kasım 2026: dar ekran menüsü açılır panel (m/moyo.css); çatı sayfadaki gibi panel dışına dokununca ya da sayfa kayınca kapanır.
(function () {
  var btn = document.querySelector('.menu-btn'), head = document.getElementById('top'), root = document.documentElement;
  if (!btn || !head) return;
  var acik = function () { return root.classList.contains('menu-open'); };
  document.addEventListener('click', function (e) { if (acik() && !head.contains(e.target)) btn.click(); });
  var y0 = 0;
  btn.addEventListener('click', function () { y0 = scrollY; });
  addEventListener('scroll', function () { if (acik() && Math.abs(scrollY - y0) > 40) btn.click(); }, { passive: true });
})();
