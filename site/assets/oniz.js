// Önizleme: alternatif seçici sözleşmesi (kullanıcı isteği 18 Kasım 2026: "alternatifleri nedenleriyle sun").
// YALNIZ ÖNİZLEMEDE. disa_aktar.py bu dosyayı, #oniz-gruplar'ı ve seçilmeyen [data-var] parçalarını canlıya taşımaz.
// Sayfa <head>'de şunu taşır (bu dosyadan ÖNCE):
//   <script type="application/json" id="oniz-gruplar">[{"k":"dongu6","ad":"6. adım görseli","hedef":"#hepsi","oneri":"a",
//     "sec":[["a","Döngü çemberi"],["b","Yarım halka"],["c","Haftalık şerit"]]}]</script>
// Durum <html data-v-<k>="<değer>"> özniteliğinde durur (CSS doğrudan buna bağlanabilir). Metin ya da blok alternatifleri
// data-var="<k>:<değer>" taşır; etkin olmayanlar hidden olur. Kabuk (host.html) onizSec(k, v) çağırır; JS ile kurulan
// parçalar window 'oniz' olayını dinleyip yeniden kurulur. Adres: ?v=dongu6:b,uc:2
(function () {
  var kok = document.documentElement, G = [];
  try { G = JSON.parse((document.getElementById('oniz-gruplar') || {}).textContent || '[]'); } catch (e) {}
  function durum(k) { return kok.getAttribute('data-v-' + k) || ''; }
  function uygula() {
    [].forEach.call(document.querySelectorAll('[data-var]'), function (el) {
      var p = el.getAttribute('data-var').split(':');
      el.hidden = durum(p[0]) !== p[1];
    });
  }
  (new URLSearchParams(location.search).get('v') || '').split(',').forEach(function (s) {
    var p = s.split(':'); if (p[0] && p[1]) kok.setAttribute('data-v-' + p[0], p[1]);
  });
  G.forEach(function (g) { if (!kok.hasAttribute('data-v-' + g.k)) kok.setAttribute('data-v-' + g.k, g.oneri); });
  window.onizGruplar = G;
  window.onizDurum = durum;
  window.onizSec = function (k, v) {
    kok.setAttribute('data-v-' + k, v); uygula();
    window.dispatchEvent(new CustomEvent('oniz', { detail: { k: k, v: v } }));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', uygula); else uygula();
})();
