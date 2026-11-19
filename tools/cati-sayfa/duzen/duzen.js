// Düzen ayarı (17 Kasım 2026): çatı sayfanın yazı ve görsellerini sürükleyerek aralarını açma aracı.
// Aralık aç  : öğeyi aşağı / yukarı çekince ÜSTÜNDEKİ boşluk değişir (margin-top), altındakiler de kayar.
// Serbest taşı: yalnız o öğe kayar (CSS translate; öğenin kendi transform'una dokunmaz).
// Kayıt: Artifact veritabanı "duzen/cati-<masa|tablet|tel>" (Claude buradan okur) + tarayıcı deposu (yedek).
(function () {
  var SAYFA = 'cati', DEPO = 'moyo.duzen.v1.' + SAYFA, ADIM = 4;
  var OGELER = [
    ['acilis_baslik', '#acilis h1', 'Ana başlık'],
    ['acilis_etiket', '#acilis .alt-etiket', '"Moyo Ekosistemi" etiketi'],
    ['acilis_cumle', '#acilis .alt', 'Başlık altı cümle'],
    ['acilis_dugmeler', '#acilis .dugmeler', 'Açılış düğmeleri'],
    ['acilis_ince', '#acilis .ince', '"14 gün ücretsiz" satırı'],
    ['eko_ekranlar', '#hepsi .d-halka-kap', 'Ekosistem: ekranlar'],
    ['eko_yazi', '#hepsi .d-yazilar', 'Ekosistem: yazı'],
    ['eko_sayac', '#hepsi .d-nokta', 'Ekosistem: 1–6 sayacı'],
    ['eko_kart_gorsel', '#hepsi .d-kart .d-gorsel', 'Ekosistem kartı: ekran'],
    ['eko_kart_yazi', '#hepsi .d-kart .d-yazi', 'Ekosistem kartı: yazı'],
    ['eko_sayac_dar', '#hepsi .d-nokta-m', 'Ekosistem: 1–6 sayacı'],
    ['giris_etiket', '#giris .ust-etiket', 'Giriş bandı: etiket'],
    ['giris_baslik', '#giris h2', 'Giriş bandı: başlık'],
    ['giris_metin', '#giris .ic > p:not(.ust-etiket)', 'Giriş bandı: metin'],
    ['giris_basamak', '#giris .basamak', 'Giriş bandı: basamaklar'],
    ['nasil_urun', '#nasil .hk-yazi > .rol', 'Nasıl çalışır: ürün adı'],
    ['nasil_baslik', '#nasil .hk-yazi > h2', 'Nasıl çalışır: başlık'],
    ['nasil_metin', '#nasil .hk-yazi > p', 'Nasıl çalışır: metin'],
    ['nasil_liste', '#nasil .hk-yazi > .adim-liste', 'Nasıl çalışır: 1-2-3 listesi'],
    ['nasil_ekran', '#nasil .hk-kartlar', 'Nasıl çalışır: ekran'],
    ['nasil_sayac', '#nasil .hk-nokta', 'Nasıl çalışır: 1–3 sayacı'],
    ['nasilk_sayac', '#nasil-k .nk-sekmeler', 'Nasıl çalışır: 1–3 sayacı'],
    ['nasilk_ekran', '#nasil-k .nk-gorsel', 'Nasıl çalışır: ekran'],
    ['nasilk_urun', '#nasil-k .nk-yazi > .rol', 'Nasıl çalışır: ürün adı'],
    ['nasilk_baslik', '#nasil-k .nk-yazi > h3', 'Nasıl çalışır: başlık'],
    ['nasilk_metin', '#nasil-k .nk-yazi > p', 'Nasıl çalışır: metin'],
    ['urunler_baslik', '#sonraki .bas', 'Ürünler: başlık'],
    ['urunler_kartlar', '#sonraki .kartlar3', 'Ürünler: kartlar'],
    ['guven_baslik', '#guven .bas', 'Güven: başlık'],
    ['guven_kartlar', '#guven .kartlar4', 'Güven: kartlar'],
    ['sss_baslik', '#sss .bas', 'Sorular: başlık'],
    ['sss_liste', '#sss .sss', 'Sorular: liste'],
    ['alt_kutu', '.altb-kutu', 'Alt bilgi: kutu'],
    ['alt_satir', '.altb-alt', 'Alt bilgi: telif satırı']
  ];
  var BOLUMLER = [
    ['bolum_ekosistem', '#hepsi', 'Moyo Ekosistemi'], ['bolum_giris', '#giris', 'Giriş bandı'], ['bolum_nasil', '#nasil', 'Nasıl çalışır'], ['bolum_nasil_dar', '#nasil-k', 'Nasıl çalışır'],
    ['bolum_urunler', '#sonraki', 'Ürünler'], ['bolum_guven', '#guven', 'Güven'], ['bolum_sss', '#sss', 'Sorular'], ['bolum_alt', 'footer.altb', 'Alt bilgi']
  ];
  var AD = {}, SEC = {}, els = {}, temel = new WeakMap();
  var tum = { masa: {}, tablet: {}, tel: {} }, gecmis = [], mod = 'aralik', acik = true, secili = null, sur = null, bastir = false, db = null, dbOkundu = {}, dokundu = false;
  function gorunum() { return innerWidth > 1024 ? 'masa' : innerWidth > 700 ? 'tablet' : 'tel'; }
  var simdiki = gorunum();
  function durum() { return tum[simdiki]; }
  function al(k) { var d = durum()[k]; return d ? { m: d.m || 0, x: d.x || 0, y: d.y || 0 } : { m: 0, x: 0, y: 0 }; }
  function koy(k, d) { if (d.m || d.x || d.y) durum()[k] = { m: d.m, x: d.x, y: d.y }; else delete durum()[k]; uygula(k); }
  function yuvarla(v) { return Math.round(v / ADIM) * ADIM; }

  // ---------- kayıt ----------
  OGELER.concat(BOLUMLER).forEach(function (o) { AD[o[0]] = o[2]; SEC[o[0]] = o[1]; els[o[0]] = [].slice.call(document.querySelectorAll(o[1])); });
  OGELER.forEach(function (o) { els[o[0]].forEach(function (el) { el.setAttribute('data-dz', o[0]); }); });
  BOLUMLER.forEach(function (o) {
    els[o[0]].forEach(function (el) {
      el.classList.add('dz-bolumlu');
      var b = document.createElement('button'); b.type = 'button'; b.className = 'dz-bolum'; b.setAttribute('data-dz-bolum', o[0]);
      b.innerHTML = '<span aria-hidden="true">↕</span> ' + o[2] + ' <i>üstündeki boşluk</i>'; el.appendChild(b);
    });
  });

  function uygula(k) {
    var d = al(k);
    (els[k] || []).forEach(function (el) {
      if (!temel.has(el)) { el.style.marginTop = ''; temel.set(el, parseFloat(getComputedStyle(el).marginTop) || 0); }
      el.style.marginTop = d.m ? (temel.get(el) + d.m) + 'px' : '';
      el.style.translate = (d.x || d.y) ? d.x + 'px ' + d.y + 'px' : '';
      el.classList.toggle('dz-degisti', !!(d.m || d.x || d.y));
    });
    var b = document.querySelector('[data-dz-bolum="' + k + '"]'); if (b) b.classList.toggle('dz-degisti', !!d.m);
  }
  function hepsiniUygula() { temel = new WeakMap(); Object.keys(els).forEach(function (k) { (els[k] || []).forEach(function (el) { el.style.marginTop = ''; el.style.translate = ''; }); }); Object.keys(els).forEach(uygula); }

  // ---------- araç çubuğu ----------
  var arac = document.createElement('div'); arac.className = 'dz-arac'; arac.setAttribute('role', 'region'); arac.setAttribute('aria-label', 'Düzen ayarı');
  arac.innerHTML =
    '<div class="dz-ust"><strong>Düzen ayarı</strong><span class="dz-kayit" id="dz-kayit" aria-live="polite"></span><button type="button" id="dz-kucult" aria-expanded="true" aria-label="Paneli küçült">–</button></div>' +
    '<div class="dz-govde">' +
      '<div class="dz-mod" role="group" aria-label="Sürükleme biçimi"><button type="button" id="dz-m-aralik" aria-pressed="true">Aralık aç</button><button type="button" id="dz-m-serbest" aria-pressed="false">Serbest taşı</button></div>' +
      '<p class="dz-ipucu" id="dz-ipucu"></p>' +
      '<div class="dz-secim" id="dz-secim" hidden><p><b id="dz-ad"></b><span id="dz-deger"></span></p>' +
        '<div class="dz-ok"><button type="button" data-ok="0,-1" aria-label="Yukarı">↑</button><button type="button" data-ok="0,1" aria-label="Aşağı">↓</button><button type="button" data-ok="-1,0" aria-label="Sola">←</button><button type="button" data-ok="1,0" aria-label="Sağa">→</button><button type="button" id="dz-oge-sifirla">Bu öğeyi sıfırla</button></div></div>' +
      '<div class="dz-alt"><button type="button" id="dz-geri" disabled>Geri al</button><button type="button" id="dz-gizle" aria-pressed="false">Çizgileri gizle</button><button type="button" id="dz-sifirla">Hepsini sıfırla</button><button type="button" id="dz-kopyala">Ayarları kopyala</button></div>' +
      '<textarea id="dz-metin" class="dz-metin" readonly hidden aria-label="Ayarların metni"></textarea>' +
      '<p class="dz-not" id="dz-not"></p>' +
    '</div>';
  document.body.appendChild(arac);
  var rozet = document.createElement('div'); rozet.className = 'dz-rozet'; rozet.hidden = true; document.body.appendChild(rozet);
  var $ = function (id) { return document.getElementById(id); };
  document.documentElement.classList.add('dz-acik');

  function sayi(v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + ' px'; }
  function deger(k) { var d = al(k), p = []; if (d.m) p.push('üst boşluk ' + sayi(d.m)); if (d.y) p.push('dikey ' + sayi(d.y)); if (d.x) p.push('yatay ' + sayi(d.x)); return p.length ? p.join(' · ') : 'değişmedi'; }
  function adet() { return Object.keys(durum()).length; }
  function ciz() {
    $('dz-m-aralik').setAttribute('aria-pressed', String(mod === 'aralik')); $('dz-m-serbest').setAttribute('aria-pressed', String(mod === 'serbest'));
    $('dz-ipucu').textContent = mod === 'aralik' ? 'Bir yazıyı ya da görseli tutup aşağı çekin: üstünde boşluk açılır, altındakiler de kayar. Bölümler için kenardaki ↕ etiketini çekin.' : 'Tuttuğunuz öğe tek başına, her yöne kayar; çevresindekiler yerinde kalır.';
    $('dz-secim').hidden = !secili;
    if (secili) { $('dz-ad').textContent = AD[secili]; $('dz-deger').textContent = ' · ' + deger(secili); }
    var yatay = secili && mod === 'serbest' && secili.indexOf('bolum_') !== 0;
    [].forEach.call(arac.querySelectorAll('[data-ok]'), function (b) { b.hidden = b.getAttribute('data-ok').charAt(0) !== '0' && !yatay; });
    $('dz-geri').disabled = !gecmis.length;
    var n = adet(), g = { masa: 'geniş ekran', tablet: 'tablet', tel: 'telefon' }[simdiki];
    $('dz-not').textContent = (n ? n + ' öğe değişti' : 'Henüz değişiklik yok') + ' (' + g + ' görünümü). Bitince sohbete "düzeni ayarladım" yazmanız yeter.';
    [].forEach.call(document.querySelectorAll('.dz-secili'), function (e) { e.classList.remove('dz-secili'); });
    if (secili) { (els[secili] || []).forEach(function (e) { e.classList.add('dz-secili'); }); var b = document.querySelector('[data-dz-bolum="' + secili + '"]'); if (b) b.classList.add('dz-secili'); }
  }
  function sec(k) { secili = k; ciz(); }
  function kayitYaz(t, hata) { var e = $('dz-kayit'); e.textContent = t; e.classList.toggle('hata', !!hata); }

  // ---------- saklama ----------
  function yerelOku() { try { var j = JSON.parse(localStorage.getItem(DEPO) || 'null'); if (j && j.masa) tum = { masa: j.masa || {}, tablet: j.tablet || {}, tel: j.tel || {} }; } catch (e) {} }
  function yerelYaz() { try { localStorage.setItem(DEPO, JSON.stringify(tum)); } catch (e) {} }
  function paket(g) {
    var o = {}; Object.keys(tum[g]).forEach(function (k) { var d = tum[g][k]; o[k] = { ad: AD[k] || k, secici: SEC[k] || '', ust_bosluk: d.m || 0, yatay: d.x || 0, dikey: d.y || 0 }; });
    return { sayfa: SAYFA, gorunum: g, genislik: innerWidth, yukseklik: innerHeight, guncel: new Date().toISOString(), adet: Object.keys(o).length, ogeler: o };
  }
  var sira = Promise.resolve(), bekle = null;
  function kaydet() {
    dokundu = true; yerelYaz();
    if (!db) { kayitYaz('Bu tarayıcıda saklandı'); return; }
    kayitYaz('Kaydediliyor…'); clearTimeout(bekle);
    var g = simdiki;
    bekle = setTimeout(function () {
      var veri = paket(g);
      sira = sira.then(function () { return db.doc('duzen/' + SAYFA + '-' + g).set(veri); }).then(function () { kayitYaz('Kaydedildi'); }, function () { kayitYaz('Kaydedilemedi: "Ayarları kopyala" ile gönderin', true); });
    }, 700);
  }
  function dbOku(g) {
    if (!db || dbOkundu[g]) return; dbOkundu[g] = true;
    db.doc('duzen/' + SAYFA + '-' + g).get().then(function (s) {
      if (!s.exists || dokundu) { kayitYaz(dokundu ? '' : 'Hazır'); return; }
      var v = s.data() || {}, o = v.ogeler || {}, yeni = {};
      Object.keys(o).forEach(function (k) { if (els[k]) yeni[k] = { m: +o[k].ust_bosluk || 0, x: +o[k].yatay || 0, y: +o[k].dikey || 0 }; });
      tum[g] = yeni; yerelYaz(); if (g === simdiki) { hepsiniUygula(); ciz(); } kayitYaz('Kayıtlı düzen yüklendi');
    }, function () { kayitYaz('Kayıt okunamadı; bu tarayıcıdaki düzen gösteriliyor', true); });
  }

  // ---------- sürükleme ----------
  function mutlakMi(k) { var e = (els[k] || [])[0]; if (!e) return false; var p = getComputedStyle(e).position; return p === 'absolute' || p === 'fixed'; }
  document.addEventListener('pointerdown', function (e) {
    if (!acik || e.button || e.target.closest('.dz-arac')) return;
    var h = e.target.closest('.dz-bolum'), el = h ? null : e.target.closest('[data-dz]'), k = h ? h.getAttribute('data-dz-bolum') : el && el.getAttribute('data-dz');
    if (!k) { if (secili) sec(null); return; }
    if (e.pointerType !== 'mouse' && secili !== k) { sec(k); return; }      // dokunmatik: önce seç, sonra sürükle (sayfa kaydırması bozulmasın)
    sec(k);
    sur = { k: k, x0: e.clientX, y0: e.clientY, s0: scrollY, d0: al(k), tasindi: false, bolum: !!h, serbest: !h && (mod === 'serbest' || mutlakMi(k)) };
    if (e.pointerType === 'mouse') e.preventDefault();
  }, true);
  document.addEventListener('pointermove', function (e) {
    if (!sur) return;
    var dx = e.clientX - sur.x0, dy = e.clientY - sur.y0 + (scrollY - sur.s0);
    if (!sur.tasindi) { if (Math.abs(dx) + Math.abs(dy) < 5) return; sur.tasindi = true; document.documentElement.classList.add('dz-surukle'); }
    var d = { m: sur.d0.m, x: sur.d0.x, y: sur.d0.y };
    if (sur.serbest) { d.y = yuvarla(sur.d0.y + dy); if (mod === 'serbest') d.x = yuvarla(sur.d0.x + dx); } else d.m = yuvarla(sur.d0.m + dy);
    koy(sur.k, d);
    rozet.hidden = false; rozet.textContent = AD[sur.k] + ' · ' + deger(sur.k); rozet.style.left = Math.min(innerWidth - 260, e.clientX + 16) + 'px'; rozet.style.top = Math.max(8, e.clientY - 38) + 'px';
    $('dz-deger').textContent = ' · ' + deger(sur.k);
    e.preventDefault();
  }, { passive: false });
  function birak(iptal) {
    if (!sur) return; var s = sur; sur = null; rozet.hidden = true; document.documentElement.classList.remove('dz-surukle');
    if (!s.tasindi) return;
    if (iptal) { koy(s.k, s.d0); ciz(); return; }
    bastir = true; setTimeout(function () { bastir = false; }, 60);
    gecmis.push({ g: simdiki, k: s.k, d: s.d0 }); kaydet(); ciz();
  }
  document.addEventListener('pointerup', function () { birak(false); });
  document.addEventListener('pointercancel', function () { birak(true); });
  document.addEventListener('dragstart', function (e) { if (acik) e.preventDefault(); });
  document.addEventListener('click', function (e) {
    if (e.target.closest('.dz-arac')) return;
    if (bastir) { e.preventDefault(); e.stopPropagation(); bastir = false; return; }
    if (!acik) return;
    if (e.target.closest('.dz-bolum')) { e.preventDefault(); e.stopPropagation(); return; }
    var a = e.target.closest('a[href]'); if (a && !a.closest('.sayac')) e.preventDefault();     // düzenlerken bağlantılar sayfadan çıkarmasın; sayaç hapları çalışır
  }, true);

  function it(dx, dy) {
    if (!secili) return; var d0 = al(secili), d = { m: d0.m, x: d0.x, y: d0.y }, bolum = secili.indexOf('bolum_') === 0;
    if (!bolum && (mod === 'serbest' || mutlakMi(secili))) { d.y += dy * ADIM; if (mod === 'serbest') d.x += dx * ADIM; } else d.m += dy * ADIM;
    if (d.m === d0.m && d.x === d0.x && d.y === d0.y) return;
    gecmis.push({ g: simdiki, k: secili, d: d0 }); koy(secili, d); kaydet(); ciz();
  }
  document.addEventListener('keydown', function (e) {
    if (!acik || !secili || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    var y = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key]; if (!y) { if (e.key === 'Escape') sec(null); return; }
    e.preventDefault(); var c = e.shiftKey ? 4 : 1; it(y[0] * c, y[1] * c);
  });

  // ---------- düğmeler ----------
  arac.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.id === 'dz-m-aralik') { mod = 'aralik'; ciz(); }
    else if (b.id === 'dz-m-serbest') { mod = 'serbest'; ciz(); }
    else if (b.hasAttribute('data-ok')) { var p = b.getAttribute('data-ok').split(','); it(+p[0], +p[1]); }
    else if (b.id === 'dz-oge-sifirla') { if (secili && durum()[secili]) { gecmis.push({ g: simdiki, k: secili, d: al(secili) }); koy(secili, { m: 0, x: 0, y: 0 }); kaydet(); ciz(); } }
    else if (b.id === 'dz-geri') { var s = gecmis.pop(); if (s) { if (s.tumu) { tum[s.g] = s.tumu; if (s.g === simdiki) hepsiniUygula(); } else if (s.g === simdiki) koy(s.k, s.d); else { if (s.d.m || s.d.x || s.d.y) tum[s.g][s.k] = s.d; else delete tum[s.g][s.k]; } kaydet(); ciz(); } }
    else if (b.id === 'dz-gizle') { acik = !acik; document.documentElement.classList.toggle('dz-acik', acik); b.setAttribute('aria-pressed', String(!acik)); b.textContent = acik ? 'Çizgileri gizle' : 'Çizgileri göster'; if (!acik) sec(null); }
    else if (b.id === 'dz-sifirla') {
      if (!adet()) return;
      if (b.getAttribute('data-onay') !== '1') { b.setAttribute('data-onay', '1'); b.textContent = 'Emin misiniz? Sıfırla'; setTimeout(function () { b.removeAttribute('data-onay'); b.textContent = 'Hepsini sıfırla'; }, 3500); return; }
      b.removeAttribute('data-onay'); b.textContent = 'Hepsini sıfırla';
      gecmis.push({ g: simdiki, tumu: JSON.parse(JSON.stringify(durum())) }); tum[simdiki] = {}; hepsiniUygula(); kaydet(); ciz();
    }
    else if (b.id === 'dz-kopyala') {
      var t = JSON.stringify({ masa: paket('masa'), tablet: paket('tablet'), tel: paket('tel') }, null, 1), ta = $('dz-metin');
      var goster = function () { ta.hidden = false; ta.value = t; ta.focus(); ta.select(); kayitYaz('Metni seçip kopyalayın'); };
      try { navigator.clipboard.writeText(t).then(function () { kayitYaz('Kopyalandı: sohbete yapıştırabilirsiniz'); }, goster); } catch (err) { goster(); }
    }
    else if (b.id === 'dz-kucult') { var k = arac.classList.toggle('kucuk'); b.setAttribute('aria-expanded', String(!k)); b.textContent = k ? '+' : '–'; b.setAttribute('aria-label', k ? 'Paneli aç' : 'Paneli küçült'); }
  });

  // ---------- başlat ----------
  yerelOku(); hepsiniUygula(); ciz(); kayitYaz('Bağlanıyor…');
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { var g = gorunum(); if (g !== simdiki) { simdiki = g; secili = null; dbOku(g); } hepsiniUygula(); ciz(); }, 180); });
  var c = window.claude;
  if (c && c.use) c.use('db').then(function (d) { db = d; if (!db) { kayitYaz('Bu tarayıcıda saklanıyor'); return; } dbOku(simdiki); }, function () { kayitYaz('Bu tarayıcıda saklanıyor'); });
  else kayitYaz('Bu tarayıcıda saklanıyor');
})();
