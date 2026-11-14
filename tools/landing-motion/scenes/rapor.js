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
    await h.scroll(470, { ms: 900, after: 800, beat: 'Rapor: haftalık rutin kartı, macera tabloları' });
    await h.click('Kapat', { last: true, beat: 'Raporu kapat', dwell: 380, after: 700 });
    await h.moveTo(830, 560, { ms: 700 });
    await h.scrollTo('Notu kopyala', 720, { ms: 850, after: 450, beat: 'İlerleme notu' });
    await h.click('Notu kopyala', { beat: 'Notu kopyala: "Kopyalandı"', dwell: 400, after: 600 });
  },
};
