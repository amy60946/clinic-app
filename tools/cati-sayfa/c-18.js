// Çatı sayfa, 18 Kasım 2026 turu: küçük ortak yardımcılar. eko.js ve kompakt.js'ten ÖNCE yüklenir.
// 1) moyoKaydir(el, o): parmakla (fareyle de) sola / sağa kaydırma. Öğe CSS'te touch-action: pan-y taşır; dikey hareket sayfanın
//    kendi kaydırmasıdır (tarayıcı pointercancel yollar, adım değişmez). Yatay hareket 8 pikseli geçince kilitlenir:
//    o.surukle(dx) parmağı izler, o.bitir(dx) bırakınca çağrılır (eşik çağıranda: 40 piksel), o.iptal() vazgeçince.
// 2) 1-2-3 kartlarının "Büyük rakamlı" tasarımı telefonda yana kayar: alttaki noktalar ortadaki kartı gösterir.
(function () {
  window.moyoKaydir = function (el, o) {
    var id = null, x0 = 0, y0 = 0, kilit = false, dx = 0, yut = false;
    function birak() { id = null; kilit = false; el.classList.remove('surukleniyor'); }
    el.addEventListener('pointerdown', function (e) {
      if (id !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (o.etkin && !o.etkin()) return;
      if (e.target.closest && e.target.closest('button')) return;          // ok düğmeleri kendi işini yapar
      id = e.pointerId; x0 = e.clientX; y0 = e.clientY; kilit = false; dx = 0;
    });
    el.addEventListener('pointermove', function (e) {
      if (e.pointerId !== id) return;
      var ax = e.clientX - x0, ay = e.clientY - y0;
      if (!kilit) {
        if (Math.abs(ax) < 8 && Math.abs(ay) < 8) return;
        if (Math.abs(ax) < Math.abs(ay) * 1.2) { id = null; return; }      // dikey: sayfa kayar, adım değişmez
        kilit = true; el.classList.add('surukleniyor');
        try { el.setPointerCapture(id); } catch (err) {}
      }
      dx = ax; if (o.surukle) o.surukle(dx);
    });
    function bitir(e) {
      if (e.pointerId !== id) return;
      var k = kilit, d = dx; birak(); if (!k) return;
      if (e.type === 'pointercancel') { if (o.iptal) o.iptal(); return; }
      if (Math.abs(d) > 8) { yut = true; setTimeout(function () { yut = false; }, 60); }   // sürükleme tıklamaya dönüşmesin
      o.bitir(d);
    }
    el.addEventListener('pointerup', bitir);
    el.addEventListener('pointercancel', bitir);
    el.addEventListener('click', function (e) { if (yut) { yut = false; e.preventDefault(); e.stopPropagation(); } }, true);
    el.addEventListener('dragstart', function (e) { e.preventDefault(); });   // fareyle görsel sürüklenmesin
  };

  var uc = document.querySelector('.uc'), nokta = [].slice.call(document.querySelectorAll('.uc-nokta i'));
  if (uc && nokta.length) {
    var kart = [].slice.call(uc.children), bekle = false;
    var isaretle = function () {
      bekle = false;
      var c = uc.scrollLeft + uc.clientWidth / 2, en = 0, uzak = 1e9;
      kart.forEach(function (k, j) { var d = Math.abs(k.offsetLeft + k.offsetWidth / 2 - c); if (d < uzak) { uzak = d; en = j; } });
      nokta.forEach(function (n, j) { n.classList.toggle('on', j === en); });
    };
    uc.addEventListener('scroll', function () { if (!bekle) { bekle = true; requestAnimationFrame(isaretle); } }, { passive: true });
    // yana kayarken klavyeyle de gezilsin (← →): yalnız bu tasarımda ve dar ekranda odaklanabilir
    var dar = matchMedia('(max-width: 719px)');
    var odak = function () {
      if (document.documentElement.getAttribute('data-v-uc') === 'c' && dar.matches) { uc.tabIndex = 0; uc.setAttribute('aria-label', 'Üç adım, yana kaydırın'); }
      else { uc.removeAttribute('tabindex'); uc.removeAttribute('aria-label'); }
    };
    dar.addEventListener('change', odak); odak();
    addEventListener('oniz', function (e) { if (e.detail && e.detail.k === 'uc') { uc.scrollLeft = 0; isaretle(); odak(); } });
  }
})();
