// Ailenin gördüğü: eğitim ayarları → "Ebeveyn deneyimini önizle" → telefon çerçevesinde dersler → test → yanıt → kontrol.
// (Okuma modülü 3–4 sayfa ve test 3 soru olduğu için klip tek sorunun sonucunda biter; README.)
const { T, card, openClient, openTraining } = require('./_common');

module.exports = {
  id: 'aile',
  title_tr: 'Ebeveynin telefonda gördüğü: dersler ve test',
  device: 'desktop',
  seed: 31,
  async prepare(h, s) {
    await openClient(s.page);
    await openTraining(s.page);
    await h.park(1130, 330);
  },
  async run(h, s) {
    const p = s.page;
    await h.sleep(350);
    await h.click(p.locator('[aria-label="Eğitim ayarları"]').filter({ visible: true }), { beat: 'Eğitim ayarları', dwell: 380, after: 900 });
    await h.click('Ebeveyn deneyimini önizle', { last: true, beat: 'Ebeveyn deneyimini önizle', dwell: 380, after: 1400 });
    await h.click(card(p, T).last(), { fx: 0.4, beat: 'Telefonda: Derslere devam et', dwell: 400, after: 1250, poster: true });
    await h.click('ABC modelini anlamak: Test', { last: true, beat: 'Ders listesinden testi aç', dwell: 380, after: 1000 });
    await h.click('Başla', { last: true, beat: 'Teste başla', dwell: 360, after: 1050 });
    await h.click('Davranıştan hemen önce olan durumu ya da olayı', { fx: 0.35, beat: 'Yanıtı seç', dwell: 400, after: 900 });
    await h.click('Cevabı kontrol et', { last: true, beat: 'Cevabı kontrol et: Doğru', dwell: 380, after: 1000 });
  },
};
