/* Moyo Ebeveyn tanıtım sayfası: sayfaya özel davranış (m/site.js'in üstüne; site.js Mercek sitesinin kopyasıdır, dokunulmaz).
   Dışarıya hiçbir istek göndermez. 18 Kasım 2026 turu:
   1. Açılış görseli (tur 3'te tek sürüm): Moyo Ebeveyn ile Moyo Oyun arasındaki ilişkiyi dört vuruşta anlatır (rutini planlarsınız →
      oyunda macera olur → çocuğunuz yapar, oyunda "Yaptım"a dokunur → siz onaylarsınız). Fare üstündeyken ve klavye odağı anlatımdayken durur; duraklat düğmesi
      var; görünmezken çalışmaz. Hareket azaltmada (ya da betik yoksa) "duruk" hâl: dört numara, iki ok, dört satırlık liste.
   2. "Nasıl çalışır": telefonda ve tablette parmakla sağa sola kaydırılır (dikey kaydırma etkilenmez), masaüstünde yatay
      dokunmatik yüzey ve ok tuşları; altta ‹ 2 / 5 › ve dokunmatik cihazda ilk kaydırmaya kadar kısa ipucu.
      19 Kasım QA: sekme çubuğu hiçbir genişlikte taşmaz. Beş sekme adıyla sığıyorsa tam düzen (.tam), sığmıyorsa kısa düzen
      (.kisa: beş eşit numara, etkin adımın adı çubuğun altında); genişlik değişince ve yazı tipi yüklenince yeniden ölçülür.
   3. "Neden Moyo", tasarım b (tur 4, önizlemede seçilir): tek telefon; nedenler kaydıkça (ya da birine dokununca) telefonun görüntüsü
      o nedenin işlevine yakınlaşır: önce telefonun tamamına uzaklaşır, ekran değişir, sonra yeni işleve yakınlaşır (1,5 sn, sakin).
      Hareket azaltmada ya da betik yoksa .duruk: pencere yok, her nedenin yanında kendi sabit kırpımı. */
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

  /* ---------------- 3. Neden Moyo (ndzn b): tek telefon, "kamera" ---------------- */
  // Telefon sahnede nokta ölçüsünde: kenar B, gövde 418 × 872, ekran 390 × 844 (m/moyo.css .nz-govde). Katman başına iki bölge
  // (data-g uzun, data-d kısa; nokta, ekranın sol üstünden): pencere enine genişse kısa bölge, değilse uzun bölge pencereye sığdırılır.
  each(d.querySelectorAll('[data-nz]'), function (kutu) {
    var pencere = kutu.querySelector('.nz-pencere'), kamera = kutu.querySelector('.nz-kamera');
    var katman = kutu.querySelectorAll('.nz-katman'), sebep = kutu.querySelectorAll('.nz-sebep > li');
    var telefon = window.matchMedia('(max-width: 760px)');
    var B = 14, TW = 390 + 2 * B, TH = 844 + 2 * B, SURE = 1500, EGRI = 'cubic-bezier(.45, 0, .55, 1)';
    var aktif = -1, anim = null, gozcu = null, canli = false;
    var enine = function () { return pencere.clientWidth > pencere.clientHeight * 1.05; };
    var bolge = function (k) { return katman[k].getAttribute(enine() ? 'data-d' : 'data-g').split(',').map(Number); };
    var donustur = function (tx, ty, s) { return 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + s.toFixed(4) + ')'; };
    // Bölge pencereye sığdırılır; pencere bölgeden uzunsa artan yer bölgenin ÜSTÜNDE kalır (alt kenar sabit): davranış kaydında "Sesli
    // anlat" alanı görünmesin (tur 4: kayıt ses kaydı gibi okunmasın), rutinde üstteki "Hangi günler?" de görünsün.
    function hedef(k) {
      var W = pencere.clientWidth, H = pencere.clientHeight, r = bolge(k);
      var s = Math.min(W * 0.94 / (r[2] + 2 * B), H * 0.94 / r[3]);
      return donustur(W / 2 - s * (B + r[0] + r[2] / 2), H * 0.99 - s * (B + r[1] + r[3]), s);
    }
    function genel() {
      var W = pencere.clientWidth, H = pencere.clientHeight, s = Math.min(W * 0.9 / TW, H * 0.9 / TH);
      return donustur((W - s * TW) / 2, (H - s * TH) / 2, s);
    }
    function durdur() {   // süren geçişi olduğu yerde dondurur
      if (!anim) return;
      var t = getComputedStyle(kamera).transform, op = [].map.call(katman, function (el) { return getComputedStyle(el).opacity; });
      anim.forEach(function (a) { a.cancel(); });
      anim = null;
      kamera.style.transform = t === 'none' ? '' : t;
      each(katman, function (el, j) { el.style.opacity = op[j]; });
    }
    function sec(k, hemen) {
      if (!pencere.clientWidth) { aktif = k; return; }      // seçenek gizliyken ölçü yok: görünür olunca kurulur
      if (k === aktif && !hemen) return;
      var onceki = aktif;
      aktif = k;
      each(sebep, function (li, j) { li.classList.toggle('on', j === k); });
      pencere.setAttribute('aria-label', katman[k].getAttribute(enine() ? 'data-alt-d' : 'data-alt-g'));
      durdur();
      var son = hedef(k);
      if (hemen || onceki < 0 || !canli || !kamera.animate) {
        kamera.style.transform = son;
        each(katman, function (el, j) { el.style.opacity = j === k ? '1' : '0'; });
        return;
      }
      var bas = kamera.style.transform || son, parcalar = [];
      parcalar.push(kamera.animate([{ transform: bas, easing: EGRI }, { transform: genel(), offset: 0.42, easing: EGRI }, { transform: son }], { duration: SURE }));
      each(katman, function (el, j) {
        var a = parseFloat(el.style.opacity) || 0, b = j === k ? 1 : 0;
        if (a !== b) parcalar.push(el.animate([{ opacity: a }, { opacity: a, offset: 0.36 }, { opacity: b, offset: 0.56 }, { opacity: b }], { duration: SURE }));
        el.style.opacity = String(b);
      });
      kamera.style.transform = son;
      anim = parcalar;
      parcalar[0].onfinish = function () { if (anim === parcalar) anim = null; };
    }
    var cizgiY = -1;
    function gozle() {
      // Okuma çizgisi: geniş ekranda yapışkan pencerenin ortası; telefonda pencerenin altında kalan alanın üst yarısı
      var ust = parseFloat(getComputedStyle(pencere).top) || 0, h = pencere.offsetHeight, vh = window.innerHeight;
      var y = Math.round(telefon.matches ? ust + h + (vh - ust - h) * 0.42 : ust + h / 2);
      if (!h || (gozcu && y === cizgiY)) return;
      cizgiY = y;
      if (gozcu) gozcu.disconnect();
      gozcu = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) sec([].indexOf.call(sebep, en.target)); });
      }, { rootMargin: -y + 'px 0px ' + -(vh - y - 1) + 'px 0px' });
      each(sebep, function (li) { gozcu.observe(li); });
    }
    function kip() {
      canli = !reduce.matches && 'IntersectionObserver' in window;
      kutu.classList.toggle('duruk', !canli);
      if (canli) { sec(aktif < 0 ? 0 : aktif, true); gozle(); }
      else { durdur(); if (gozcu) { gozcu.disconnect(); gozcu = null; } }
    }
    function olc() { if (canli) { if (aktif >= 0) sec(aktif, true); gozle(); } }
    each(sebep, function (li, j) { li.addEventListener('click', function () { if (canli) sec(j); }); });
    if ('ResizeObserver' in window) new ResizeObserver(olc).observe(pencere);
    window.addEventListener('resize', olc);
    izle(reduce, kip);
    window.addEventListener('oniz', olc);
    kip();
  });
})();
