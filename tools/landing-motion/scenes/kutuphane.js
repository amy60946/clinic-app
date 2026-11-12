// Kaynak kütüphanesi: ara → kaynağı aç → "Ebeveyn eğitimi olarak ata" → danışan → eğitim → "Eğitimi kur".
const { T, card } = require('./_common');

module.exports = {
  id: 'kutuphane',
  title_tr: 'Kaynak kütüphanesi: bul, ebeveyne ata',
  device: 'desktop',
  seed: 23,
  async prepare(h) {
    await h.park(1010, 420);
  },
  async run(h, s) {
    const p = s.page;
    await h.sleep(350);
    await h.click('Kaynak kütüphanesi', { beat: 'Ana ekrandan Kaynak kütüphanesi', dwell: 380, after: 1100 });
    await h.click(p.getByPlaceholder('Kaynaklarda ara'), { fx: 0.3, dwell: 350, after: 320 });
    await h.type('pekiştir', { beat: 'Arama: "pekiştir"', after: 950 });
    await h.click(card(p, 'Pekiştirmeyi anlamak ve kullanmak'), { fx: 0.32, beat: 'Kaynağın önizlemesi', after: 1300, poster: true });
    await h.click('Ebeveyn eğitimi olarak ata', { last: true, beat: 'Ebeveyn eğitimi olarak ata', after: 1050 });
    await h.click('Nazlı', { last: true, beat: 'Danışan: Nazlı (ebeveyni Ayşe)', dwell: 380, after: 1000 });
    await h.click(T, { last: true, fx: 0.3, beat: 'Eğitimi seç', dwell: 380, after: 900 });
    await h.click('Eğitimi kur', { last: true, beat: 'Eğitimi kur: danışanın eğitimleri açılır', after: 1100 });
  },
};
