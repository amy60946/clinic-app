// Davranışlar ve Olaylar: ABC kaydı tutulan hedef davranışın olay tablosu, sonra süre kaydı tutulan bir başkası (sütunlar değişir).
const { card, openClient } = require('./_common');

module.exports = {
  id: 'davranis',
  title_tr: 'Davranışlar ve Olaylar: ebeveynin bildirdiği olaylar',
  device: 'desktop',
  seed: 41,
  async prepare(h, s) {
    await openClient(s.page);
    await h.park(700, 600);
  },
  async run(h, s) {
    const p = s.page;
    await h.sleep(350);
    await h.click('Davranışlar ve Olaylar', { beat: 'Davranışlar ve Olaylar', after: 1200 });
    await h.click(card(p, 'Ekranı kapatırken ağlama'), { fx: 0.2, beat: 'Hedef davranışı aç: öncül, sonuç, strateji, çocuğun tepkisi', after: 1550, poster: true });
    await h.scroll(230, { ms: 800, after: 600, beat: 'Olay tablosu' });
    await h.click(card(p, 'Yatma saati direnci'), { fx: 0.2, beat: 'Süre kaydı tutulan davranış: sütunlar değişir', after: 1300 });
  },
};
