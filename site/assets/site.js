/* Moyo Mercek tanıtım sitesi: ortak betik (index.html, fiyat.html). Dışarıya hiçbir istek göndermez. */

/* FİYATLAR: TEK KAYNAK. Aşağıdaki değerler YER TUTUCUDUR; ürün sahibinin fiyat kararı bekleniyor (12 Kasım 2026).
   İki sayfadaki her fiyat (ana sayfadaki "aylık …'dan başlayan" cümlesi dahil) buradan yazılır. HTML'deki sabit
   değerler betiksiz okuyucu içindir ve bunlarla aynı tutulur. draft true iken fiyat sayfasında "Taslak fiyat" etiketi görünür. */
window.MERCEK_PRICES = { draft: true, solo: { m: 1199.99, y: 11999.99 }, clinic: { m: 3999.99, y: 39999.99 } };

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
    each('[data-gift]', function (el) { el.textContent = g + ' ay sizden'; el.hidden = !g; });
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

  /* 3. Üst menü: üst çubuk çizgisi, telefonda tam ekran menü */
  var head = d.getElementById('top'), btn = d.querySelector('.menu-btn'), menu = d.getElementById('menu');
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
    if (head) head.classList.toggle('scrolled', window.scrollY > 4);
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
  var WEBM = { aile: 1, pano: 1 }; // webm yalnız mp4ten küçükse var (hero, kutuphane, davranis, rapor yalnız mp4)
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var ICONS = '<svg class="i-pause" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.6" height="12" rx="1"/><rect x="9.4" y="2" width="3.6" height="12" rx="1"/></svg>' +
    '<svg class="i-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.2v11.6c0 .8.9 1.3 1.6.8l8.6-5.8c.6-.4.6-1.2 0-1.6L5.6 1.4C4.9.9 4 1.4 4 2.2z"/></svg>';
  var clips = [];

  each('.clip[data-clip]', function (fig) {
    var id = fig.getAttribute('data-clip'), img = fig.querySelector('.clip-poster'), isHero = fig.hasAttribute('data-hero');
    if (!img) return;
    var v = d.createElement('video');
    v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');
    v.playsInline = true; v.setAttribute('playsinline', '');
    v.loop = !reduce.matches;
    v.preload = isHero ? 'metadata' : 'none';
    v.poster = img.getAttribute('src');
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
    var mark = function () {
      var t = v ? v.currentTime : 0, cur = 0;
      Array.prototype.forEach.call(btns, function (b, k) { if (t + 0.05 >= parseFloat(b.getAttribute('data-t'))) cur = k; });
      Array.prototype.forEach.call(btns, function (b, k) { if (k === cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    };
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener('click', function () {
        if (!v || !fig.contains(v)) return;
        try { v.currentTime = parseFloat(b.getAttribute('data-t')); } catch (e) { /* yok say */ }
        if (fig.__clip) fig.__clip.userPaused = false;
        var p = v.play(); if (p && p.catch) p.catch(function () {});
        mark();
      });
    });
    if (v) { v.addEventListener('timeupdate', mark); v.addEventListener('seeked', mark); }
    mark();
  });

  /* 6. Sekmeli "Nasıl çalışır": tıklayınca değişir, kendiliğinden ilerlemez (Atlassian'ın sekme düzeni gibi). */
  each('[data-nc]', function (box) {
    var tabs = box.querySelectorAll('[role=tab]'), panels = box.querySelectorAll('[role=tabpanel]');
    var sel = function (k, focus) {
      Array.prototype.forEach.call(tabs, function (t, j) { var on = j === k; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      Array.prototype.forEach.call(panels, function (p, j) { p.hidden = j !== k; });
      if (focus) tabs[k].focus();
      if (tabs[k].scrollIntoView && box.querySelector('.nc-tabs').scrollWidth > box.querySelector('.nc-tabs').clientWidth) tabs[k].scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce.matches ? 'auto' : 'smooth' });
    };
    // Yükseklik sabit: en uzun panel kadar yer ayrılır, sekme değişince altındaki bölümler zıplamaz
    var wrapH = function () {
      var max = 0, cur = -1;
      Array.prototype.forEach.call(panels, function (p, j) { if (!p.hidden) cur = j; });
      Array.prototype.forEach.call(panels, function (p) { var was = p.hidden; p.hidden = false; p.style.animation = 'none'; max = Math.max(max, p.offsetHeight); p.hidden = was; p.style.animation = ''; });
      Array.prototype.forEach.call(panels, function (p) { p.style.minHeight = max + 'px'; });
    };
    wrapH(); window.addEventListener('resize', wrapH); window.addEventListener('load', wrapH);
    var track = box.querySelector('.nc-tabs');
    track.addEventListener('scroll', function () { track.classList.toggle('son', track.scrollLeft + track.clientWidth >= track.scrollWidth - 4); }, { passive: true });
    Array.prototype.forEach.call(tabs, function (t, k) {
      t.addEventListener('click', function () { sel(k); });
      t.addEventListener('keydown', function (e) {
        var n = tabs.length, j = k;
        if (e.key === 'ArrowRight') j = (k + 1) % n; else if (e.key === 'ArrowLeft') j = (k - 1 + n) % n; else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = n - 1; else return;
        e.preventDefault(); sel(j, true);
      });
    });
  });

  /* 7. Önizleme: "Neden" bölümünün düzeni adresten (?neden=1|2|3); yayında varsayılan kalır. */
  try {
    var nd = new URLSearchParams(location.search).get('neden'), dg = d.getElementById('degerler');
    if (dg && /^[123]$/.test(nd || '')) dg.setAttribute('data-neden', nd);
  } catch (e) { /* yok say */ }
})();
