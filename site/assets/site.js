/* Moyo Mercek tanıtım sitesi: ortak betik (index.html, fiyat.html, guvenlik.html). Dışarıya hiçbir istek göndermez. */

/* FİYATLAR: TEK KAYNAK. Kesin fiyatlar (kullanıcı kararı 20 Kasım 2026; ortak sozlesme/ekonomi.md 9, KDV dahil, yıllık = aylık × 10).
   Fiyat yalnız fiyat.html'de yazar (18 Kasım 2026: ana sayfadaki "aylık …'dan başlayan" cümlesi kalktı); hepsi buradan yazılır. HTML'deki sabit
   değerler betiksiz okuyucu içindir ve bunlarla aynı tutulur. draft true iken fiyat sayfasında "Taslak fiyat" etiketi görünür. */
window.MERCEK_PRICES = { draft: false, solo: { m: 1199.99, y: 11999.99 }, clinic: { m: 3999.99, y: 39999.99 } };

(function () {
  'use strict';
  var d = document, root = d.documentElement;
  root.classList.add('js');
  var each = function (sel, fn) { Array.prototype.forEach.call(d.querySelectorAll(sel), fn); };

  /* 1. Adresler (6 Kasım 2026, ortak DURUM "Alan adı ve adresler"): uygulama https://uzman.moyoapp.com.tr (?kayit kayıt, ?kod kod),
     yasal metinler https://moyoapp.com.tr/yasal/<anahtar>, destek https://moyoapp.com.tr/destek; bağlantılarda sabit yazılı.
     Önizlemede window.CLINICAPP_URL / window.CLINICAPP_LEGAL (legal işlevinin adresi) ile değiştirilir. */
  var app = window.CLINICAPP_URL;
  if (app) each('[data-app]', function (a) { a.href = app; a.target = '_blank'; a.rel = 'noopener'; });
  var LEGAL = window.CLINICAPP_LEGAL;
  if (LEGAL) each('[data-legal]', function (a) { a.href = LEGAL + '?doc=' + a.getAttribute('data-legal'); });

  /* 2. Fiyatlar */
  var P = window.MERCEK_PRICES;
  var tl = function (n) {
    var s = (Math.round(n * 100) / 100).toFixed(2).split('.');
    return '₺' + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (s[1] === '00' ? '' : ',' + s[1]);
  };
  // Türkçe ayrılma eki ('dan/'den/'tan/'ten): sayının okunuşundaki son sözcüğe göre (kuruş varsa kuruşun).
  var fromSuffix = function (n) {
    var s = (Math.round(n * 100) / 100).toFixed(2).split('.'), x = parseInt(s[1], 10) || parseInt(s[0], 10);
    var ones = ['', "'den", "'den", "'ten", "'ten", "'ten", "'dan", "'den", "'den", "'dan"];
    var tens = ['', "'dan", "'den", "'dan", "'tan", "'den", "'tan", "'ten", "'den", "'dan"];
    if (!x) return "'dan";
    if (x % 10) return ones[x % 10];
    if (x % 100) return tens[Math.floor(x / 10) % 10];
    if (x % 1e6) return "'den";
    return "'dan";
  };
  var gift = function (p) { return p.m && p.y ? Math.max(0, Math.floor(12 - p.y / p.m + 0.05)) : 0; };
  var period = 'y';
  var render = function () {
    if (!P) return;
    each('[data-price]', function (el) {
      var k = el.getAttribute('data-price').split('.'), plan = P[k[0]];
      if (plan) el.textContent = tl(plan[k[1] || period]);
    });
    each('[data-unit]', function (el) { el.textContent = period === 'y' ? '/ yıl' : '/ ay'; });
    each('[data-per]', function (el) {
      var plan = P[el.getAttribute('data-per')];
      if (plan) el.textContent = period === 'y' ? 'Aylık yaklaşık ' + tl(Math.round(plan.y / 12)) : 'Aylık ödeme';
    });
    var low = Math.min(P.solo.m, P.clinic.m);
    each('[data-from]', function (el) { el.textContent = tl(low) + fromSuffix(low); });
    var g = Math.min(gift(P.solo), gift(P.clinic));
    each('[data-gift]', function (el) { el.textContent = g + ' ay ücretsiz'; el.hidden = !g; });
    each('[data-draft]', function (el) { el.hidden = !P.draft; });
  };
  each('[data-period]', function (b) {
    b.addEventListener('click', function () {
      period = b.getAttribute('data-period');
      each('[data-period]', function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      render();
    });
  });
  render();

  /* 2b. Fiyat sayfası (<body data-offers>): yapılandırılmış veride paket teklifleri. Fiyat taslakken (draft: true) YAZILMAZ;
     ürün sahibi fiyatı kesinleştirip draft false olunca arama motorlarına kendiliğinden gider. Sayılar yukarıdaki tek kaynaktan. */
  if (P && !P.draft && d.body.hasAttribute('data-offers')) {
    var teklif = function (ad, plan) {
      var u = 'https://mercek.moyoapp.com.tr/fiyat';
      return [{ '@type': 'Offer', name: ad + ' (aylık)', price: plan.m.toFixed(2), priceCurrency: 'TRY', url: u },
        { '@type': 'Offer', name: ad + ' (yıllık)', price: plan.y.toFixed(2), priceCurrency: 'TRY', url: u }];
    };
    var ld = d.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Moyo Mercek',
      applicationCategory: 'BusinessApplication', operatingSystem: 'Web, iOS, iPadOS', offers: teklif('Bireysel', P.solo).concat(teklif('Klinik', P.clinic)) });
    d.head.appendChild(ld);
  }

  /* 3. Üst menü: telefonda tam ekran menü */
  var btn = d.querySelector('.menu-btn'), menu = d.getElementById('menu');
  var outside = function () { return d.querySelectorAll('body > :not(header):not(script)'); };
  var isOpen = function () { return root.classList.contains('menu-open'); };
  var setMenu = function (open, refocus) {
    if (!btn || !menu) return;
    root.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menü');
    Array.prototype.forEach.call(outside(), function (el) { el.inert = open; });
    if (!open && refocus) btn.focus();
  };
  if (btn && menu) {
    btn.addEventListener('click', function () { setMenu(!isOpen()); });
    d.addEventListener('keydown', function (e) { if ((e.key === 'Escape' || e.key === 'Esc') && isOpen()) setMenu(false, true); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a') && isOpen()) setMenu(false); });
    var wide = window.matchMedia('(min-width: 1080px)');
    var onWide = function () { if (wide.matches && isOpen()) setMenu(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide); else if (wide.addListener) wide.addListener(onWide);
  }

  var dock = d.getElementById('dock'), hero = d.querySelector('.hero, .ph');
  var onScroll = function () {
    if (!dock || !hero) return;
    var on = window.scrollY > hero.offsetHeight - 120 && (window.innerHeight + window.scrollY) < d.body.scrollHeight - 220;
    dock.classList.toggle('on', on);
    dock.setAttribute('aria-hidden', String(!on));
    Array.prototype.forEach.call(dock.querySelectorAll('a'), function (a) { a.tabIndex = on ? 0 : -1; });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* 4. Ürün kayıtları: görünür olunca sessiz döngü; duraklat/oynat düğmesi (5 sn'den uzun hareket için zorunlu).
     Hareket azaltma açıksa kendiliğinden başlamaz; düğmeyle bir kez, döngüsüz oynar. Betik yoksa ya da video açılmazsa kapak görseli kalır. */
  var WEBM = { aile: 1, 'aile-m': 1, 'akis-d': 1, 'kutuphane-d': 1, 'rapor-d': 1 }; // webm yalnız mp4ten küçükse var (öbürleri yalnız mp4)
  // Telefon (≤ 700 px; 22 Kasım 2026, kullanıcı: "mevcut görselleri yapıyı koruyarak optimize et"): data-clip-m taşıyan kayıt telefonda
  // kendi telefon sürümünü ve afişini (.clip-poster-m) kullanır (aynı sahne dikey masaüstü çerçevesinde, ya da gerçek telefon kaydı).
  var dar = window.matchMedia('(max-width: 700px)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var ICONS = '<svg class="i-pause" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.6" height="12" rx="1"/><rect x="9.4" y="2" width="3.6" height="12" rx="1"/></svg>' +
    '<svg class="i-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.2v11.6c0 .8.9 1.3 1.6.8l8.6-5.8c.6-.4.6-1.2 0-1.6L5.6 1.4C4.9.9 4 1.4 4 2.2z"/></svg>';
  var clips = [];

  each('.clip[data-clip]', function (fig) {
    var id = fig.getAttribute('data-clip'), img = fig.querySelector('.clip-poster'), isHero = fig.hasAttribute('data-hero');
    if (!img) return;
    var posterSrc = img.getAttribute('src'), mId = fig.getAttribute('data-clip-m'), mImg = fig.querySelector('.clip-poster-m');
    if (dar && mId) { id = mId; if (mImg) { posterSrc = mImg.getAttribute('src'); img = mImg; } }
    var v = d.createElement('video');
    v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');
    v.playsInline = true; v.setAttribute('playsinline', '');
    v.loop = !reduce.matches;
    v.preload = isHero ? 'metadata' : 'none';
    v.poster = posterSrc;
    v.setAttribute('aria-hidden', 'true'); // anlatım kapak görselinin alt metninde
    v.setAttribute('disablepictureinpicture', '');
    var src = 'assets/motion/' + id, last;
    if (WEBM[id]) { last = d.createElement('source'); last.src = src + '.webm'; last.type = 'video/webm'; v.appendChild(last); }
    last = d.createElement('source'); last.src = src + '.mp4'; last.type = 'video/mp4'; v.appendChild(last);

    var b = d.createElement('button');
    b.type = 'button'; b.className = 'clip-btn'; b.innerHTML = ICONS;
    var c = { fig: fig, v: v, b: b, hero: isHero, userPaused: false, failed: false };
    var setBtn = function () {
      var playing = !v.paused && !v.ended;
      b.setAttribute('aria-label', playing ? 'Duraklat' : 'Oynat');
      b.setAttribute('data-state', playing ? 'playing' : 'paused');
    };
    var fail = function () {
      if (c.failed) return;
      c.failed = true;
      if (v.parentNode) v.parentNode.removeChild(v);
      if (b.parentNode) b.parentNode.removeChild(b);
      fig.classList.add('clip-failed');
    };
    last.addEventListener('error', fail);
    v.addEventListener('error', fail);
    v.addEventListener('play', setBtn);
    v.addEventListener('pause', setBtn);
    v.addEventListener('ended', setBtn);
    c.play = function () {
      if (c.failed) return;
      var p = v.play();
      if (p && p.catch) p.catch(function () { setBtn(); });
    };
    b.addEventListener('click', function () {
      if (v.paused || v.ended) {
        c.userPaused = false;
        v.loop = !reduce.matches;
        if (v.ended) v.currentTime = 0;
        c.play();
      } else {
        c.userPaused = true;
        v.pause();
      }
    });
    img.insertAdjacentElement('afterend', v);
    fig.appendChild(b);
    setBtn();
    clips.push(c);
  });

  var leave = function (c) {
    if (!c.v.paused) c.v.pause();
    if (!c.hero && c.v.readyState > 0) { try { c.v.currentTime = 0; } catch (e) { /* yok say */ } }
  };
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var c = en.target.__clip;
        if (!c || c.failed) return;
        if (en.isIntersecting && (c.hero || en.intersectionRatio >= 0.35)) { // açılış kaydı hemen, öteki kayıtlar %35 görününce
          if (!reduce.matches && !c.userPaused && c.v.paused) c.play();
        } else if (!en.isIntersecting) {
          leave(c);
        }
      });
    }, { threshold: [0, 0.35] });
    clips.forEach(function (c) { c.fig.__clip = c; io.observe(c.fig); });
  } else if (!reduce.matches) {
    clips.forEach(function (c) { c.play(); });
  }
  var onReduce = function () {
    clips.forEach(function (c) { c.v.loop = !reduce.matches; if (reduce.matches && !c.v.paused) c.v.pause(); });
  };
  if (reduce.addEventListener) reduce.addEventListener('change', onReduce); else if (reduce.addListener) reduce.addListener(onReduce);
  /* 5. Açılış turu (14 Kasım 2026): kayıt ilerledikçe 1-2-3 çipi yanar; çipe dokununca kayıt o adıma gider. */
  each('.clip[data-tur]', function (fig) {
    var v = fig.querySelector('video'), btns = fig.parentNode.querySelectorAll('.tur [data-t]');
    if (!btns.length) return;
    // telefon sürümünün adımları başka saniyede: data-t-m (yoksa data-t)
    var tAt = function (b) { return parseFloat((dar && fig.hasAttribute('data-clip-m') && b.getAttribute('data-t-m')) || b.getAttribute('data-t')); };
    var mark = function () {
      var t = v ? v.currentTime : 0, cur = 0;
      Array.prototype.forEach.call(btns, function (b, k) { if (t + 0.05 >= tAt(b)) cur = k; });
      Array.prototype.forEach.call(btns, function (b, k) { if (k === cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    };
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener('click', function () {
        if (!v || !fig.contains(v)) return;
        try { v.currentTime = tAt(b); } catch (e) { /* yok say */ }
        if (fig.__clip) fig.__clip.userPaused = false;
        var p = v.play(); if (p && p.catch) p.catch(function () {});
        mark();
      });
    });
    if (v) { v.addEventListener('timeupdate', mark); v.addEventListener('seeked', mark); }
    mark();
  });

  /* 6. Sekmeler: "Platform Nasıl Çalışır?" ([data-nc]). Tıklayınca, ok tuşlarıyla ve dokunmatik ekranda
     parmakla sağa sola kaydırınca değişir; kendiliğinden ilerlemez (Atlassian'ın sekme düzeni gibi). 18 Kasım 2026: kaydırma, altı sekme
     (taşarsa şerit yana kayar, seçili sekme ortaya gelir), Önceki / Sonraki düğmeleri.
     Bir sekme data-var="grup:değer" taşıyorsa ve <html data-v-grup> başka bir değerdeyse (yalnız önizlemede olur) o sekme yok sayılır. */
  var varOn = function (el) {
    var dv = el.getAttribute('data-var');
    if (!dv) return true;
    var p = dv.split(':'), cur = root.getAttribute('data-v-' + p[0]);
    return cur === null || cur === p[1];
  };
  var dokunmatik = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (dokunmatik) root.classList.add('dokun');

  // Yatay kaydırma: dikey kaydırmayı tarayıcı yapar (CSS touch-action: pan-y), yatay hareketi biz okuruz. Parmak giderken panel biraz izler.
  var kaydir = function (alan, panel, adim) {
    var x0 = 0, y0 = 0, dx = 0, acik = false, yatay = null, p = null;
    var birak = function () { if (p) { p.style.transition = ''; p.style.transform = ''; } p = null; };
    alan.addEventListener('touchstart', function (e) {
      acik = e.touches.length === 1; yatay = null; dx = 0;
      if (acik) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }
    }, { passive: true });
    alan.addEventListener('touchmove', function (e) {
      if (!acik) return;
      dx = e.touches[0].clientX - x0;
      var dy = e.touches[0].clientY - y0;
      if (yatay === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) yatay = Math.abs(dx) > Math.abs(dy) * 1.2;
      if (yatay && !reduce.matches) {
        p = p || panel();
        if (p) { p.style.transition = 'none'; p.style.transform = 'translateX(' + Math.round(dx * 0.3) + 'px)'; }
      }
    }, { passive: true });
    alan.addEventListener('touchend', function () {
      if (!acik) return;
      acik = false;
      var git = yatay && Math.abs(dx) > 44;
      birak();
      if (git) adim(dx < 0 ? 1 : -1);
    });
    alan.addEventListener('touchcancel', function () { acik = false; birak(); });
  };

  var OK_SOL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg>', OK_SAG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5L16 12l-6.5 6.5"/></svg>';
  var sekmeler = function (box, ad) {
    var hepsi = Array.prototype.slice.call(box.querySelectorAll('[role=tab]'));
    var serit = box.querySelector('[role=tablist]'), sahne = box.querySelector('[data-kay]');
    if (!hepsi.length || !serit || !sahne) return;
    var pan = function (t) { return d.getElementById(t.getAttribute('aria-controls')); };
    var canli = function () { return hepsi.filter(varOn); };
    var secili = function (L) { for (var i = 0; i < L.length; i++) if (L[i].getAttribute('aria-selected') === 'true') return i; return -1; };
    var gorunen = function () { var L = canli(), k = secili(L); return k < 0 ? null : pan(L[k]); };
    var bildi = function () { box.classList.add('bilir'); };

    // Önceki / Sonraki + noktalar: dar ekranda ve dokunmatik cihazda görünür (CSS); altındaki ipucu ilk kaydırmada solar.
    var pager = d.createElement('div'), noktalar = d.createElement('span'), once = d.createElement('button'), sonra = d.createElement('button');
    pager.className = 'pager';
    once.type = sonra.type = 'button';
    once.innerHTML = OK_SOL; sonra.innerHTML = OK_SAG;
    once.setAttribute('aria-label', 'Önceki ' + ad); sonra.setAttribute('aria-label', 'Sonraki ' + ad);
    noktalar.className = 'pg-n'; noktalar.setAttribute('aria-hidden', 'true');
    pager.appendChild(once); pager.appendChild(noktalar); pager.appendChild(sonra);
    var ipucu = d.createElement('p');
    ipucu.className = 'kay-ipucu'; ipucu.setAttribute('aria-hidden', 'true');
    ipucu.textContent = 'Parmağınızla sağa sola kaydırarak da geçebilirsiniz';
    box.appendChild(pager); box.appendChild(ipucu);

    var kenar = function () {
      var tasar = serit.scrollWidth > serit.clientWidth + 2;
      serit.classList.toggle('tasiyor', tasar);
      serit.classList.toggle('bas', serit.scrollLeft <= 4);
      serit.classList.toggle('son', serit.scrollLeft + serit.clientWidth >= serit.scrollWidth - 4);
    };
    var sec = function (k, o) {
      var L = canli(), eski = secili(L);
      if (k < 0 || k >= L.length) return;
      hepsi.forEach(function (t) {
        var on = t === L[k], p = pan(t);
        t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
        if (!p) return;
        if (on && eski >= 0 && eski !== k) p.setAttribute('data-yon', k < eski ? 'geri' : 'ileri'); else if (on && !(o && o.sessiz)) p.removeAttribute('data-yon');
        p.hidden = !on;
      });
      if (o && o.odak) L[k].focus();
      // Seçili sekme şeridin ortasına: sayfayı oynatmadan yalnız şerit kayar.
      if (serit.scrollWidth > serit.clientWidth + 2) {
        var sol = L[k].offsetLeft - (serit.clientWidth - L[k].offsetWidth) / 2;
        if (serit.scrollTo) serit.scrollTo({ left: sol, behavior: reduce.matches || (o && o.sessiz) ? 'auto' : 'smooth' }); else serit.scrollLeft = sol;
      }
      Array.prototype.forEach.call(noktalar.children, function (n, j) { n.className = j === k ? 'on' : ''; });
      once.disabled = k === 0; sonra.disabled = k === L.length - 1;
    };
    var adim = function (yon) { var L = canli(), k = secili(L) + yon; if (k >= 0 && k < L.length) sec(k); bildi(); };

    // Yükseklik sabit: en uzun panel kadar yer ayrılır, sekme değişince altındaki bölümler zıplamaz. Yalnız genişlik değişince yeniden
    // ölçülür (iPhone'da adres çubuğu küçülünce panel yeniden belirip kaybolmasın); görünen panelin girişi yeniden oynatılmaz.
    var sonW = -1;
    var olc = function (zorla) {
      var w = box.clientWidth;
      if (!w || (zorla !== true && w === sonW)) return;   // w 0: kutu gizli (önizlemede başka alternatif açık)
      sonW = w;
      var P = canli().map(pan), max = 0;
      hepsi.forEach(function (t) { var p = pan(t); if (p) p.style.minHeight = ''; });
      P.forEach(function (p) {
        var gizli = p.hidden;
        if (gizli) { p.style.animation = 'none'; p.hidden = false; }
        max = Math.max(max, p.offsetHeight);
        if (gizli) { p.hidden = true; p.style.animation = ''; }
      });
      P.forEach(function (p) { p.style.minHeight = max + 'px'; });
      kenar();
    };
    // Sekme listesi değişince (önizlemede alternatif seçimi) numaralar, noktalar ve seçim yeniden kurulur. Sekmeler sayfadaki
    // sıralarıyla yeniden okunur (önizlemede bir sekme yer değiştirebilir); seçili sekme yerini değiştirse de seçili kalır.
    var esitle = function (ilk) {
      hepsi = Array.prototype.slice.call(box.querySelectorAll('[role=tab]'));
      var L = canli();
      hepsi.forEach(function (t) {
        var var_ = L.indexOf(t) >= 0, p = pan(t);
        t.hidden = !var_;
        if (!var_) { t.setAttribute('aria-selected', 'false'); t.tabIndex = -1; if (p) p.hidden = true; }
      });
      L.forEach(function (t, i) { var b = t.querySelector('b'); if (b && /^\d+$/.test(b.textContent)) b.textContent = String(i + 1); });
      noktalar.innerHTML = new Array(L.length + 1).join('<i></i>');
      sec(ilk === true ? Math.max(0, secili(L)) : Math.max(0, secili(L)), { sessiz: true });
      olc(true);
    };

    hepsi.forEach(function (t) {
      t.addEventListener('click', function () { sec(canli().indexOf(t)); bildi(); });
      t.addEventListener('keydown', function (e) {
        var L = canli(), n = L.length, k = L.indexOf(t), j = k;
        if (e.key === 'ArrowRight') j = (k + 1) % n; else if (e.key === 'ArrowLeft') j = (k - 1 + n) % n; else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = n - 1; else return;
        e.preventDefault(); sec(j, { odak: true });
      });
    });
    once.addEventListener('click', function () { adim(-1); });
    sonra.addEventListener('click', function () { adim(1); });
    kaydir(sahne, gorunen, adim);
    serit.addEventListener('scroll', kenar, { passive: true });
    window.addEventListener('resize', olc);
    window.addEventListener('load', function () { olc(true); });

    // İlk kez ekrana gelince (yalnız dokunmatik cihazda, hareket azaltma kapalıysa) panel bir kez hafifçe sola oynar: "kaydırılabilir" işareti.
    if (dokunmatik && 'IntersectionObserver' in window) {
      var gor = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!en.isIntersecting || en.intersectionRatio < 0.5) return;
          gor.disconnect();
          var p = gorunen();
          if (p && !reduce.matches && !box.classList.contains('bilir')) { p.removeAttribute('data-yon'); p.classList.add('durt'); p.addEventListener('animationend', function () { p.classList.remove('durt'); }, { once: true }); }
        });
      }, { threshold: 0.5 });
      gor.observe(sahne);
    }
    esitle(true);
  };
  each('[data-nc]', function (box) { sekmeler(box, 'adım'); });

  /* 7. "Kimler için" kayan şerit ([data-ks], kullanıcı kararı 19 Kasım 2026, tur 3: üç sıra, Duraklat düğmesi yok). Sıralar ters yönlere
     yavaşça kayar (CSS .akar). Kesintisiz döngü için her sıranın listesi şeridi dolduracak kadar çoğaltılır (kopyalar aria-hidden; ekran
     okuyucu her mesleği bir kez okur), kayma hızı genişliğe göre ayarlanır (--ks-w, --ks-s). Üstüne gelince ve odaklanınca CSS durdurur;
     dokununca (bırakınca 1,5 sn daha) ve ekran dışındayken burada durur. Hareket azaltmada .akar eklenmez: çipler sarılarak durur. */
  each('[data-ks]', function (box) {
    var siralar = Array.prototype.slice.call(box.querySelectorAll('.ks-sira')), HIZ = 30, sonW = -1, zaman = 0;   // HIZ: px / sn
    var kur = function () {
      var w0 = box.clientWidth;
      if (!w0 || w0 === sonW && box.classList.contains('akar') === !reduce.matches) return;
      sonW = w0;
      siralar.forEach(function (s) { Array.prototype.forEach.call(s.querySelectorAll('ul[aria-hidden]'), function (u) { s.removeChild(u); }); });
      box.classList.toggle('akar', !reduce.matches);
      if (reduce.matches) return;
      siralar.forEach(function (s) {
        var ilk = s.querySelector('ul'), w = ilk.getBoundingClientRect().width;
        if (!w) return;
        for (var i = 0, n = Math.ceil(box.clientWidth / w) + 1; i < n; i++) { var k = ilk.cloneNode(true); k.setAttribute('aria-hidden', 'true'); s.appendChild(k); }
        s.style.setProperty('--ks-w', w.toFixed(1) + 'px');
        s.style.setProperty('--ks-s', (w / HIZ).toFixed(1) + 's');
      });
    };
    box.addEventListener('touchstart', function () { clearTimeout(zaman); box.classList.add('tut'); }, { passive: true });
    box.addEventListener('touchend', function () { zaman = setTimeout(function () { box.classList.remove('tut'); }, 1500); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { box.classList.toggle('uzak', !es[0].isIntersecting); }).observe(box);
    }
    var bekle = 0;
    window.addEventListener('resize', function () { clearTimeout(bekle); bekle = setTimeout(kur, 150); });
    if (reduce.addEventListener) reduce.addEventListener('change', function () { sonW = -1; kur(); });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { sonW = -1; kur(); });
    kur();
  });

  /* 8. Pano: renkli başlıklar ([data-pn], 19 Kasım 2026, tur 4): görünür olunca başlık bantları soldan sağa çizilir, kartların sol
     çizgileri sırayla uzar (CSS .bekle). Hareket azaltmada, eski tarayıcıda ve betik yoksa .bekle hiç eklenmez: her şey baştan yerinde durur. */
  if ('IntersectionObserver' in window && !reduce.matches) {
    each('[data-pn]', function (fig) {
      fig.classList.add('bekle');
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        requestAnimationFrame(function () { fig.classList.remove('bekle'); });
      }, { threshold: 0.35 });
      io.observe(fig);
    });
  }

})();
