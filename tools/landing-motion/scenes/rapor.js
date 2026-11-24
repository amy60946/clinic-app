// Rapor (24 Kasım 2026'da "Aileye gönder"le yeniden kuruldu; akislar 27.2): dönemin gözlem raporu açılır, kaydırılır, rapor penceresindeki
// "Aileye gönder" ve onay; rapor ailenin Moyo Ebeveyn'ine gider, "Gönderilen raporlar"da görünür.
const { openClient } = require('./_common');

module.exports = {
  id: 'rapor',
  title_tr: 'Rapor: gözlem raporu ve aileye gönderme',
  device: 'desktop',
  seed: 53,
  async prepare(h, s) {
    await openClient(s.page);
    await h.park(640, 560);
  },
  async run(h, s) {
    const p = s.page;
    const vis = (t) => p.getByText(t, { exact: true }).filter({ visible: true });
    await h.sleep(350);
    await h.click(vis('Rapor').first(), { beat: 'Rapor', dwell: 380, after: 1100 });
    await h.click(vis('Raporu aç').first(), { beat: 'Ev rutini gözlem raporunu aç', dwell: 400, after: 1250 });
    h.poster();
    await h.scroll(470, { ms: 900, after: 800, beat: 'Rapor: haftalık rutin kartı, adım tabloları' });
    await h.click(vis('Aileye gönder'), { last: true, beat: 'Aileye gönder', dwell: 400, after: 1200 });
    await h.click(vis('Gönder'), { last: true, beat: 'Onay: rapor ailenin Moyo uygulamasına gider', dwell: 400, after: 1700 });
    const sent = vis('Gönderilen raporlar').first();
    if (await sent.count()) await h.scrollTo(sent, h.d.from ? 420 : 380, { ms: 800, after: 1500, beat: 'Gönderilen raporlar' });
  },
};
