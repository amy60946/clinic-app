// Rapor: yazdırılabilir gözlem raporu açılır, biraz kaydırılır, kapanır; ilerleme notu kopyalanır ("Kopyalandı").
const { openClient } = require('./_common');

module.exports = {
  id: 'rapor',
  title_tr: 'Rapor ve ilerleme notu',
  device: 'desktop',
  seed: 53,
  async prepare(h, s) {
    await openClient(s.page);
    await h.park(640, 560);
  },
  async run(h, s) {
    const p = s.page;
    await h.sleep(350);
    await h.click('Rapor', { beat: 'Rapor', dwell: 380, after: 1100 });
    await h.click('Raporu aç', { beat: 'Ev rutini gözlem raporunu aç', dwell: 400, after: 1250 });
    h.poster();
    await h.scroll(470, { ms: 900, after: 800, beat: 'Rapor: haftalık rutin kartı, adım tabloları' });
    await h.click('Kapat', { last: true, beat: 'Raporu kapat', dwell: 380, after: 700 });
    await h.moveTo(...h.fit(830, 560), { ms: 700 });
    // dikeyde düğme zaten görünüyorsa kaydırılmaz (danışan başlığı yarım kalmasın)
    const nb = h.d.from ? await p.getByText('Notu kopyala', { exact: true }).first().boundingBox() : null;
    if (!nb || nb.y + nb.height > h.H - 60) await h.scrollTo('Notu kopyala', h.d.from ? h.H - 160 : 720, { ms: 850, after: 450, beat: 'İlerleme notu' });
    else h.beat('İlerleme notu');
    await h.click('Notu kopyala', { beat: 'Notu kopyala: "Kopyalandı"', dwell: 400, after: 600 });
  },
};
