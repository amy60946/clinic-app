// Dar ekranda (≤ 920 px) üst çubuktaki menü düğmesi: bağlantıya ya da dışarıya dokununca kapanır.
(function () {
  var d = document.querySelector('.dar-menu'); if (!d) return;
  d.addEventListener('click', function (e) { if (e.target.closest('nav a')) d.removeAttribute('open'); });
  document.addEventListener('click', function (e) { if (d.open && !d.contains(e.target)) d.removeAttribute('open'); });
  addEventListener('scroll', function () { if (d.open && scrollY > 40) d.removeAttribute('open'); }, { passive: true });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') d.removeAttribute('open'); });
})();
