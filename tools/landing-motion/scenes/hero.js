// Ürün tek çekimde: pano → Nazlı → etkin eğitim (Özet) → Öğrenme modülleri → Uygulama görevleri ve ebeveynin kayıtları.
const { T, tab, card } = require('./_common');

module.exports = {
  id: 'hero',
  title_tr: 'Panodan ebeveyn eğitimine: modüller, görevler, ebeveynin kayıtları',
  device: 'desktop',
  data: { more: true },
  maxBytes: 3e6,
  seed: 5,
  async prepare(h) {
    await h.park(1180, 470);
  },
  async run(h, s) {
    const p = s.page;
    await h.sleep(600);
    h.beat('Ana ekran');
    await h.scrollTo(p.getByText(/^Danışanlar \(/), 22, { ms: 900, after: 650, beat: 'Danışan panosu: Senin sıran, Ebeveynden yeni, Sessiz kalanlar' });
    await h.click(p.getByText('Nazlı', { exact: true }), { beat: 'Nazlı\'ya dokun', after: 1450 });
    h.beat('Danışan sayfası Ebeveyn Eğitimi\'yle açılır');
    await h.click(card(p, T), { fx: 0.3, beat: 'Etkin eğitimi aç', after: 1500, poster: true });
    await h.click(tab(p, 'Öğrenme modülleri'), { beat: 'Öğrenme modülleri', after: 1400 });
    await h.click(tab(p, 'Uygulama görevleri'), { beat: 'Uygulama görevleri', after: 1000 });
    await h.click('Zorlayıcı davranışı ABC ile kaydet', { beat: 'Ebeveynin uygulama kayıtları (tablo)', after: 1450 });
    await h.click(p.locator('[aria-label="Grafik"]').filter({ visible: true }).first(), { beat: 'Aynı kayıtlar grafikte', after: 1300 });
  },
};
