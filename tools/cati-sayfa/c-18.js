// Çatı sayfa, 18 Kasım 2026 turu: küçük ortak yardımcılar. eko.js'ten ÖNCE yüklenir (tur 3: kompakt.js bu sayfada yok).
// 1) moyoKaydir(el, o): parmakla (fareyle de) sola / sağa kaydırma. Öğe CSS'te touch-action: pan-y taşır; dikey hareket sayfanın
//    kendi kaydırmasıdır (tarayıcı pointercancel yollar, adım değişmez). Yatay hareket 8 pikseli geçince kilitlenir:
//    o.surukle(dx) parmağı izler, o.bitir(dx) bırakınca çağrılır (eşik çağıranda: 40 piksel), o.iptal() vazgeçince.
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
})();
